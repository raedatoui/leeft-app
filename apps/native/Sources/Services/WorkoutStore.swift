import FirebaseFirestore
import Foundation

/// Writes sessions to `lifting-workouts/{YYYY-MM-DD}`, the collection
/// `apps/data/src/firestore/download.ts` pulls into the pipeline.
struct WorkoutStore {
    private var db: Firestore { Firestore.firestore() }

    /// Overwrites the day's doc but keeps its uuid stable across re-saves, so downstream
    /// pipeline artifacts (PRs, cycles) don't see a re-logged day as a new workout.
    /// Same read-before-write as `saveLiftingWorkout` in apps/web/src/lib/firebase.ts.
    func save(dateKey: String, doc: LiftingWorkoutDoc) async throws {
        let ref = db.collection("lifting-workouts").document(dateKey)
        let existing = try await ref.getDocument()
        let uuid = (existing.data()?["uuid"] as? String) ?? UUID().uuidString.lowercased()

        var data = doc.firestoreData
        data["uuid"] = uuid
        try await ref.setData(data)
    }

    /// Maps the failure modes worth naming; everything else gets the generic retry line.
    /// Mirrors `saveErrorMessage` on the web.
    func errorMessage(_ error: Error) -> String {
        let code = FirestoreErrorCode.Code(rawValue: (error as NSError).code)
        switch code {
        case .permissionDenied: return "Not authorized to save workouts"
        case .unavailable, .deadlineExceeded: return "Save failed — check your connection and retry"
        default: return "Save failed — check your connection and retry"
        }
    }
}
