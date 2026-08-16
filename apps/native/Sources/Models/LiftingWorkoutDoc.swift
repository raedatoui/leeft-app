import Foundation

/// The Firestore doc shape at `lifting-workouts/{YYYY-MM-DD}`.
///
/// This is a **cross-language contract**: `apps/data/src/firestore/download.ts` decodes it
/// over the REST API, and its decoder deliberately handles no Timestamp values — so every
/// temporal field here is an ISO 8601 string, never a `Date`. Keep this in step with
/// `LiftingWorkoutDoc` in `apps/web/src/lib/firebase.ts`.
struct LiftingWorkoutDoc {
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

    struct Exercise {
        let exerciseId: Int
        let order: Int
        let sets: [Set]
        let volume: Double
        let workVolume: Double

        struct Set {
            let order: Int
            let weight: Double
            let reps: Int
            let isWorkSet: Bool
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
