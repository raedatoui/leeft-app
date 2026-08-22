import SwiftUI

/// The `live` phase: the session's exercise list.
///
/// The web splits this across a two-page swipe pager (list, then a finish page) because its
/// fixed 800px phone frame couldn't hold a long list and a CTA at once. A real phone scrolls,
/// so the pager is gone — the list scrolls under a pinned action bar, and exercise detail is
/// a native sheet with real interruptible drag-to-dismiss.
struct LiveView: View {
    @Environment(SessionModel.self) private var session
    @Environment(ExerciseCatalog.self) private var catalog

    @State private var showPicker = false
    @State private var pendingRemoval: Int?

    var body: some View {
        VStack(spacing: 0) {
            liveStrip

            if session.draft.exercises.isEmpty {
                emptyState
            } else {
                exerciseList
                actionBar
            }
        }
        .sheet(isPresented: $showPicker) {
            ExercisePickerSheet { metadata in
                session.addExercise(metadata)
                showPicker = false
                // Straight into the new exercise's editor, as on the web.
                session.detailIndex = session.draft.exercises.count - 1
            }
        }
        .confirmationDialog(
            "Remove this exercise?",
            isPresented: Binding(get: { pendingRemoval != nil }, set: { if !$0 { pendingRemoval = nil } }),
            titleVisibility: .visible
        ) {
            Button("Remove", role: .destructive) {
                if let index = pendingRemoval { session.removeExercise(at: index) }
                pendingRemoval = nil
            }
            Button("Cancel", role: .cancel) { pendingRemoval = nil }
        } message: {
            Text("Its logged sets go with it.")
        }
    }

    /// `.live-strip` — exercise count on the left, running volume on the right.
    private var liveStrip: some View {
        HStack {
            Text("\(session.draft.exercises.count) exercise\(session.draft.exercises.count == 1 ? "" : "s")")
                .font(Typeface.mono(10))
                .tracking(1.2)
                .foregroundStyle(Theme.muted)
                .textCase(.uppercase)

            Spacer()

            HStack(spacing: 4) {
                Text("VOL").foregroundStyle(Theme.muted)
                Text(Fmt.number(session.draft.volume)).foregroundStyle(Theme.maint)
                Text("·").foregroundStyle(Theme.muted2)
                Text("WORK").foregroundStyle(Theme.muted)
                Text(Fmt.number(session.draft.workVolume)).foregroundStyle(Theme.maint)
            }
            .font(Typeface.mono(10, .semibold))
            .tracking(0.8)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            (Text("Let's ") + Text("go").foregroundColor(Theme.maint))
                .font(Typeface.display(28))
                .textCase(.uppercase)
                .foregroundStyle(Theme.fg)

            BigButton(title: "+ Add Exercise") { showPicker = true }
            Spacer()
        }
        .padding(.horizontal, 16)
    }

    private var exerciseList: some View {
        List {
            ForEach(Array(session.draft.exercises.enumerated()), id: \.element.id) { index, exercise in
                exerciseRow(index: index, exercise: exercise)
                    .listRowBackground(Theme.bg)
                    .listRowInsets(.init(top: 16, leading: 18, bottom: 16, trailing: 18))
                    .listRowSeparatorTint(Theme.borderSoft)
                    .contentShape(.rect)
                    .onTapGesture { session.detailIndex = index }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            // Straight delete when nothing would be lost.
                            if exercise.sets.isEmpty {
                                session.removeExercise(at: index)
                            } else {
                                pendingRemoval = index
                            }
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
            }
            .onMove { session.moveExercises(from: $0, to: $1) }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .environment(\.defaultMinListRowHeight, 0)
    }

    private func exerciseRow(index: Int, exercise: DraftExercise) -> some View {
        HStack(spacing: 14) {
            ExerciseBadge(index: index, group: catalog.metadata(for: exercise.exerciseId)?.primaryMuscleGroup)

            VStack(alignment: .leading, spacing: 3) {
                Text(catalog.name(for: exercise.exerciseId) ?? exercise.name ?? "Exercise \(exercise.exerciseId)")
                    .font(Typeface.body(16, .bold))
                    .foregroundStyle(Theme.fg)
                    .lineLimit(2)

                Text(exercise.summaryText)
                    .font(Typeface.mono(12, .semibold))
                    .foregroundStyle(Theme.fg.opacity(0.8))
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.muted2)
        }
    }

    private var actionBar: some View {
        VStack(spacing: 12) {
            BigButton(title: "+ Add Exercise") { showPicker = true }
            BigButton(title: "Done Working Out", tone: .green) { session.finishWorkout() }
        }
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 8)
        .background(Theme.surface)
        .overlay(alignment: .top) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }
}
