import SwiftUI

/// What a set column holds. Hand-kept in step with `SetUnit` in apps/web/src/lib/setUnits.ts —
/// prototype vocabulary only, so nothing writes it to the draft or to Firestore yet.
enum SetUnit: String, Identifiable, CaseIterable {
    case reps
    case lb
    case time
    case feet
    case meters
    /// Spelled `blank` rather than `none` so it can never be read as `Optional.none`;
    /// the raw value stays "none" to match the web.
    case blank = "none"

    var id: String { rawValue }

    /// Column-header text. The header cell is one grid column wide, so it has to stay short.
    var chip: String {
        switch self {
        case .reps: "Reps"
        case .lb: "Lb"
        case .time: "Time"
        case .feet: "Feet"
        case .meters: "Meters"
        case .blank: "None"
        }
    }

    /// Wheel-row text, where there is room to spell it out.
    var label: String {
        switch self {
        case .reps: "Reps"
        case .lb: "Weight (lb)"
        case .time: "Time (mm:ss)"
        case .feet: "Feet"
        case .meters: "Meters"
        case .blank: "None"
        }
    }

    /// The first column can't be `.blank` — a set with no leading value isn't a set.
    static let repsOptions: [SetUnit] = [.reps, .time, .feet, .meters]

    /// The second column keeps `.lb` so switching away from pounds is reversible, and adds
    /// `.blank` for movements that carry no load at all.
    static let weightOptions: [SetUnit] = [.lb, .reps, .time, .feet, .meters, .blank]
}

/// The units an exercise's two set columns are keeping.
struct ColumnUnits: Equatable {
    var reps: SetUnit = .reps
    var weight: SetUnit = .lb
}

/// The column-unit picker: a wheel under a Cancel / Select bar. The wheel drives local state
/// only, so spinning it and hitting Cancel leaves the column alone — the web's dropdown commits
/// on tap instead, which is the platform-idiomatic split rather than a divergence.
struct UnitPickerSheet: View {
    let options: [SetUnit]
    let onSelect: (SetUnit) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var choice: SetUnit

    init(options: [SetUnit], initial: SetUnit, onSelect: @escaping (SetUnit) -> Void) {
        self.options = options
        self.onSelect = onSelect
        _choice = State(initialValue: initial)
    }

    var body: some View {
        NavigationStack {
            Picker("Unit", selection: $choice) {
                ForEach(options) { unit in
                    Text(unit.label)
                        .font(Typeface.body(20))
                        .foregroundStyle(Theme.fg)
                        .tag(unit)
                }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.bg)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Typeface.body(17))
                        .foregroundStyle(Theme.muted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Select") {
                        onSelect(choice)
                        dismiss()
                    }
                    .font(Typeface.body(17, .bold))
                    .foregroundStyle(Theme.maint)
                }
            }
            .toolbarBackground(Theme.surface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .presentationDetents([.height(300)])
        .presentationDragIndicator(.hidden)
    }
}
