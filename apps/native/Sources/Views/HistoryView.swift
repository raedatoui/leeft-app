import SwiftUI

/// The History tab: every day in `lifting-workouts`, newest first, one `WorkoutCardView`
/// each. Tapping a card's title collapses or expands it; tapping an exercise row opens that
/// exercise's `ExerciseAnalyticsSheet`.
///
/// Horizontal pager rather than a vertical feed, the same idiom the session editor uses:
/// one workout fills the screen, swipe sideways for the next day, scroll down inside a card
/// that outgrows the screen.
struct HistoryView: View {
    @Environment(WorkoutHistoryStore.self) private var history

    /// The day key of the card currently on screen — drives the header's position readout.
    @State private var currentDay: String?

    /// Presented above the pager rather than from inside it: a sheet owned by a `LazyHStack` row
    /// goes away with the row.
    @State private var analyticsTarget: ExerciseTarget?

    private struct ExerciseTarget: Identifiable {
        let exerciseId: Int
        var id: Int { exerciseId }
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            if history.workouts.isEmpty {
                emptyState
            } else {
                pager
            }
        }
        .sessionBackground()
        // The catalog refresh is kicked off at the root; a card whose names haven't landed
        // yet falls back to "Exercise {id}" and re-renders when they do.
        .task { if !history.hasLoaded { await history.load() } }
        .sheet(item: $analyticsTarget) { target in
            // The whole collection is already in memory, so the sheet derives synchronously off
            // it and needs no fetch of its own.
            ExerciseAnalyticsSheet(exerciseId: target.exerciseId, workouts: history.workouts)
        }
    }

    /// Same chrome as `AppBar`: brand mark, a right-hand readout, bottom hairline. The
    /// readout is position-in-history — a horizontal pager gives no scrollbar to read it off.
    private var header: some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                Text("🏋️")
                Text("HISTORY")
                    .font(Typeface.display(15))
                    .tracking(0.9)
                    .foregroundStyle(Theme.maint)
            }

            Spacer(minLength: 8)

            if !history.workouts.isEmpty {
                Text(position)
                    .font(Typeface.mono(11, .semibold))
                    .tracking(0.8)
                    .foregroundStyle(Theme.muted)
                    .monospacedDigit()
            }

            // A horizontal scroll view has no pull-to-refresh to hang the reload off.
            Button {
                Task { await history.load() }
            } label: {
                Group {
                    if history.isLoading {
                        ProgressView().controlSize(.small).tint(Theme.muted)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Theme.muted)
                    }
                }
                .frame(width: 24, height: 24)
                .overlay(Circle().strokeBorder(Theme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .disabled(history.isLoading)
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }

    /// "3 / 47" — where the current card sits in the run.
    private var position: String {
        let index = currentDay.flatMap { day in history.workouts.firstIndex { $0.id == day } }
        return "\((index ?? 0) + 1) / \(history.workouts.count)"
    }

    private var pager: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 0) {
                ForEach(history.workouts) { workout in
                    ScrollView {
                        WorkoutCardView(workout: workout) { analyticsTarget = ExerciseTarget(exerciseId: $0) }
                    }
                    .scrollBounceBehavior(.basedOnSize)
                    // One card per screen; `.viewAligned` below snaps to these edges.
                    .containerRelativeFrame(.horizontal)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .scrollIndicators(.hidden)
        .scrollPosition(id: $currentDay)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()

            if history.isLoading || !history.hasLoaded {
                ProgressView().tint(Theme.muted)
            } else {
                Text(history.error ?? "No sessions logged yet")
                    .font(Typeface.body(15))
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)

                Button("Retry") { Task { await history.load() } }
                    .font(Typeface.body(15, .bold))
                    .foregroundStyle(Theme.maint)
                    .buttonStyle(.plain)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 24)
    }
}
