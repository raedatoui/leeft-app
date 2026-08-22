import SwiftUI

/// The set editor for one exercise — a page of the phase pager while expanded, so the
/// swipe run goes check-in → each exercise → done. The collapse chevron hands the pager
/// back its list page.
///
/// Scoped down from the web's version: no PR trophies and no Last/Working-max card, both
/// of which need the full lifting history rather than just the session draft.
struct ExerciseDetailPage: View {
    @Environment(SessionModel.self) private var session
    @Environment(ExerciseCatalog.self) private var catalog

    let exerciseIndex: Int

    private enum Field: Hashable {
        case reps(Int), weight(Int)
    }

    @FocusState private var focused: Field?

    /// Column geometry shared by the header, set rows, and the fill-down chip so all
    /// three line up — the web gets this from one grid-template-columns declaration.
    private let numColumn: CGFloat = 34
    private let checkColumn: CGFloat = 44
    private let gutter: CGFloat = 10

    private var exercise: DraftExercise? {
        session.draft.exercises.indices.contains(exerciseIndex) ? session.draft.exercises[exerciseIndex] : nil
    }

    var body: some View {
        if let exercise {
            content(exercise)
        } else {
            // The exercise was removed out from under an open editor.
            Color.clear.onAppear { session.detailIndex = nil }
        }
    }

    private func content(_ exercise: DraftExercise) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Exercise \(exerciseIndex + 1) of \(session.draft.exercises.count)")
                    .tagLabel(size: 9, tracking: 1.6)
                    .padding(.bottom, 8)

                titleRow(exercise)

                Text("\(Fmt.number(exercise.volume(workOnly: true))) lbs work volume · \(exercise.sets.count) sets")
                    .font(Typeface.mono(11))
                    .foregroundStyle(Theme.maint)
                    .padding(.top, 6)
                    .padding(.bottom, 16)

                setsHeader(exercise)

                ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { setIndex, set in
                    setRow(setIndex: setIndex, set: set, in: exercise)
                }

