import Foundation
import Observation

/// Everything durable about an in-progress session, in one Codable blob.
///
/// The web equivalent (`StoredSession` in addWorkoutSession.tsx) also had to persist
/// *where you were* — which pager page, which sheet was open — because iOS cold-boots a
/// backgrounded PWA. A native app is not evicted mid-set, so those coordinates are gone:
/// this holds session data only.
struct Draft: Codable, Equatable {
    var phase: Phase = .pre
    var date: String = Fmt.todayUTC()
    var readiness = ReadinessAnswers()
    var startedAt: Date?
    var endedAt: Date?
    var rpe: Int = 5
    /// Manual override in minutes from the done screen; nil = derive from the timer.
    var durationMin: Int?
    var exercises: [DraftExercise] = []

    /// A blank pre-session — stored as file absence, so a fresh install and a discarded
    /// session look identical on disk.
    var isBlank: Bool { phase == .pre && startedAt == nil && exercises.isEmpty }

    var volume: Double { exercises.reduce(0) { $0 + $1.volume(workOnly: false) } }
    var workVolume: Double { exercises.reduce(0) { $0 + $1.volume(workOnly: true) } }
}

@Observable
final class SessionModel {
    /// Every mutation writes through. No debounce and no lifecycle-event flushing: the
    /// blob is a few KB, the write is off the main thread, and unlike a suspended
    /// webview the process is still alive to finish it.
    var draft = Draft() {
        didSet { if draft != oldValue { DraftStore.save(draft) } }
    }

    /// Post-save recap, or nil when the summary screen is closed.
    var summary: Summary?
    var toast: String?
    var isSaving = false

    private var toastTask: Task<Void, Never>?

    init() {
        if let stored = DraftStore.load() { draft = stored }
    }

    // MARK: - session lifecycle

    /// Also doubles as "resume": re-entering `live` on an already-started session leaves
    /// the clock alone.
    func startWorkout() {
        draft.phase = .live
        if draft.startedAt == nil { draft.startedAt = Date() }
    }

    func finishWorkout() {
        draft.endedAt = Date()
        draft.phase = .done
    }

    func backToWorkout() {
        draft.endedAt = nil
        draft.phase = .live
    }

    func discardSession() {
        draft = Draft()
        DraftStore.clear()
        showToast("Workout discarded")
    }

    var elapsed: TimeInterval {
        guard let started = draft.startedAt else { return 0 }
        return (draft.endedAt ?? Date()).timeIntervalSince(started)
    }

    /// What gets written as `duration`: the manual override if set, else the timer, floored at 1.
    var resolvedMinutes: Int {
        max(1, draft.durationMin ?? Int((elapsed / 60).rounded()))
    }

    // MARK: - exercises

    func addExercise(_ metadata: ExerciseMetadata) {
        draft.exercises.append(.init(exerciseId: metadata.id, name: metadata.name))
    }

    func removeExercise(at index: Int) {
        guard draft.exercises.indices.contains(index) else { return }
        draft.exercises.remove(at: index)
    }

    func moveExercises(from source: IndexSet, to destination: Int) {
        draft.exercises.move(fromOffsets: source, toOffset: destination)
    }

    // MARK: - sets

    /// New sets carry the previous set's numbers forward; the first starts blank.
    func addSet(exercise index: Int) {
        guard draft.exercises.indices.contains(index) else { return }
        let last = draft.exercises[index].sets.last
        draft.exercises[index].sets.append(
            DraftSet(reps: last?.reps ?? 0, weight: last?.weight ?? 0)
        )
    }

    func removeLastSet(exercise index: Int) {
        guard draft.exercises.indices.contains(index), !draft.exercises[index].sets.isEmpty else { return }
        draft.exercises[index].sets.removeLast()
    }

    func toggleSetDone(exercise index: Int, set setIndex: Int) {
        guard draft.exercises.indices.contains(index),
              draft.exercises[index].sets.indices.contains(setIndex) else { return }
        draft.exercises[index].sets[setIndex].done.toggle()
    }

    func toggleAllSetsDone(exercise index: Int) {
        guard draft.exercises.indices.contains(index) else { return }
        let allDone = !draft.exercises[index].sets.isEmpty && draft.exercises[index].sets.allSatisfy(\.done)
        for i in draft.exercises[index].sets.indices {
            draft.exercises[index].sets[i].done = !allDone
        }
    }

    /// Copies the value at `setIndex` into every set below it — the "⇩ fill N below" chip.
    func fillDown(exercise index: Int, from setIndex: Int, field: SetField) {
        guard draft.exercises.indices.contains(index),
              draft.exercises[index].sets.indices.contains(setIndex) else { return }
        let source = draft.exercises[index].sets[setIndex]
        for i in draft.exercises[index].sets.indices where i > setIndex {
            switch field {
            case .reps: draft.exercises[index].sets[i].reps = source.reps
            case .weight: draft.exercises[index].sets[i].weight = source.weight
            }
        }
    }

    enum SetField { case reps, weight }

    // MARK: - saving

    struct Summary: Identifiable {
        let id = UUID()
        let date: String
        let volume: Double
        let exerciseCount: Int
        let setCount: Int
        let repCount: Int
        let completedExercises: Int
        let readinessAvg: Double?
        let minutes: Int
        let rpe: Int
    }

    /// Writes the session to Firestore and, only on success, clears the draft. A failure
    /// leaves everything untouched so the Save button is a straight retry.
    func save(using store: WorkoutStore) async {
        guard let startedAt = draft.startedAt, !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        let doc = LiftingWorkoutDoc(
            uuid: "", // assigned by the store: existing docs keep theirs
            date: "\(draft.date)T00:00:00.000Z", // UTC midnight, the app's date convention
            title: draft.date,
            startedAt: LiftingWorkoutDoc.isoFormatter.string(from: startedAt),
            duration: resolvedMinutes,
            rpe: draft.rpe,
            readiness: draft.readiness.asDictionary,
            exercises: draft.exercises.enumerated().map { i, ex in
                .init(
                    exerciseId: ex.exerciseId,
                    order: i + 1,
                    sets: ex.sets.enumerated().map { j, s in
                        .init(order: j + 1, weight: s.weight, reps: s.reps, isWorkSet: s.isWorkSet)
                    },
                    volume: ex.volume(workOnly: false),
                    workVolume: ex.volume(workOnly: true)
                )
            },
            volume: draft.volume,
            workVolume: draft.workVolume
        )

        do {
            try await store.save(dateKey: draft.date, doc: doc)
        } catch {
            showToast(store.errorMessage(error))
            return
        }

        let doneSets = draft.exercises.flatMap { $0.sets.filter(\.done) }
        let answered = draft.readiness.answered
        summary = Summary(
            date: draft.date,
            volume: draft.volume,
            exerciseCount: draft.exercises.count,
            setCount: doneSets.count,
            repCount: doneSets.reduce(0) { $0 + $1.reps },
            completedExercises: draft.exercises.filter { !$0.sets.isEmpty && $0.sets.allSatisfy(\.done) }.count,
            readinessAvg: answered.isEmpty ? nil : Double(answered.reduce(0, +)) / Double(answered.count),
            minutes: resolvedMinutes,
            rpe: draft.rpe
        )
        showToast("Workout saved")

        // The session is over — clear the draft out from under the summary overlay.
        draft = Draft()
        DraftStore.clear()
    }

    func showToast(_ message: String) {
        toastTask?.cancel()
        toast = message
        toastTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(2.2))
            guard !Task.isCancelled else { return }
            self?.toast = nil
        }
    }
}
