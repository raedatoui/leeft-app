import FirebaseCore
import Foundation

/// `FirebaseApp.configure()` raises a fatal exception when GoogleService-Info.plist is
/// missing, which would make a freshly cloned checkout crash on launch before anyone got
/// to the console step in the README. Gate on the file instead, so the app runs and says
/// what it needs.
enum FirebaseBootstrap {
    /// Configures Firebase on first access; false when the plist hasn't been added yet.
    static let isConfigured: Bool = {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            return false
        }
        FirebaseApp.configure()
        return true
    }()
}
