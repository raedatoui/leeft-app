import SwiftUI

/// Auth gate in front of the phase router, mirroring how /add wraps its page in AddAuthGate.
struct RootView: View {
    @Environment(AuthService.self) private var auth
    @Environment(SessionModel.self) private var session
    @Environment(ExerciseCatalog.self) private var catalog

    var body: some View {
        Group {
            if !FirebaseBootstrap.isConfigured {
                SetupNeededView()
            } else if auth.isResolving {
                // Restoring auth is a keychain read plus a token refresh — hold the dark
                // ground rather than flashing the sign-in panel.
                Color.clear
            } else if auth.user == nil {
                AuthGateView()
            } else {
                SessionFlowView()
                    .task { await catalog.refresh() }
            }
        }
        .sessionBackground()
        .overlay(alignment: .bottom) {
            if let toast = session.toast {
                ToastView(message: toast).padding(.bottom, 40)
            }
        }
        .animation(.snappy(duration: 0.22), value: session.toast)
    }
}

/// The pre → live → done router plus the persistent app bar.
struct SessionFlowView: View {
    @Environment(SessionModel.self) private var session
    @State private var showDiscardConfirm = false

    var body: some View {
        @Bindable var session = session

        VStack(spacing: 0) {
            AppBar(showDiscardConfirm: $showDiscardConfirm)

            switch session.draft.phase {
            case .pre: ReadinessView()
            case .live: LiveView()
            case .done: DoneView()
            }
        }
        .animation(.snappy(duration: 0.28), value: session.draft.phase)
        .fullScreenCover(item: $session.summary) { summary in
            SummaryView(summary: summary)
        }
        .confirmationDialog(
            "Discard this workout?",
            isPresented: $showDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button("Discard", role: .destructive) { session.discardSession() }
            Button("Keep going", role: .cancel) {}
        } message: {
            Text("Everything logged in this session will be thrown away.")
        }
    }
}
