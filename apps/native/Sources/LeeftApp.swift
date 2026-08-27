import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct LeeftApp: App {
    @State private var auth: AuthService
    @State private var session = SessionModel()
    @State private var catalog = ExerciseCatalog()
    @State private var history = WorkoutHistoryStore()

    init() {
        // Configures Firebase when GoogleService-Info.plist is present; RootView shows
        // setup instructions when it isn't (see FirebaseBootstrap).
        _ = FirebaseBootstrap.isConfigured
        _auth = State(initialValue: AuthService())
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(session)
                .environment(catalog)
                .environment(history)
                .preferredColorScheme(.dark)
                .tint(Theme.maint)
                // Completes the Google sign-in redirect back into the app.
                .onOpenURL { GIDSignIn.sharedInstance.handle($0) }
        }
    }
}
