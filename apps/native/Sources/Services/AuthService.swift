import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import Observation
import UIKit

/// Google sign-in gate, mirroring addAuthGate.tsx: nothing renders until auth state
/// resolves, signed-out visitors get a sign-in panel, and non-owner accounts are
/// force-signed-out. `firestore.rules` is what actually enforces access — this is the UX
/// in front of it.
///
/// One real upgrade over the web: Firebase persists the session in the keychain, so this
/// survives reinstalls of the app's storage instead of being evicted like Safari's.
@Observable
final class AuthService {
    /// Mirrors isOwner() in apps/web/firestore.rules.
    static let ownerEmail = "raed.atoui@gmail.com"

    private(set) var user: User?
    private(set) var isResolving = true
    private(set) var denied = false
    private(set) var error: String?

    private var listener: AuthStateDidChangeListenerHandle?

    init() {
        // Touching Auth before FirebaseApp.configure() would trap — RootView shows the
        // setup screen in this state, so there's nothing to listen for.
        guard FirebaseBootstrap.isConfigured else {
            isResolving = false
            return
        }
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self else { return }
            if let user, user.email != Self.ownerEmail {
                denied = true
                try? Auth.auth().signOut() // re-fires this listener with nil
                return
            }
            if user != nil { denied = false }
            self.user = user
            isResolving = false
        }
    }

    deinit {
        if let listener { Auth.auth().removeStateDidChangeListener(listener) }
    }

    @MainActor
    func signIn() async {
        error = nil
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            error = "Missing GoogleService-Info.plist — see apps/native/README.md"
            return
        }
        guard let presenter = Self.topViewController() else {
            error = "Could not present the sign-in screen"
            return
        }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else {
                error = "Sign-in returned no identity token"
                return
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            try await Auth.auth().signIn(with: credential)
        } catch let err as NSError where err.code == GIDSignInError.canceled.rawValue {
            // User backed out of the Google sheet — not worth surfacing.
            return
        } catch {
            self.error = "Sign-in failed — check your connection and retry"
        }
    }

    func signOut() {
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    @MainActor
    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