                setControls(exercise)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .scrollDismissesKeyboard(.interactively)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focused = nil }
                    .font(Typeface.body(15, .bold))
                    .foregroundStyle(Theme.maint)
            }
        }
    }

    private func titleRow(_ exercise: DraftExercise) -> some View {
        HStack(spacing: 10) {
            MuscleDot(group: catalog.metadata(for: exercise.exerciseId)?.primaryMuscleGroup)

            Text(catalog.name(for: exercise.exerciseId) ?? exercise.name ?? "Exercise \(exercise.exerciseId)")
                .font(Typeface.display(24))
                .textCase(.uppercase)
                .foregroundStyle(Theme.fg)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Spacer(minLength: 0)

            ControlCircle(symbol: "chevron.down", size: 32) { session.detailIndex = nil }
        }
    }

    private func setsHeader(_ exercise: DraftExercise) -> some View {
        HStack(spacing: gutter) {
            Text("Sets")
                .font(Typeface.body(15, .bold))
                .foregroundStyle(Theme.fg)
                // Same width as the set-number column below, so the Reps/Lb chips sit
                // directly over their boxes.
                .frame(width: numColumn, alignment: .leading)

            chip("Reps")
            chip("Lb")

            let allDone = !exercise.sets.isEmpty && exercise.sets.allSatisfy(\.done)
            CheckCircle(isOn: allDone, glyph: "✓✓", size: checkColumn - 2) {
                session.toggleAllSetsDone(exercise: exerciseIndex)
            }
            .frame(width: checkColumn)
        }
        .padding(.bottom, 10)
    }

    private func chip(_ label: String) -> some View {
        Text(label)
            .font(Typeface.body(13, .bold))
            .foregroundStyle(Theme.breakBlue)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(Theme.surface2, in: .rect(cornerRadius: 10, style: .continuous))
    }

    @ViewBuilder
    private func setRow(setIndex: Int, set: DraftSet, in exercise: DraftExercise) -> some View {
        HStack(spacing: gutter) {
            Text("\(setIndex + 1)")
                .font(Typeface.mono(19, .semibold))
                .foregroundStyle(Theme.fg)
                .frame(width: numColumn)

            NumBox(
                value: repsBinding(setIndex),
                field: Field.reps(setIndex),
                focus: $focused
            )

            NumBox(
                value: weightBinding(setIndex),
                field: Field.weight(setIndex),
                focus: $focused
            )

            CheckCircle(isOn: set.done, size: checkColumn - 2) {
                session.toggleSetDone(exercise: exerciseIndex, set: setIndex)
            }
            .frame(width: checkColumn)
        }
        .padding(.bottom, 10)

        fillDownChip(setIndex: setIndex, in: exercise)
    }

    /// "⇩ fill N below" — offered under the focused column when any set beneath it differs.
    @ViewBuilder
    private func fillDownChip(setIndex: Int, in exercise: DraftExercise) -> some View {
        let target: (SessionModel.SetField, String)? = {
            switch focused {
            case .reps(let i) where i == setIndex:
                let value = exercise.sets[setIndex].reps
                return exercise.sets.dropFirst(setIndex + 1).contains { $0.reps != value }
                    ? (.reps, "\(value)") : nil
            case .weight(let i) where i == setIndex:
                let value = exercise.sets[setIndex].weight
                return exercise.sets.dropFirst(setIndex + 1).contains { $0.weight != value }
                    ? (.weight, Fmt.weight(value)) : nil
            default:
                return nil
            }
        }()

        if let (field, label) = target {
            HStack(spacing: gutter) {
                Color.clear.frame(width: numColumn)

                if field == .weight {
                    Color.clear.frame(maxWidth: .infinity)
                }

                Button {
                    session.fillDown(exercise: exerciseIndex, from: setIndex, field: field)
                } label: {
                    Text("⇩ fill \(label) below")
                        .font(Typeface.mono(10))
                        .tracking(1)
                        .textCase(.uppercase)
                        .foregroundStyle(Theme.maint)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(Theme.maint, style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                        )
                }
                .buttonStyle(.plain)

                if field == .reps {
                    Color.clear.frame(maxWidth: .infinity)
                }

                Color.clear.frame(width: checkColumn)
            }
            .padding(.top, -4)
            .padding(.bottom, 10)
        }
    }

    private func setControls(_ exercise: DraftExercise) -> some View {
        HStack(spacing: 18) {
            ControlCircle(symbol: "minus", enabled: !exercise.sets.isEmpty) {
                session.removeLastSet(exercise: exerciseIndex)
            }
            Text("Set")
                .font(Typeface.body(15, .bold))
                .foregroundStyle(Theme.fg)
            ControlCircle(symbol: "plus") {
                session.addSet(exercise: exerciseIndex)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 14)
    }

    // MARK: - bindings

    // Both bindings guard their indices: as a pager page this view stays alive next to
    // the visible one, so a NumBox can re-evaluate after its set was removed (the "−"
    // button) or the whole draft was cleared (save/discard) — a raw subscript then traps.

    private func repsBinding(_ setIndex: Int) -> Binding<Double> {
        Binding(
            get: {
                guard let set = set(at: setIndex) else { return 0 }
                return Double(set.reps)
            },
            set: { newValue in
                guard set(at: setIndex) != nil else { return }
                // Reps are whole, and they share the weight box's decimal pad — so drop any
                // fraction, and let a value Int can't hold fall to 0 rather than trap.
                session.draft.exercises[exerciseIndex].sets[setIndex].reps = Int(exactly: newValue.rounded(.towardZero)) ?? 0
            }
        )
    }

    private func weightBinding(_ setIndex: Int) -> Binding<Double> {
        Binding(
            get: { set(at: setIndex)?.weight ?? 0 },
            set: { newValue in
                guard set(at: setIndex) != nil else { return }
                session.draft.exercises[exerciseIndex].sets[setIndex].weight = newValue
            }
        )
    }

    private func set(at setIndex: Int) -> DraftSet? {
        guard session.draft.exercises.indices.contains(exerciseIndex),
              session.draft.exercises[exerciseIndex].sets.indices.contains(setIndex) else { return nil }
        return session.draft.exercises[exerciseIndex].sets[setIndex]
    }
}
