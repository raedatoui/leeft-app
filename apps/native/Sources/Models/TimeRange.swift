import Foundation

/// The window the exercise page plots over. Hand-mirrored from `apps/web/src/lib/timeRange.ts`,
/// minus its `custom` case — on the web a chart drag selects a range, here a drag scrubs.
enum TimeRange: String, CaseIterable, Identifiable, Hashable {
    case sevenDays = "7D"
    case thirtyDays = "30D"
    case yearToDate = "YTD"
    case all = "MAX"

    var id: String { rawValue }

    /// Every date in this app is a UTC day key, so the window boundaries are too. A device
    /// calendar would move them a day west of Greenwich — the same off-by-one CLAUDE.md warns
    /// about for `DatePicker`.
    static let utc: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        calendar.locale = Locale(identifier: "en_US_POSIX")
        return calendar
    }()

    var resolved: ResolvedTimeRange {
        switch self {
        case .sevenDays: ResolvedTimeRange(start: Self.rollingStart(days: 7), end: nil)
        case .thirtyDays: ResolvedTimeRange(start: Self.rollingStart(days: 30), end: nil)
        case .yearToDate:
            ResolvedTimeRange(
                start: Self.utc.date(from: DateComponents(year: Self.utc.component(.year, from: .now), month: 1, day: 1)),
                end: nil
            )
        case .all: ResolvedTimeRange(start: nil, end: nil)
        }
    }

    /// `days - 1` back from UTC midnight today, so the window includes today.
    private static func rollingStart(days: Int) -> Date? {
        utc.date(byAdding: .day, value: -(days - 1), to: utc.startOfDay(for: .now))
    }
}

/// A resolved window. A nil bound is unbounded on that side, so `all` is nil on both — which is
/// also how the star rule recognises an unfiltered view.
struct ResolvedTimeRange {
    let start: Date?
    let end: Date?

    var isUnbounded: Bool { start == nil && end == nil }

    func contains(_ date: Date) -> Bool {
        if let start, date < start { return false }
        if let end, date > end { return false }
        return true
    }
}
