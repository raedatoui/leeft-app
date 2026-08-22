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
        .caretAtEndOnFocus()
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

            PhasePager()
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

/// The check-in ↔ live ↔ done pager: a plain page-style TabView, so the swipe is the
/// system's own gesture and settle with nothing custom layered on top.
///
/// A page simply doesn't exist until it's reachable — live needs the survey complete (or
/// a session already running), done needs something logged — the same gates the buttons
/// enforce, expressed as "no next page to swipe to". While an exercise editor is expanded
/// (`detailIndex`), the list page is swapped for one page per exercise, so the full swipe
/// run is check-in → each editor → done; collapsing the editor restores the list page.
///
/// Page swipes route through the same model transitions the buttons use, so a swipe has
/// exactly the side effects of the equivalent tap: forward onto live starts (or resumes)
/// the clock, forward onto done stamps the end time, back off it clears the stamp.
private struct PhasePager: View {
    @Environment(SessionModel.self) private var session

    private enum Page: Hashable {
        case pre, live, exercise(Int), done
    }

    var body: some View {
        TabView(selection: selection) {
            ReadinessView().tag(Page.pre)
            if session.canStartWorkout {
                if session.detailIndex != nil, !session.draft.exercises.isEmpty {
                    ForEach(session.draft.exercises.indices, id: \.self) { i in
                        ExerciseDetailPage(exerciseIndex: i).tag(Page.exercise(i))
                    }
                } else {
                    LiveView().tag(Page.live)
                }
                if !session.draft.exercises.isEmpty {
                    DoneView().tag(Page.done)
                }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
    }

    private var current: Page {
        switch session.draft.phase {
        case .pre: .pre
        case .live: session.detailIndex.map(Page.exercise) ?? .live
        case .done: .done
        }
    }

    private var selection: Binding<Page> {
        Binding(
            get: { current },
            set: { page in
                guard page != current else { return }
                switch page {
                case .pre:
                    session.backToReadiness()
                case .live:
                    if session.draft.phase == .done { session.backToWorkout() } else { session.startWorkout() }
                case .exercise(let i):
                    session.detailIndex = i
                    if session.draft.phase == .done { session.backToWorkout() }
                    if session.draft.phase == .pre { session.startWorkout() }
                case .done:
                    session.finishWorkout()
                }
            }
        )
    }
}
