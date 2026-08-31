import Foundation

/// An inclusive rep window. Mirrors `RepRangeSchema` in packages/types.
struct RepRange: Hashable {
    var min: Int = 1
    var max: Int = 50

    /// The unfiltered default the exercise page opens on.
    static let full = RepRange()

    /// A rep count is whole; a lead column holding seconds or feet never reaches here, because
    /// every caller gates on `ColumnUnits.isLoaded` first.
    func contains(_ reps: Double) -> Bool {
        reps > 0 && Int(reps) >= min && Int(reps) <= max
    }
}

/// How one session reduces to the single number the exercise chart plots.
///
/// Hand-mirrored from `maxCalculators` and `oneRepMaxCalculators` in packages/utils/src/calc.ts.
/// One enum rather than the web's struct-carrying-a-closure: Swift gets `Hashable` and
/// exhaustiveness for free, and SwiftUI needs both to tag a segmented control.
enum CalculationMethod: String, CaseIterable, Identifiable, Hashable {
    case maxWeight, maxVolume, maxThreeByFive
    case epley, brzycki, mcGlothin, lombardi, mayhew, oConner, wathen

    var id: String { rawValue }

    /// The three that sit on the segmented control, in the web's order.
    static let maxOptions: [Self] = [.maxWeight, .maxVolume, .maxThreeByFive]
    /// The seven estimators, which live behind a menu.
    static let oneRepMax: [Self] = [.epley, .brzycki, .mcGlothin, .lombardi, .mayhew, .oConner, .wathen]

    var name: String {
        switch self {
        case .maxWeight: "Max Weight"
        case .maxVolume: "Max Volume"
        case .maxThreeByFive: "Max 3x5"
        case .epley: "Epley"
        case .brzycki: "Brzycki"
        case .mcGlothin: "McGlothin"
        case .lombardi: "Lombardi"
        case .mayhew: "Mayhew"
        case .oConner: "O'Conner"
        case .wathen: "Wathen"
        }
    }

    /// `description` is spoken for by `CustomStringConvertible`, so the web's field is `summary`.
    var summary: String {
        switch self {
        case .maxWeight: "Max weight"
        case .maxVolume: "Max total volume"
        case .maxThreeByFive: "Max top N consecutive reps sets at M reps"
        case .epley: "Most widely used formula, good for 1-10 reps"
        case .brzycki: "More accurate for higher reps (>10)"
        case .mcGlothin: "Conservative estimate for lower reps"
        case .lombardi: "Simple exponential formula"
        case .mayhew: "Good for bench press specifically"
        case .oConner: "Linear formula, similar to Epley"
        case .wathen: "More accurate for squat and deadlift"
        }
    }

    var formula: String {
        switch self {
        case .maxWeight: "max(weight)"
        case .maxVolume: "Σ(weight × reps)"
        case .maxThreeByFive: "sum of top 3 sets at 5 reps"
        case .epley: "weight × (1 + reps/30)"
        case .brzycki: "weight × (36/(37 - reps))"
        case .mcGlothin: "(100 × weight)/(101.3 - 2.67123 × reps)"
        case .lombardi: "weight × reps^0.1"
        case .mayhew: "(100 × weight)/(52.2 + 41.9e^(-0.055 × reps))"
        case .oConner: "weight × (1 + reps/40)"
        case .wathen: "(100 × weight)/(48.8 + 53.8e^(-0.075 × reps))"
        }
    }

    /// Half of the star rule. A ★ is an all-time claim about a set that was *performed*, so an
    /// estimator never earns one, and neither does a method that ranks a sum rather than a weight
    /// at a rep count — which is what the pipeline's ladder actually holds. The other half is the
    /// filter state, applied in `ExerciseSessions.rows`.
    var showsPRStars: Bool { self == .maxWeight }

    /// The one number this session plots. Only ever called for a loaded (reps × lb|assisted)
    /// exercise — an unloaded basis has no method to apply and is handled by the caller.
    func metric(for sets: [LiftingWorkoutDoc.Exercise.Set], repRange: RepRange) -> Double {
        switch self {
        case .maxWeight:
            SetMath.topSet(sets, in: repRange)?.weight ?? 0
        case .maxVolume:
            // Deliberately ignores the rep range and includes warmups, matching getVolumeWeight.
            sets.reduce(0) { $0 + $1.weight * $1.reps }
        case .maxThreeByFive:
            SetMath.topNSets(sets)
        default:
            SetMath.oneRepMax(sets, in: repRange, estimator)
        }
    }

