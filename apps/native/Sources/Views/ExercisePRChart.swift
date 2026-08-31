import Charts
import SwiftUI

/// Metric-over-time for one exercise on one basis — the Swift Charts twin of
/// apps/web/src/components/charts/exercisePRChart.tsx.
///
/// Two deliberate departures from the web. The line and fill are neutral, so the only colour on
/// the canvas is a PR star and a gold point means something. And a drag scrubs rather than
/// selecting a range to filter by: on a phone, reading the run is worth more than a second way to
/// zoom, which the range presets already do.
struct ExercisePRChart: View {
    let sessions: [ExerciseSession]
    let prSessions: [ExerciseSession]
    let metricName: String
    let unit: SetUnit
    let showsLbs: Bool
    let yDomain: ClosedRange<Double>
    let nearest: (Date) -> ExerciseSession?
    let onOpen: (ExerciseSession) -> Void

    /// Live only while a finger is down — chartXSelection clears it on release.
    @State private var rawSelection: Date?
    /// Where the last scrub landed, so letting go inspects that session instead of snapping back
    /// to the most recent one. Stored as a day rather than a session so it re-resolves through
    /// `nearest` after a filter change, instead of pinning a row that no longer exists.
    @State private var pinnedDay: Date?

    /// The scrubbed session, the last one scrubbed to, else the most recent — the web's
    /// `hoveredSession ?? chartSessions.at(-1)`, with the middle term added because a touch has
    /// no equivalent of the cursor simply resting where you left it.
    private var focused: ExerciseSession? {
        (rawSelection ?? pinnedDay).flatMap(nearest) ?? sessions.last
    }

    /// The sheet's horizontal gutter, which the scrub card cancels out to run edge to edge.
    static let bleed: CGFloat = 18

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            chart
            if let focused {
                SessionScrubCard(session: focused, metricName: metricName, unit: unit, showsLbs: showsLbs, onOpen: onOpen)
                    .padding(.horizontal, -Self.bleed)
            }
        }
    }

    private var chart: some View {
        Chart {
            ForEach(sessions) { session in
                // yStart pins the fill to the domain floor. A plain `y:` AreaMark fills down to
                // zero, and this domain starts near the data — so the fill ran off the bottom of
                // the plot and painted over everything beneath the chart. Highcharts avoids the
                // same thing with `threshold: null`.
                AreaMark(
                    x: .value("Date", session.day),
                    yStart: .value(metricName, yDomain.lowerBound),
                    yEnd: .value(metricName, session.metric)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(
                    .linearGradient(
                        Gradient(colors: [Theme.fg.opacity(0.16), Theme.fg.opacity(0.02)]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

                LineMark(x: .value("Date", session.day), y: .value(metricName, session.metric))
                    .interpolationMethod(.monotone)
                    .lineStyle(StrokeStyle(lineWidth: 1.5, lineJoin: .round))
                    .foregroundStyle(Theme.fg)
            }

            // The web's small markers. Dropped once the run is dense enough that they'd merge into
            // the line, and the reason a one-session chart still renders as something: a lone
            // Line/AreaMark draws nothing at all.
            if sessions.count <= 60 {
                ForEach(sessions) { session in
                    PointMark(x: .value("Date", session.day), y: .value(metricName, session.metric))
                        .symbolSize(sessions.count == 1 ? 44 : 16)
                        .foregroundStyle(Theme.muted)
                }
            }

            // Stars last so they sit above the line they mark.
            ForEach(prSessions) { session in
                if let tier = session.prTier {
                    PointMark(x: .value("Date", session.day), y: .value(metricName, session.metric))
                        .foregroundStyle(tier.color)
                        .symbol {
                            Image(systemName: "star.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(tier.color)
                                // Reads against the line it usually sits on top of.
                                .shadow(color: Theme.bg, radius: 1.5)
                        }
                }
            }

            if let focused {
                RuleMark(x: .value("Date", focused.day))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(Theme.border)
                PointMark(x: .value("Date", focused.day), y: .value(metricName, focused.metric))
                    .symbolSize(64)
                    .foregroundStyle(Theme.fg)
            }
        }
        .chartXSelection(value: $rawSelection)
        .onChange(of: rawSelection) { _, new in if let new { pinnedDay = new } }
        .chartYScale(domain: yDomain)
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { value in
                AxisGridLine().foregroundStyle(Theme.border.opacity(0.4))
                AxisValueLabel {
                    if let day = value.as(Date.self) {
                        Text(Fmt.monthTick.string(from: day))
                            .font(Typeface.mono(10))
                            .foregroundStyle(Theme.muted2)
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
                // The dash goes in the initializer — AxisMark has no .lineStyle modifier.
                AxisGridLine(stroke: StrokeStyle(lineWidth: 1, dash: [2, 4]))
                    .foregroundStyle(Theme.border)
                AxisValueLabel {
                    if let raw = value.as(Double.self) {
                        Text(unit == .time ? unit.format(raw) : Fmt.number(raw))
                            .font(Typeface.mono(10))
                            .foregroundStyle(Theme.muted2)
                    }
                }
            }
        }
        // Days are UTC midnight. Without this the tick generator snaps to *local* calendar
        // boundaries and labels a UTC "Aug 27" session "Aug 26" west of Greenwich — the
        // off-by-one CLAUDE.md warns about, in its chart form.
        .environment(\.timeZone, TimeZone(identifier: "UTC")!)
        .environment(\.calendar, TimeRange.utc)
        .frame(height: 220)
    }
}

/// The scrub readout, and the way into the full day. It is the tap target rather than the chart
/// itself: `chartXSelection` installs its own tap-and-drag recogniser over the plot, so a second
/// gesture there is arbitration roulette.
private struct SessionScrubCard: View {
    let session: ExerciseSession
    let metricName: String
    let unit: SetUnit
    let showsLbs: Bool
    let onOpen: (ExerciseSession) -> Void

    var body: some View {
        Button { onOpen(session) } label: {
            VStack(spacing: 6) {
                HStack(spacing: 8) {
                    Text(Fmt.tableDate.string(from: session.day))
                        .tagLabel(size: 11, tracking: 1.2)
                    if let tier = session.prTier {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(tier.color)
                    }
                }

                Text(value)
                    .font(Typeface.mono(26, .semibold))
                    .foregroundStyle(Theme.maint)

                Text(metricName)
                    .tagLabel(size: 9, tracking: 1.4)

                HStack(spacing: 6) {
                    Text(detail)
                        .font(Typeface.mono(12))
                        .foregroundStyle(Theme.muted)
                        .lineLimit(1)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Theme.muted2)
                }
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .padding(.horizontal, 18)
            .background(Theme.surface)
            // Hairlines rather than a rounded border: the card has no side edges to round.
            .overlay(alignment: .top) { Rectangle().fill(Theme.border).frame(height: 1) }
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.border).frame(height: 1) }
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens this day's sets")
    }

    /// The " lbs" suffix rides only on the plain max-weight metric — an estimate or a tonnage sum
    /// is not a weight that was lifted. Same rule as the web's session table.
    private var value: String {
        session.loaded ? Fmt.number(session.metric) + (showsLbs ? " lbs" : "") : unit.format(session.metric)
    }

    private var detail: String {
        guard session.loaded, let top = session.topSet else { return session.exercise.setsSummary }
        return "\(Fmt.weight(top.weight)) × \(Fmt.weight(top.reps)) · \(session.workSetCount) work sets"
    }
}
