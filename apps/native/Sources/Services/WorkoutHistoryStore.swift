import FirebaseFirestore
import Foundation
import Observation

/// Reads the History tab's data out of `lifting-history` — the full lifting log, every day
/// since 2020, published by the data pipeline (`bun firestore:backfill`). Deliberately NOT
/// `lifting-workouts`, which is the write store this app and the web `/add` flow post to;
/// write-side counterpart is `WorkoutStore`.
///
/// The whole collection comes down in one `getDocuments()` — around 830 documents — and stays
/// in memory, which is what lets the list scroll without paging seams. The cost is that a
/// session logged today does not appear here until the pipeline next republishes.
@Observable
final class WorkoutHistoryStore {
    private(set) var workouts: [LiftingWorkoutDoc] = []
    private(set) var isLoading = false
    private(set) var error: String?
    /// Distinguishes "not fetched yet" from "fetched, and there's nothing there".
    private(set) var hasLoaded = false

    private var db: Firestore { Firestore.firestore() }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let snapshot = try await db.collection("lifting-history").getDocuments()
            // Newest first. Sorted here rather than by the query: the day key sorts
            // lexicographically the same as chronologically, and this keeps the read a
            // plain collection fetch with no index to maintain.
            workouts = snapshot.documents
                .compactMap { LiftingWorkoutDoc(id: $0.documentID, data: $0.data()) }
                .sorted { $0.dateKey > $1.dateKey }
            error = nil
        } catch {
            // Anything already loaded stays on screen; the message is for a cold failure.
            self.error = Self.errorMessage(error)
        }
        hasLoaded = true
    }

    /// The read-side twin of `WorkoutStore.errorMessage`.
    private static func errorMessage(_ error: Error) -> String {
        switch FirestoreErrorCode.Code(rawValue: (error as NSError).code) {
        case .permissionDenied: return "Not authorized to read workouts"
        default: return "Couldn't load workouts — check your connection"
        }
    }
}