    /// `(weight, reps) -> estimated 1RM`. Only defined for the seven estimators.
    private var estimator: (Double, Double) -> Double {
        switch self {
        case .epley: { w, r in w * (1 + r / 30) }
        case .brzycki: { w, r in w * (36 / (37 - r)) }
        case .mcGlothin: { w, r in (100 * w) / (101.3 - 2.67123 * r) }
        case .lombardi: { w, r in w * pow(r, 0.1) }
        case .mayhew: { w, r in (100 * w) / (52.2 + 41.9 * exp(-0.055 * r)) }
        case .oConner: { w, r in w * (1 + r / 40) }
        case .wathen: { w, r in (100 * w) / (48.8 + 53.8 * exp(-0.075 * r)) }
        default: { _, _ in 0 }
        }
    }
}

/// The set-level primitives the methods are built from — the Swift half of
/// packages/utils/src/calc.ts.
enum SetMath {
    /// Heaviest set overall, ignoring reps entirely — what an unloaded basis needs, where the
    /// lead column holds seconds or feet and a rep window means nothing.
    static func topSet(_ sets: [LiftingWorkoutDoc.Exercise.Set]) -> LiftingWorkoutDoc.Exercise.Set? {
        var best: LiftingWorkoutDoc.Exercise.Set?
        for set in sets {
            if best == nil || set.weight > best!.weight { best = set }
        }
        return best
    }

    /// Heaviest set inside the rep window, or nil when none qualifies.
    ///
    /// The web sorts descending and takes `[0]`; `Array.prototype.sort` is stable, so a tie goes
    /// to the *earliest* set. A forward scan with a strict `>` reproduces that —
    /// `max(by:)` would not, because it returns the last maximal element.
    static func topSet(_ sets: [LiftingWorkoutDoc.Exercise.Set], in range: RepRange) -> LiftingWorkoutDoc.Exercise.Set? {
        var best: LiftingWorkoutDoc.Exercise.Set?
        for set in sets where range.contains(set.reps) {
            if best == nil || set.weight > best!.weight { best = set }
        }
        return best
    }

    /// Sum of the first run of `count` consecutive sets at exactly `targetReps` that contains the
    /// heaviest such set — 0 when no run qualifies, which is why Max 3x5 legitimately plots fewer
    /// points than the other methods rather than plotting zeroes.
    static func topNSets(_ sets: [LiftingWorkoutDoc.Exercise.Set], count: Int = 3, targetReps: Int = 5) -> Double {
        // `reps` is a Double on this side, so the web's `=== targetReps` becomes an epsilon test.
        let atTarget = { (set: LiftingWorkoutDoc.Exercise.Set) in abs(set.reps - Double(targetReps)) < 0.0001 }

        let targetSets = sets.filter(atTarget)
        guard targetSets.count >= count else { return 0 }

        let heaviest = targetSets.map(\.weight).max() ?? 0
        guard let peak = sets.firstIndex(where: { atTarget($0) && $0.weight == heaviest }) else { return 0 }

        // Every window of `count` that could still contain the peak set.
        let first = Swift.max(0, peak - count + 1)
        let last = Swift.min(peak, sets.count - count)
        guard first <= last else { return 0 }
        for start in first...last {
            let window = sets[start..<(start + count)]
            if window.allSatisfy(atTarget) { return window.reduce(0) { $0 + $1.weight } }
        }
        return 0
    }

    /// An estimator applied to the top set. No qualifying set, or a set with no reps, means 0 —
    /// which the caller drops rather than plots.
    static func oneRepMax(
        _ sets: [LiftingWorkoutDoc.Exercise.Set],
        in range: RepRange,
        _ estimate: (Double, Double) -> Double
    ) -> Double {
        guard let set = topSet(sets, in: range), set.reps > 0 else { return 0 }
        return estimate(set.weight, set.reps)
    }
}
