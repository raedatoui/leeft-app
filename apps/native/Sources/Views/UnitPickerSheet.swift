import SwiftUI

/// What a set column holds. Hand-kept in step with `SetUnitSchema` in packages/types/src/index.ts,
/// which is also what the Firestore `units` map carries — the raw values are the wire format.
enum SetUnit: String, Identifiable, Codable, CaseIterable {
    case reps
    case time
    case lb
    /// Load added on top of bodyweight rather than the total moved. Kept apart from `lb` because
    /// the two are different scales: a chin-up "@ 10" and one "@ 210" are the same lift, and
    /// letting them share a records ladder makes the ladder 20x wide.
    case bodyweightPlus = "bw+"
    /// Spelled `blank` rather than `none` so it can never be read as `Optional.none`;
    /// the raw value stays "none" to match the web.
    case blank = "none"
    case feet
    case inches
    case meters

    var id: String { rawValue }

    /// Column-header text. The header cell is one grid column wide, so it has to stay short.
    var chip: String {
        switch self {
        case .reps: "Reps"
        case .time: "Time"
        case .lb: "Lb"
        case .bodyweightPlus: "BW+"
        case .blank: "None"
        case .feet: "Feet"
        case .inches: "Inches"
        case .meters: "Meters"
        }
    }

    /// Wheel-row text, where there is room to spell it out.
    var label: String {
        switch self {
        case .reps: "Reps"
        case .time: "Time (mm:ss)"
        case .lb: "Weight (lb)"
        case .bodyweightPlus: "Added to bodyweight"
        case .blank: "None"
        case .feet: "Feet"
        case .inches: "Inches"
        case .meters: "Meters"
        }
    }

    /// How a value in this column reads. Durations are held as whole seconds and shown as mm:ss;
    /// everything else is a plain number, trimmed of a pointless ".0".
    func format(_ value: Double) -> String {
        if self == .time {
            let whole = Int(value.rounded())
            return String(format: "%d:%02d", whole / 60, whole % 60)
        }
        return value == value.rounded() ? String(Int(value)) : String(value)
    }

    /// The inverse, lenient about what gets typed: "90" and "1:30" are the same ninety seconds.
    func parse(_ text: String) -> Double {
        guard self == .time else { return Double(text) ?? 0 }
        let parts = text.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count >= 2 else { return Double(text) ?? 0 }
        return (Double(parts[0]) ?? 0) * 60 + (Double(parts[1]) ?? 0)
    }

    /// The first column can't be `.blank` — a set with no leading value isn't a set.
    static let repsOptions: [SetUnit] = [.reps, .time, .feet, .meters]

    /// The second column keeps `.lb` first, since almost everything is pounds.
    static let weightOptions: [SetUnit] = [.lb, .bodyweightPlus, .blank, .inches, .feet, .meters, .time, .reps]
}

/// The units an exercise's two set columns are keeping. Encoded straight into the Firestore
/// document's `units` map, so the keys match `ColumnUnitsSchema` in packages/types.
struct ColumnUnits: Codable, Equatable {
    var reps: SetUnit = .reps
    var weight: SetUnit = .lb

    /// Only reps-times-pounds is tonnage. Everything else still renders, but contributes nothing
    /// to volume and holds no weight-ranked record. Mirrors `isLoaded` in packages/types.
    var isLoaded: Bool { reps == .reps && weight == .lb }
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
