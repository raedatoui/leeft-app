import SwiftUI

/// `.app-bar` — brand mark, live clock, session date, discard.
struct AppBar: View {
    @Environment(SessionModel.self) private var session
    @Binding var showDiscardConfirm: Bool

    var body: some View {
        HStack(spacing: 10) {
            // 🏋️ LEEFT 🏋️ is the sitewide brand mark; the app bar uses the short form.
            HStack(spacing: 4) {
                Text("🏋️")
                Text("LEEFT")
                    .font(Typeface.display(15))
                    .tracking(0.9)
                    .foregroundStyle(Theme.maint)
            }

            Spacer(minLength: 8)

            if session.draft.phase == .live, session.draft.startedAt != nil {
                LiveClock()
            }

            DatePicker("", selection: dateBinding, displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                .font(Typeface.mono(11))
                .fixedSize()
                // The draft's date key is UTC. Without this the picker renders UTC midnight
                // in local time and shows the previous day west of Greenwich — the same
                // off-by-one the web app guards against by formatting with getUTC* methods.
                .environment(\.timeZone, TimeZone(identifier: "UTC")!)

            if session.draft.phase != .pre {
                Button {
                    showDiscardConfirm = true
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 24, height: 24)
                        .overlay(Circle().strokeBorder(Theme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.borderSoft).frame(height: 1)
        }
    }

    /// The draft stores a UTC `YYYY-MM-DD` key; DatePicker wants a Date.
    private var dateBinding: Binding<Date> {
        Binding(
            get: { Fmt.dateKey.date(from: session.draft.date) ?? Date() },
            set: { session.draft.date = Fmt.dateKey.string(from: $0) }
        )
    }
}

/// `.clock` — elapsed session time with the pulsing record dot.
struct LiveClock: View {
    @Environment(SessionModel.self) private var session
    @State private var now = Date()
    @State private var pulsing = false

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(Theme.hyper)
                .frame(width: 8, height: 8)
                .opacity(pulsing ? 0.25 : 1)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulsing)

            Text(Fmt.clock(elapsed))
                .font(Typeface.mono(14, .semibold))
                .foregroundStyle(Theme.fg)
                .monospacedDigit()
        }
        .onAppear { pulsing = true }
        .onReceive(tick) { now = $0 }
    }

    private var elapsed: TimeInterval {
        guard let started = session.draft.startedAt else { return 0 }
        return now.timeIntervalSince(started)
    }
}
