import Charts
import SwiftUI

/// Metric-over-time for one exercise on one basis — the Swift Charts twin of
/// apps/web/src/components/charts/exercisePRChart.tsx.
///
/// The x axis plots the session's *index*, not its date, matching the web's Highcharts category
/// axis: every session gets one tick and a layoff takes up no width. A real date axis is the more
/// literal chart, but over a six-year log it spends most of its width on the months you weren't
/// training and draws a flat line across each one.
///
/// The line and fill are neutral, so the only colour on the canvas is a PR star. And a drag
/// scrubs rather than selecting a range to filter by: on a phone, reading the run is worth more
/// than a second way to zoom, which the range presets already do.
struct ExercisePRChart: View {
    let sessions: [ExerciseSession]
    let prMarks: [ExerciseAnalyticsModel.PRMark]
    let metricName: String
    let unit: SetUnit
    let showsLbs: Bool
    let yDomain: ClosedRange<Double>
    let onOpen: (ExerciseSession) -> Void

    /// Live only while a finger is down — chartXSelection clears it on release.
    @State private var rawSelection: Int?
    /// Where the last scrub landed, so letting go inspects that session instead of snapping back
    /// to the most recent one.
    @State private var pinnedIndex: Int?

    /// The sheet's horizontal gutter, which the scrub card cancels out to run edge to edge.
    static let bleed: CGFloat = 18

    /// Clamped on read: a selection can land outside the data, and a pinned index outlives the
    /// filter change that shortened the series.
    private var focusedIndex: Int? {
        guard !sessions.isEmpty else { return nil }
        let raw = rawSelection ?? pinnedIndex ?? sessions.count - 1
        return Swift.min(Swift.max(raw, 0), sessions.count - 1)
    }

    private var focused: ExerciseSession? { focusedIndex.map { sessions[$0] } }

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
            ForEach(Array(sessions.enumerated()), id: \.element.id) { index, session in
                // yStart pins the fill to the domain floor. A plain `y:` AreaMark fills down to
                // zero, and this domain starts near the data — so the fill ran off the bottom of
                // the plot and painted over everything beneath the chart. Highcharts avoids the
                // same thing with `threshold: null`.
                AreaMark(
                    x: .value("Session", index),
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

                LineMark(x: .value("Session", index), y: .value(metricName, session.metric))
                    .interpolationMethod(.monotone)
                    .lineStyle(StrokeStyle(lineWidth: 1.5, lineJoin: .round))
                    .foregroundStyle(Theme.fg)
            }

            // The web's small markers. Dropped once the run is dense enough that they'd merge into
            // the line, and the reason a one-session chart still renders as something: a lone
            // Line/AreaMark draws nothing at all.
            if sessions.count <= 60 {
                ForEach(Array(sessions.enumerated()), id: \.element.id) { index, session in
                    PointMark(x: .value("Session", index), y: .value(metricName, session.metric))
                        .symbolSize(sessions.count == 1 ? 44 : 16)
                        .foregroundStyle(Theme.muted)
                }
            }

            // Stars last so they sit above the line they mark.
            ForEach(prMarks) { mark in
                PointMark(x: .value("Session", mark.index), y: .value(metricName, mark.session.metric))
                    .foregroundStyle(mark.tier.color)
                    .symbol {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(mark.tier.color)
                            // Reads against the line it usually sits on top of.
                            .shadow(color: Theme.bg, radius: 1.5)
                    }
            }

            if let focusedIndex, let focused {
                RuleMark(x: .value("Session", focusedIndex))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(Theme.border)
                PointMark(x: .value("Session", focusedIndex), y: .value(metricName, focused.metric))
                    .symbolSize(64)
                    .foregroundStyle(Theme.fg)
            }
        }
        .chartXSelection(value: $rawSelection)
        .onChange(of: rawSelection) { _, new in if let new { pinnedIndex = new } }
        // An index means nothing once the series behind it changes length, so drop the pin rather
        // than let it point at some unrelated session — the same bug the web hit reading chart
        // indices against the wrong array.
        .onChange(of: sessions.count) { _, _ in pinnedIndex = nil }
        .chartYScale(domain: yDomain)
        .chartXAxis {
            AxisMarks(values: tickIndices) { value in
                AxisGridLine().foregroundStyle(Theme.border.opacity(0.4))
                AxisValueLabel {
                    if let index = value.as(Int.self), sessions.indices.contains(index) {
                        Text(Fmt.tableDate.string(from: sessions[index].day))
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
        .frame(height: 220)
    }

    /// Four evenly spaced ticks by position. An index axis has no natural tick stride, and one
    /// label per session would be unreadable at this width.
    private var tickIndices: [Int] {
        guard sessions.count > 1 else { return sessions.isEmpty ? [] : [0] }
        let count = Swift.min(4, sessions.count)
        let step = Double(sessions.count - 1) / Double(count - 1)
        return (0..<count).map { Int((Double($0) * step).rounded()) }
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
