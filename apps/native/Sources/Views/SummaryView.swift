import SwiftUI

/// Post-save recap of the snapshot captured by `SessionModel.save` — the draft underneath
/// is already cleared by the time this appears. Records/PR lines are out of scope here,
/// so this is the stat block plus a native share sheet.
struct SummaryView: View {
    @Environment(SessionModel.self) private var session

    let summary: SessionModel.Summary

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Saved").tagLabel(size: 10, tracking: 1.6, color: Theme.strength)
                Spacer()
                Button {
                    session.summary = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 28, height: 28)
                        .overlay(Circle().strokeBorder(Theme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            ScrollView {
                VStack(spacing: 0) {
                    Text(summary.date)
                        .font(Typeface.mono(12))
                        .foregroundStyle(Theme.muted)
                        .padding(.top, 24)

                    Text(Fmt.number(summary.volume))
                        .font(Typeface.display(64))
                        .foregroundStyle(Theme.maint)
                        .contentTransition(.numericText())

                    Text("lbs total volume").tagLabel(size: 10, tracking: 1.6, color: Theme.muted)

                    statGrid.padding(.top, 32)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
            }

            ShareLink(item: shareText) {
                Text("Share")
                    .font(Typeface.display(18))
                    .tracking(1.8)
                    .foregroundStyle(Theme.bg)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Theme.maint, in: .rect(cornerRadius: 13, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .sessionBackground()
    }

    private var statGrid: some View {
        VStack(spacing: 0) {
            statRow("Exercises", "\(summary.completedExercises)/\(summary.exerciseCount)", Theme.breakBlue)
            statRow("Sets", "\(summary.setCount)", Theme.fg)
            statRow("Reps", "\(summary.repCount)", Theme.fg)
            statRow("Duration", "\(summary.minutes) min", Theme.fg)
            statRow("Intensity", "\(summary.rpe)/10", Theme.rpe[summary.rpe - 1])
            if let readiness = summary.readinessAvg {
                statRow("Readiness", String(format: "%.1f/5", readiness), Theme.strength)
            }
        }
    }

    private func statRow(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Text(label).tagLabel(size: 10, tracking: 1.4, color: Theme.muted)
            Spacer()
            Text(value)
                .font(Typeface.mono(15, .semibold))
                .foregroundStyle(color)
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }

    /// Mirrors the web's copy-to-clipboard recap, minus the record lines.
    private var shareText: String {
        var lines = [
            "🏋️ LEEFT — \(summary.date)",
            "\(Fmt.number(summary.volume)) lb · \(summary.exerciseCount) exercises · \(summary.setCount) sets · \(summary.repCount) reps",
        ]
        var third = "\(summary.minutes) min · intensity \(summary.rpe)/10"
        if let readiness = summary.readinessAvg {
            third += String(format: " · readiness %.1f/5", readiness)
        }
        lines.append(third)
        return lines.joined(separator: "\n")
    }
}
