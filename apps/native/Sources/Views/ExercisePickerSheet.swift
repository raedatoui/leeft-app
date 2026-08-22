import SwiftUI

/// Full-height exercise picker. Catalog order is alphabetical — the web's sort-by-usage
/// needs the full lifting log, which this app deliberately doesn't load.
struct ExercisePickerSheet: View {
    @Environment(SessionModel.self) private var session
    @Environment(ExerciseCatalog.self) private var catalog
    @Environment(\.dismiss) private var dismiss

    let onPick: (ExerciseMetadata) -> Void

    @State private var query = ""
    @FocusState private var searchFocused: Bool

    private var results: [ExerciseMetadata] {
        catalog.available(excluding: Set(session.draft.exercises.map(\.exerciseId)), query: query)
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            if results.isEmpty {
                emptyNote
            } else {
                List(results) { exercise in
                    Button { onPick(exercise) } label: {
                        row(exercise)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(Theme.bg)
                    .listRowInsets(.init(top: 13, leading: 18, bottom: 13, trailing: 18))
                    .listRowSeparatorTint(Theme.borderSoft)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .scrollDismissesKeyboard(.immediately)
            }
        }
        .presentationDetents([.large])
        .presentationBackground(Theme.bg)
        .task {
            // Matches the web's focus-after-transition delay so the keyboard doesn't
            // fight the sheet's presentation animation.
            try? await Task.sleep(for: .milliseconds(260))
            searchFocused = true
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Pick an exercise")
                    .font(Typeface.display(18))
                    .tracking(0.7)
                    .textCase(.uppercase)
                    .foregroundStyle(Theme.fg)

                Spacer()

                ControlCircle(symbol: "chevron.down", size: 32) { dismiss() }
            }

            TextField("Search exercises…", text: $query)
                .font(Typeface.body(16))
                .foregroundStyle(Theme.fg)
                .focused($searchFocused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(.horizontal, 14)
                .frame(height: 44)
                .background(Theme.surface2, in: .rect(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(searchFocused ? Theme.muted2 : Theme.border, lineWidth: 1)
                )
        }
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 12)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }

    private func row(_ exercise: ExerciseMetadata) -> some View {
        HStack(spacing: 10) {
            MuscleDot(group: exercise.primaryMuscleGroup, size: 10)

            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name)
                    .font(Typeface.body(14, .semibold))
                    .foregroundStyle(Theme.fg)
                Text(exercise.subtitle)
                    .tagLabel(size: 9, tracking: 0.7, color: Theme.muted)
            }

            Spacer(minLength: 0)
        }
        .contentShape(.rect)
    }

    /// An empty list before the catalog lands means "still loading", not "no match".
    private var emptyNote: some View {
        VStack {
            Spacer()
            Text(catalog.exercises.isEmpty
                ? (catalog.loadFailed ? "couldn't load exercises" : "loading exercises…")
                : "no match")
                .tagLabel(size: 11, tracking: 1.3)
            Spacer()
        }
    }
}
