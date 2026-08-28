import SwiftUI
import UIKit

/// One logged day, transcribed from `WorkoutCard` in
/// apps/web/src/components/workouts/v2/workoutCard.tsx — the lifting half of it.
///
/// The web card also renders cardio bodies and PR badges; neither has any representation in
/// `lifting-workouts`, so this is `.session-title-row` → `.lift-headline` → `.session-vol`
/// → `.ex-block`s and nothing else. The per-card collapse toggle is the web's `.card-toggle`:
/// expanded shows each exercise's `.sets-table`, compact swaps it for the `.ex-summary` line.
struct WorkoutCardView: View {
    @Environment(ExerciseCatalog.self) private var catalog

    let workout: LiftingWorkoutDoc

    /// Starts collapsed — a page of one-line summaries reads as the shape of the session,
    /// with the sets tables a tap away. (The web card defaults the other way, but it isn't
    /// paging a card at a time through a phone.)
    @State private var compact = true

    /// Flashes the copy button to a checkmark for a beat after a copy, as the web button does.
    @State private var copied = false
    @State private var copiedReset: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            titleRow
            headline
            volRow
            exercises
        }
        .padding(.horizontal, 22)
        .padding(.top, 22)
        .padding(.bottom, 18)
    }

    /// `.session-title-row` — the long date, and the collapse toggle. The whole row is the
    /// hit target: a 26pt circle alone is a thin thing to aim at on a phone.
    private var titleRow: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(workout.day.map(Fmt.longDate.string(from:)) ?? workout.dateKey)
                .font(Typeface.display(28))
                .foregroundStyle(Theme.fg)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // The web's title carries no year — fine in a single-day panel, ambiguous in a
            // list that scrolls back through seasons.
            if let day = workout.day {
                Text(Fmt.year.string(from: day))
                    .font(Typeface.mono(11))
                    .tracking(1.2)
                    .foregroundStyle(Theme.muted2)
            }

            Spacer(minLength: 0)

            Image(systemName: compact ? "chevron.down" : "chevron.up")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Theme.muted)
                .frame(width: 26, height: 26)
                .overlay(Circle().strokeBorder(Theme.border, lineWidth: 1))
        }
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
        .contentShape(.rect)
        .onTapGesture { withAnimation(.snappy(duration: 0.22)) { compact.toggle() } }
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(compact ? "Expand workout" : "Collapse workout")
    }

    /// `.lift-headline` — icon, LIFTING, start time, duration.
    private var headline: some View {
        HStack(spacing: 10) {
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 15))
                .foregroundStyle(Theme.maint)

            Text("LIFTING")
                .font(Typeface.display(22))
                .tracking(0.9)
                .foregroundStyle(Theme.maint)

            if let started = workout.startedAtDate {
                Text(Fmt.timeOfDay.string(from: started))
                    .font(Typeface.mono(11))
                    .foregroundStyle(Theme.muted)
            }

            Spacer(minLength: 0)

            HStack(spacing: 3) {
                Text(String(format: "%02d", workout.duration))
                    .foregroundStyle(Theme.fg)
                Text("MIN")
                    .foregroundStyle(Theme.muted)
            }
            .font(Typeface.mono(11))
            .tracking(1.0)
        }
    }

    /// `.session-vol` — volume, set count, exercise count.
    private var volRow: some View {
        HStack(spacing: 14) {
            stat(Fmt.number(workout.volume), "lbs", color: Theme.maint)
            stat("\(workout.setCount)", "sets")
            stat("\(workout.exercises.count)", "ex")
            Spacer(minLength: 0)
            copyButton
        }
        .font(Typeface.mono(11))
        .tracking(0.9)
    }

    /// `.lift-copy` — copies the session in the web card's clipboard form. The checkmark is
    /// the only feedback a phone gives (no hover, no tooltip), so it takes the accent color.
    private var copyButton: some View {
        Button {
            UIPasteboard.general.string = clipboardText
            copied = true
            copiedReset?.cancel()
            copiedReset = Task {
                try? await Task.sleep(for: .seconds(1.5))
                if !Task.isCancelled { copied = false }
            }
        } label: {
            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(copied ? Theme.maint : Theme.muted)
                .frame(width: 26, height: 26)
                .overlay(Circle().strokeBorder(Theme.border, lineWidth: 1))
                .contentTransition(.symbolEffect(.replace))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Copy exercises")
    }

    /// The web `handleCopy` text: "Wednesday, August 27 · 2:42 PM · 62 min", then one
    /// lowercased "name: reps@weight" line per exercise.
    private var clipboardText: String {
        var header = workout.day.map(Fmt.longDate.string(from:)) ?? workout.dateKey
        if let started = workout.startedAtDate {
            header += " · \(Fmt.timeOfDay.string(from: started))"
        }
        header += " · \(workout.duration) min"
        let lines = workout.exercises.map { ex in
            "\((catalog.metadata(for: ex.exerciseId)?.name ?? "Exercise \(ex.exerciseId)").lowercased()): \(ex.setsClipboard)"
        }
        return ([header] + lines).joined(separator: "\n")
    }

    private func stat(_ value: String, _ unit: String, color: Color = Theme.fg) -> some View {
        HStack(spacing: 4) {
            Text(value).foregroundStyle(color)
            Text(unit.uppercased()).foregroundStyle(Theme.muted2)
        }
    }

    /// `.exercises` — one `.ex-block` per exercise, hairline-separated.
    private var exercises: some View {
        VStack(spacing: 0) {
            ForEach(Array(workout.exercises.enumerated()), id: \.element.id) { index, exercise in
                ExerciseBlockView(exercise: exercise, metadata: catalog.metadata(for: exercise.exerciseId), compact: compact)
                    .padding(.vertical, 12)
                    .overlay(alignment: .bottom) {
                        if index < workout.exercises.count - 1 {
                            Rectangle().fill(Theme.borderSoft).frame(height: 1)
                        }
                    }
            }
        }
    }
}

