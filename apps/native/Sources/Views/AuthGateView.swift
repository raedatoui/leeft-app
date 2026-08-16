import SwiftUI

/// `.auth-gate` — the signed-out panel. Rules enforce access; this is the UX in front.
struct AuthGateView: View {
    @Environment(AuthService.self) private var auth
    @State private var isSigningIn = false

    var body: some View {
        VStack(spacing: 14) {
            Text("SIGN IN")
                .font(Typeface.display(34))
                .foregroundStyle(Theme.fg)

            Text("Logging a workout requires signing in.")
                .font(Typeface.mono(11))
                .foregroundStyle(Theme.muted)

            BigButton(title: "Sign in with Google", enabled: !isSigningIn) {
                Task {
                    isSigningIn = true
                    await auth.signIn()
                    isSigningIn = false
                }
            }
            .padding(.top, 12)

            if auth.denied {
                Text("This account isn't authorized.")
                    .font(Typeface.mono(11))
                    .foregroundStyle(Theme.hyper)
            }
            if let error = auth.error {
                Text(error)
                    .font(Typeface.mono(11))
                    .foregroundStyle(Theme.hyper)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 48)
        .frame(maxWidth: 393)
        .background(Theme.surface, in: .rect(cornerRadius: 28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
