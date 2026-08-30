import Foundation

/// The Firestore doc shape at `lifting-workouts/{YYYY-MM-DD}` — and, read-only, at
/// `lifting-history/{YYYY-MM-DD}`, which the pipeline publishes with `prTier` on PR sets.
///
/// This is a **cross-language contract**: `apps/data/src/firestore/download.ts` decodes it
/// over the REST API, and its decoder deliberately handles no Timestamp values — so every
/// temporal field here is an ISO 8601 string, never a `Date`. Keep this in step with
/// `LiftingWorkoutDoc` in `apps/web/src/lib/firebase.ts`.
struct LiftingWorkoutDoc: Identifiable {
    /// One doc per day keyed `YYYY-MM-DD`, so the date is the identity.
    var id: String { date }

    let uuid: String
    let date: String
    let title: String
    let startedAt: String
    /// Minutes. Lifting workouts use a bare minute count, unlike cardio's durationMs/durationMin pair.
    let duration: Int
    let rpe: Int
    let readiness: [String: Int]
    let exercises: [Exercise]
    let volume: Double
    let workVolume: Double

    struct Exercise: Identifiable {
        let exerciseId: Int
        let order: Int
        let sets: [Set]
        let volume: Double
        let workVolume: Double

        /// `order` is unique within the doc; `exerciseId` isn't guaranteed to be.
        var id: Int { order }

        struct Set: Identifiable {
            let order: Int
            let weight: Double
            let reps: Int
            let isWorkSet: Bool
            /// PR-at-the-time, per exact rep count — computed by the pipeline
            /// (`computePersonalRecords.ts`), present only on `lifting-history` documents. `var`
            /// with defaults on purpose: the decoder below is an extension, which cannot assign a
            /// `let` that already has one, and `SessionModel.save` builds these memberwise.
            var prTier: PrTier?

            var id: Int { order }

            /// Mirrors `prTier` in `SetSchema` (packages/types) and `TIER_RANK` in workoutCard.tsx.
            enum PrTier: String, Comparable {
                case beaten, active, allTime

                private var rank: Int {
                    switch self {
                    case .beaten: 1
                    case .active: 2
                    case .allTime: 3
                    }
                }

                static func < (lhs: Self, rhs: Self) -> Bool { lhs.rank < rhs.rank }
            }
        }
    }

    /// Hand-rolled rather than `Codable`: the Firestore SDK takes `[String: Any]`, and going
    /// through an encoder would only add a round-trip to get back to the same dictionary.
    var firestoreData: [String: Any] {
        [
            "uuid": uuid,
            "date": date,
            "title": title,
            "startedAt": startedAt,
            "duration": duration,
            "rpe": rpe,
            "readiness": readiness,
            "volume": volume,
            "workVolume": workVolume,
            "exercises": exercises.map { ex in
                [
                    "exerciseId": ex.exerciseId,
                    "order": ex.order,
                    "volume": ex.volume,
                    "workVolume": ex.workVolume,
                    "sets": ex.sets.map { s in
                        [
                            "order": s.order,
                            "weight": s.weight,
                            "reps": s.reps,
                            "isWorkSet": s.isWorkSet,
                        ] as [String: Any]
                    },
                ] as [String: Any]
            },
        ]
    }

    static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}

// MARK: - reading
//
// The read side lives in extensions on purpose: an `init` written in a struct's own body
// suppresses the synthesized memberwise initializer, and the write path (`SessionModel.save`)
// builds these values memberwise.

extension LiftingWorkoutDoc {
    /// Decodes a doc coming back off Firestore — the mirror of `firestoreData`.
    ///
    /// Numbers arrive as `NSNumber` whichever way they went in, so every numeric field goes
    /// through it rather than guessing `Int` vs `Double`. Missing fields fall back instead of
    /// failing the whole doc: only one with no `date` is unusable.
    init?(id: String, data: [String: Any]) {
        guard let date = data["date"] as? String else { return nil }
        self.date = date
        uuid = data["uuid"] as? String ?? id
        title = data["title"] as? String ?? id
        startedAt = data["startedAt"] as? String ?? ""
        duration = (data["duration"] as? NSNumber)?.intValue ?? 0
        rpe = (data["rpe"] as? NSNumber)?.intValue ?? 0
        readiness = ((data["readiness"] as? [String: Any]) ?? [:]).compactMapValues { ($0 as? NSNumber)?.intValue }
        volume = (data["volume"] as? NSNumber)?.doubleValue ?? 0
        workVolume = (data["workVolume"] as? NSNumber)?.doubleValue ?? 0
        exercises = ((data["exercises"] as? [[String: Any]]) ?? [])
            .map(Exercise.init(data:))
            .sorted { $0.order < $1.order }
    }

    /// The `YYYY-MM-DD` part of the ISO date field — the day key this doc is stored under.
    var dateKey: String { String(date.prefix(10)) }

    /// UTC midnight of the logged day, for the card's date header. Parsed off the day key
    /// rather than the full ISO string so a timezone suffix can't shift it.
    var day: Date? { Fmt.dateKey.date(from: dateKey) }

    /// The instant the session started, or nil when the field is absent or unparseable.
    var startedAtDate: Date? { Fmt.parseISO(startedAt) }

    var setCount: Int { exercises.reduce(0) { $0 + $1.sets.count } }
}

extension LiftingWorkoutDoc.Exercise {
    init(data: [String: Any]) {
        exerciseId = (data["exerciseId"] as? NSNumber)?.intValue ?? 0
        order = (data["order"] as? NSNumber)?.intValue ?? 0
        volume = (data["volume"] as? NSNumber)?.doubleValue ?? 0
        workVolume = (data["workVolume"] as? NSNumber)?.doubleValue ?? 0
        sets = ((data["sets"] as? [[String: Any]]) ?? [])
            .map(Set.init(data:))
            .sorted { $0.order < $1.order }
    }

    /// "5,5,5 @ 135,225,225" — the compact one-liner, matching `formatSetsSummary` in
    /// apps/web/src/components/workouts/v2/workoutCard.tsx.
    var setsSummary: String {
        guard !sets.isEmpty else { return "—" }
        let reps = sets.map { String($0.reps) }.joined(separator: ",")
        let weights = sets.map { String(Int($0.weight.rounded())) }.joined(separator: ",")
        return "\(reps) @ \(weights)"
    }

    /// "5,5,5@225" — the compact clipboard form, matching `formatSetsForClipboard` in the same
    /// web file: work sets only (what the web copies with warmup off), and a single weight when
    /// every set shares it, else the positional list.
    var setsClipboard: String {
        let work = sets.filter(\.isWorkSet)
        guard !work.isEmpty else { return "—" }
        let reps = work.map { String($0.reps) }.joined(separator: ",")
        let weights = work.map { String(Int($0.weight.rounded())) }
        return "\(reps)@\(Swift.Set(weights).count == 1 ? weights[0] : weights.joined(separator: ","))"
    }
}

extension LiftingWorkoutDoc.Exercise.Set {
    init(data: [String: Any]) {
        order = (data["order"] as? NSNumber)?.intValue ?? 0
        weight = (data["weight"] as? NSNumber)?.doubleValue ?? 0
        reps = (data["reps"] as? NSNumber)?.intValue ?? 0
        isWorkSet = (data["isWorkSet"] as? NSNumber)?.boolValue ?? true
        // `isPR` rides along on the same sets but carries nothing `prTier` doesn't; the pipeline
        // writes them together, so the tier alone is the whole flag.
        prTier = (data["prTier"] as? String).flatMap(PrTier.init(rawValue:))
    }
}