/// `.ex-block` — name and volume, then either the sets table or the one-line summary.
private struct ExerciseBlockView: View {
    let exercise: LiftingWorkoutDoc.Exercise
    let metadata: ExerciseMetadata?
    let compact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                HStack(spacing: 6) {
                    // `.mg-pip`, the muscle-group dot. Only drawn once the catalog has
                    // landed — an unknown group is a missing dot, not a grey one.
                    if let group = metadata?.primaryMuscleGroup {
                        MuscleDot(group: group, size: 6)
                    }
                    Text(metadata?.name ?? "Exercise \(exercise.exerciseId)")
                        .font(Typeface.body(14, .medium))
                        .foregroundStyle(Theme.fg)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                HStack(spacing: 4) {
                    Text(Fmt.number(exercise.volume)).foregroundStyle(Theme.muted)
                    Text("LBS").foregroundStyle(Theme.muted2)
                }
                .font(Typeface.mono(11))
                .tracking(0.9)
            }

            if compact {
                Text(exercise.setsSummary)
                    .font(Typeface.mono(12))
                    .foregroundStyle(Theme.muted)
            } else if !exercise.sets.isEmpty {
                setsTable
            }
        }
    }

    /// `.sets-table` — set / reps / lbs. Work sets take the foreground color with a yellow
    /// index; warmups stay muted, which is how the web renders them when warmup is shown.
    private var setsTable: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                cell("SET", width: Self.indexColumn)
                cell("REPS")
                cell("LBS")
            }
            .font(Typeface.mono(10))
            .tracking(1.6)
            .foregroundStyle(Theme.muted2)
            .padding(.vertical, 4)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }

            ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { index, set in
                HStack(spacing: 0) {
                    cell("\(index + 1)", width: Self.indexColumn)
                        .foregroundStyle(set.isWorkSet ? Theme.maint : Theme.muted)
                    cell("\(set.reps)")
                    cell(Fmt.weight(set.weight))
                }
                .font(Typeface.mono(12, set.isWorkSet ? .semibold : .regular))
                .foregroundStyle(set.isWorkSet ? Theme.fg : Theme.muted)
                .padding(.vertical, 3)
                .overlay(alignment: .bottom) {
                    if index < exercise.sets.count - 1 {
                        Rectangle().fill(Theme.borderSoft).frame(height: 1)
                    }
                }
            }
        }
    }

    /// The narrow set-number column; reps and lbs split what's left, as in the CSS widths.
    private static let indexColumn: CGFloat = 44

    @ViewBuilder
    private func cell(_ text: String, width: CGFloat? = nil) -> some View {
        if let width {
            Text(text).frame(width: width)
        } else {
            Text(text).frame(maxWidth: .infinity)
        }
    }
}
