import Foundation

/// One logged day of one exercise, already reduced to the number the chart plots.
/// Hand-mirrored from `ExerciseSessionRow` in apps/web/src/lib/exerciseSessions.ts.
struct ExerciseSession: Identifiable {
    /// The whole document, so the day sheet can render the session without a second lookup.
    let workout: LiftingWorkoutDoc
    /// UTC midnight of the logged day — the chart's x value and this row's identity.
    let day: Date
    let exercise: LiftingWorkoutDoc.Exercise
    let topSet: LiftingWorkoutDoc.Exercise.Set?
    let workSetCount: Int
    let workVolume: Double
    let metric: Double
    /// Stable key for the measurement basis, e.g. "reps x lb". Sessions only compare within one
    /// basis, so this is what the page groups and switches on.
    let basis: String
    /// False when the session wasn't reps × lb|assisted — a plank, a sled push, a chin-up logged
    /// as an added plate. No tonnage, no weight-ranked record, and no rep range to filter on.
    let loaded: Bool
    let prTier: LiftingWorkoutDoc.Exercise.Set.PrTier?

    var id: String { workout.dateKey }
    var units: ColumnUnits { exercise.columnUnits }
}

/// The four hero numbers. Computed across *all* filtered sessions rather than just the charted
/// basis, matching `computeExerciseStats` on the web.
struct ExerciseSessionStats {
    var pr: Double = 0
    var totalSets: Int = 0
    var sessionCount: Int = 0
    var volume: Double = 0
}

/// One day's candidate before any filter runs — the expensive half of the derivation, which walks
/// the whole history once and is never recomputed while the sheet is open.
struct ExerciseCandidate {
    let workout: LiftingWorkoutDoc
    let day: Date
    let exercise: LiftingWorkoutDoc.Exercise
}

enum ExerciseSessions {
    /// Every day this exercise was logged, oldest first. `first(where:)` matches the web's `find`:
    /// one session per day, which is what makes the chart's date-keyed lookup total.
    static func candidates(in workouts: [LiftingWorkoutDoc], exerciseId: Int) -> [ExerciseCandidate] {
        workouts
            .compactMap { workout in
                guard let day = workout.day,
                      let exercise = workout.exercises.first(where: { $0.exerciseId == exerciseId })
                else { return nil }
                return ExerciseCandidate(workout: workout, day: day, exercise: exercise)
            }
            // The store holds newest-first; the chart reads oldest-first.
            .sorted { $0.day < $1.day }
    }

    /// The cheap half: the filters, in the web's order, over an already-built candidate list.
    static func rows(
        _ candidates: [ExerciseCandidate],
        method: CalculationMethod,
        repRange: RepRange,
        range: ResolvedTimeRange
    ) -> [ExerciseSession] {
        // A ★ is an all-time claim, so it only renders where the view can back that claim up: the
        // plain max-weight metric over an unfiltered log. A time window would show an all-time star
        // inside a period that need not even contain the best set. The rep range is deliberately
        // *not* disqualifying — the pipeline's ladder is keyed by exact rep count, so filtering to
        // fives and starring the standing 5RM is still an all-time statement. Mirrors `showPRSet`
        // in apps/web/src/lib/exerciseSessions.ts.
        let showPRSet = method.showsPRStars && range.isUnbounded

        var rows: [ExerciseSession] = []
        for candidate in candidates {
            guard range.contains(candidate.day) else { continue }

            let exercise = candidate.exercise
            let units = exercise.columnUnits
            let loaded = units.isLoaded

            // A rep range is meaningless against seconds or inches — filtering on it would empty
            // the page for every movement that isn't reps × lb.
            if loaded, !exercise.sets.contains(where: { repRange.contains($0.reps) }) { continue }

            // Each basis progresses on a different number, so each plots its own:
            //   reps x lb   the selected max / volume / 1RM method
            //   reps x bw+  the plate hung off you — 5 to 25 lb is the whole progression
            //   otherwise   the top value of the first column: reps, seconds, feet
            let metric: Double
            if loaded {
                metric = method.metric(for: exercise.sets, repRange: repRange)
            } else if units.weight == .bodyweightPlus {
                metric = exercise.sets.map(\.weight).max() ?? 0
            } else {
                metric = exercise.sets.map(\.reps).max() ?? 0
            }
            // Max 3x5 returns 0 for a session with no qualifying run; those drop out rather than
            // flatten the series against the axis.
            if loaded, metric <= 0 { continue }

            let topSet = loaded ? SetMath.topSet(exercise.sets, in: repRange) : SetMath.topSet(exercise.sets)

            rows.append(
                ExerciseSession(
                    workout: candidate.workout,
                    day: candidate.day,
                    exercise: exercise,
                    topSet: topSet,
                    workSetCount: exercise.sets.filter(\.isWorkSet).count,
                    workVolume: exercise.workVolume,
                    metric: metric,
                    basis: units.basisKey,
                    loaded: loaded,
                    // PR markers come from the pipeline (per-rep-count, tiered), never a
                    // per-filter running max.
                    prTier: showPRSet ? topSet?.prTier : nil
                )
            )
        }
        return rows
    }

    static func stats(_ sessions: [ExerciseSession]) -> ExerciseSessionStats {
        var stats = ExerciseSessionStats(sessionCount: sessions.count)
        for session in sessions {
            if session.metric > stats.pr { stats.pr = session.metric }
            stats.totalSets += session.workSetCount
            stats.volume += session.workVolume
        }
        return stats
    }
}

extension ColumnUnits {
    /// The grouping key — a chin-up logged `bw+ @10` and one logged `lb @210` are the same lift on
    /// two scales and must never share a y-axis.
    var basisKey: String { "\(reps.rawValue) x \(weight.rawValue)" }

    /// How that key reads on the basis switch. Mirrors `basisLabel` in apps/web/src/lib/setUnits.ts;
    /// `.assisted` is checked before `isLoaded`, which is true for both pound bases, and a blank
    /// load column reads "Bodyweight" — sets that are bodyweight work, not an absence.
    var basisLabel: String {
        if weight == .assisted { return "Assisted" }
        if isLoaded { return "Lb" }
        if weight == .bodyweightPlus { return "BW+" }
        if weight == .blank, reps == .reps { return "Bodyweight" }
        return reps.chip
    }
}
