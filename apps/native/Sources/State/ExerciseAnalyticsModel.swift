import Foundation

/// What the exercise sheet's controls are set to. One `Equatable` value so the view can push
/// changes with a single `onChange` rather than a computed property that would re-derive on
/// every scrub tick.
struct ExerciseFilters: Equatable {
    var method: CalculationMethod = .maxWeight
    var repRange: RepRange = .full
    var timeRange: TimeRange = .all
    /// nil means "whichever basis was used most recently".
    var basis: String?
}

/// The derivation behind `ExerciseAnalyticsSheet`, memoised in two phases.
///
/// Phase one walks the whole history once, at init, and keeps only the days that logged this
/// exercise. Phase two re-runs just the filters over that short list. Nothing here is touched
/// while scrubbing the chart — that state lives in `ExercisePRChart`, so a drag re-renders the
/// plot and nothing else.
@Observable
final class ExerciseAnalyticsModel {
    /// All filtered sessions, every basis — what the four hero stats are computed over, matching
    /// `computeExerciseStats(sessions)` on the web.
    private(set) var sessions: [ExerciseSession] = []
    /// The active basis only — what the chart plots.
    private(set) var chartSessions: [ExerciseSession] = []
    /// Ascending day keys of `chartSessions`, for the scrub's binary search.
    private(set) var chartDays: [Date] = []
    /// Pre-filtered star marks, so the chart's ForEach doesn't filter on every redraw.
    private(set) var prSessions: [ExerciseSession] = []
    private(set) var stats = ExerciseSessionStats()
    private(set) var bases: [BasisOption] = []
    private(set) var activeBasis: String?
    /// The chart's title, y-axis meaning and card label, all one string.
    private(set) var metricName = ""
    /// How a y value reads — only a duration needs more than a plain number.
    private(set) var chartUnit: SetUnit = .reps
    /// True when the active basis is reps × lb|assisted, so the metric controls apply at all.
    private(set) var plotsLoad = false
    private(set) var yDomain: ClosedRange<Double> = 0...1

    struct BasisOption: Identifiable {
        let key: String
        let label: String
        let count: Int
        var id: String { key }
    }

    private let candidates: [ExerciseCandidate]

    init(exerciseId: Int, workouts: [LiftingWorkoutDoc], filters: ExerciseFilters) {
        candidates = ExerciseSessions.candidates(in: workouts, exerciseId: exerciseId)
        apply(filters)
    }

    /// Total number of days this exercise was ever logged, before any filter — what the empty
    /// state uses to tell "no sessions at all" apart from "none match these filters".
    var candidateCount: Int { candidates.count }

    func apply(_ filters: ExerciseFilters) {
        sessions = ExerciseSessions.rows(
            candidates,
            method: filters.method,
            repRange: filters.repRange,
            range: filters.timeRange.resolved
        )
        stats = ExerciseSessions.stats(sessions)

        // Bases, most recently used first — the default is whatever you last trained on.
        var lastUsed: [String: Date] = [:]
        var counts: [String: Int] = [:]
        var labels: [String: String] = [:]
        for session in sessions {
            lastUsed[session.basis] = max(lastUsed[session.basis] ?? .distantPast, session.day)
            counts[session.basis, default: 0] += 1
            labels[session.basis] = session.units.basisLabel
        }
        bases = lastUsed
            .sorted { $0.value > $1.value }
            .map { BasisOption(key: $0.key, label: labels[$0.key] ?? $0.key, count: counts[$0.key] ?? 0) }

        // A basis selected under one time range may not survive a narrower one; fall back to the
        // most recent rather than emptying the chart.
        activeBasis = bases.contains(where: { $0.key == filters.basis }) ? filters.basis : bases.first?.key
        chartSessions = sessions.filter { $0.basis == activeBasis }
        chartDays = chartSessions.map(\.day)
        prSessions = chartSessions.filter { $0.prTier != nil }

        let units = chartSessions.last?.units
        chartUnit = units?.reps ?? .reps
        plotsLoad = chartSessions.contains(where: \.loaded)
        metricName =
            plotsLoad
            ? filters.method.name
            : units?.weight == .bodyweightPlus ? "Top Added Lb" : "Top \(chartUnit.chip)"

        // Pad unconditionally: a single session gives a degenerate domain that Swift Charts
        // renders as a flat line pinned to an axis edge.
        let values = chartSessions.map(\.metric)
        let low = values.min() ?? 0
        let high = values.max() ?? 1
        let pad = Swift.max(1, (high - low) * 0.12)
        yDomain = Swift.max(0, low - pad)...(high + pad)
    }

    /// The session nearest a scrub position. The chart's x scale is continuous, so the selection
    /// binding reports the date under the finger, never a data point.
    func session(nearest date: Date) -> ExerciseSession? {
        guard !chartDays.isEmpty else { return nil }
        var low = 0
        var high = chartDays.count - 1
        while low < high {
            let mid = (low + high) / 2
            if chartDays[mid] < date { low = mid + 1 } else { high = mid }
        }
        // `low` is the first day at or after `date`; the one before it may still be closer.
        if low > 0 {
            let before = chartDays[low - 1]
            if abs(before.timeIntervalSince(date)) <= abs(chartDays[low].timeIntervalSince(date)) {
                return chartSessions[low - 1]
            }
        }
        return chartSessions[low]
    }
}
