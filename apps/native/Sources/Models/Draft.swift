import Foundation

/// Where the session is in the flow — mirrors `AddWorkoutPhase` in addWorkoutSession.tsx.
enum Phase: String, Codable {
    case pre, live, done
}

/// One logged set. `done` is a UI-only "checked off" affordance and is deliberately
/// excluded from the Firestore payload, exactly as on the web.
struct DraftSet: Codable, Identifiable, Equatable {
    var id = UUID()
    var reps: Int = 0
    var weight: Double = 0
    var isWorkSet: Bool = true
    var done: Bool = false
}

struct DraftExercise: Codable, Identifiable, Equatable {
    /// The catalog id — also the stable identity for list reordering.
    var exerciseId: Int
    /// Copied off the catalog when picked, so a restored draft can label its rows
    /// before the CDN dataset lands (or at all, offline).
    var name: String?
    var sets: [DraftSet] = []

    var id: Int { exerciseId }

    /// Only checked-off sets count — an entered but unchecked set is a plan, not work done.
    func volume(workOnly: Bool) -> Double {
        sets.reduce(0) { sum, s in
            guard s.done, !(workOnly && !s.isWorkSet) else { return sum }
            return sum + s.weight * Double(s.reps)
        }
    }

    /// TrainHeroic-style line: "3 x 12 @ 135lb" when uniform, else "10,14,14 @ 50,65,65lb".
    var summaryText: String {
        guard let first = sets.first else { return "no sets yet" }
        let reps = sets.map(\.reps)
        let weights = sets.map(\.weight)
        let uniform = reps.allSatisfy { $0 == first.reps } && weights.allSatisfy { $0 == first.weight }
        if uniform {
            return "\(sets.count) x \(first.reps) @ \(Fmt.weight(first.weight))lb"
        }
        let r = reps.map(String.init).joined(separator: ",")
        let w = weights.map(Fmt.weight).joined(separator: ",")
        return "\(r) @ \(w)lb"
    }
}

/// The 1–5 readiness survey. Unanswered questions stay nil and are stripped before the
/// Firestore write (the pipeline's decoder has no representation for undefined).
struct ReadinessAnswers: Codable, Equatable {
    var sleep: Int?
    var energy: Int?
    var motivation: Int?
    var stress: Int?
    var soreness: Int?

    subscript(key: ReadinessQuestion.Key) -> Int? {
        get {
            switch key {
            case .sleep: sleep
            case .energy: energy
            case .motivation: motivation
            case .stress: stress
            case .soreness: soreness
            }
        }
        set {
            switch key {
            case .sleep: sleep = newValue
            case .energy: energy = newValue
            case .motivation: motivation = newValue
            case .stress: stress = newValue
            case .soreness: soreness = newValue
            }
        }
    }

    /// Answered values only — the average shown on the summary card.
    var answered: [Int] { [sleep, energy, motivation, stress, soreness].compactMap { $0 } }

    var asDictionary: [String: Int] {
        var out: [String: Int] = [:]
        if let sleep { out["sleep"] = sleep }
        if let energy { out["energy"] = energy }
        if let motivation { out["motivation"] = motivation }
        if let stress { out["stress"] = stress }
        if let soreness { out["soreness"] = soreness }
        return out
    }
}

struct ReadinessQuestion: Identifiable {
    enum Key: String, CaseIterable { case sleep, energy, motivation, stress, soreness }

    let key: Key
    let label: String
    let lo: String
    let hi: String

    var id: String { key.rawValue }

    /// Copy transcribed from `READINESS_QUESTIONS` in addWorkoutConstants.ts.
    static let all: [ReadinessQuestion] = [
        .init(key: .sleep, label: "How did you sleep?", lo: "terrible", hi: "great"),
        .init(key: .energy, label: "How is your energy?", lo: "drained", hi: "charged"),
        .init(key: .motivation, label: "How motivated are you?", lo: "meh", hi: "fired up"),
        .init(key: .stress, label: "How stressed are you?", lo: "maxed out", hi: "relaxed"),
        .init(key: .soreness, label: "How sore are you?", lo: "very sore", hi: "fresh"),
    ]
}

/// RPE scale wording from `RPE_WORDS`.
enum RPE {
    static let words: [Int: String] = [
        1: "barely moving", 2: "very easy", 3: "easy", 4: "comfortable", 5: "somewhat hard",
        6: "hard-ish", 7: "hard — 3 reps left", 8: "very hard — 2 reps left", 9: "1 rep left",
        10: "max effort",
    ]
}

/// Shared number formatting — matches the web's `formatNumber` (thousands separators)
/// and its habit of printing whole weights without a trailing ".0".
enum Fmt {
    static func number(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? String(Int(value))
    }

    static func weight(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }

    /// "12:34" / "1:02:03" — the live session clock (`fmtClock`).
    static func clock(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval))
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0
            ? String(format: "%d:%02d:%02d", h, m, s)
            : String(format: "%d:%02d", m, s)
    }

    /// The app's date key convention: UTC `YYYY-MM-DD`.
    static let dateKey: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    static func todayUTC() -> String { dateKey.string(from: Date()) }

    /// "Sunday, January 1" — `formatLongDate` in apps/web/src/lib/dateFormatters.ts.
    /// UTC components, because the day key it labels is a UTC date.
    static let longDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    /// "2024" — kept beside the day-and-month title, which carries no year of its own.
    static let year: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    /// "2:42 PM" — the web's `formatTimeOfDay`, except that it pins the zone to
    /// America/New_York (a static build has no user timezone to read). On a phone the
    /// device zone *is* the user's, so wall-clock time renders local here.
    static let timeOfDay: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    /// Parses the ISO instants written into Firestore. Both writers go through
    /// `toISOString()`/`isoFormatter` and so carry fractional seconds, but a doc hand-edited
    /// in the console won't — hence the second pass.
    static func parseISO(_ value: String) -> Date? {
        guard !value.isEmpty else { return nil }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }
}
