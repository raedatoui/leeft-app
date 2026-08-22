import SwiftUI

/// The `done` phase: confirm duration, rate the session, save.
struct DoneView: View {
    @Environment(SessionModel.self) private var session

    @State private var durationText = ""
    @FocusState private var durationFocused: Bool

    private let store = WorkoutStore()

    /// What the timer measured, as the prefill and the fallback.
    private var timerMinutes: Int { max(1, Int((session.elapsed / 60).rounded())) }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Duration").tagLabel(size: 10, tracking: 1.6, color: Theme.muted)

                    durationRow

                    Text("\(session.draft.exercises.count) exercises · VOL \(Fmt.number(session.draft.volume)) · WORK \(Fmt.number(session.draft.workVolume)) lbs")
                        .font(Typeface.mono(11))
                        .foregroundStyle(Theme.muted)
                        .padding(.top, 10)

                    rpeBlock
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 24)
            }
            .scrollBounceBehavior(.basedOnSize)

            VStack(spacing: 12) {
                BigButton(
                    title: session.isSaving ? "Saving…" : "Save Session",
                    tone: .green,
                    enabled: !session.isSaving
                ) {
                    Task { await session.save(using: store) }
                }

                Button("Back to workout") { session.backToWorkout() }
                    .font(Typeface.body(15, .bold))
                    .foregroundStyle(Theme.muted)
                    .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            .padding(.bottom, 8)
        }
        .onAppear { durationText = String(session.draft.durationMin ?? timerMinutes) }
        // As a pager page this view exists (and onAppear fires) while live is still on
        // screen; re-prime the prefill at the moment the swipe/tap actually lands here,
        // once finishWorkout has frozen the clock.
        .onChange(of: session.draft.phase) { _, phase in
            if phase == .done { durationText = String(session.draft.durationMin ?? timerMinutes) }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { durationFocused = false }
                    .font(Typeface.body(15, .bold))
                    .foregroundStyle(Theme.maint)
            }
        }
    }

    /// Editable minutes, prefilled from the timer. Kept as raw text while focused so the
    /// field can sit empty mid-retype instead of snapping back to the timer number.
    private var durationRow: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            TextField("\(timerMinutes)", text: $durationText)
                .font(Typeface.display(56))
                .foregroundStyle(Theme.fg)
                .keyboardType(.numberPad)
                .focused($durationFocused)
                .fixedSize()
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(Theme.muted2)
                        .frame(height: 1)
                        .offset(y: 2)
                }
                .onChange(of: durationText) { _, new in
                    if let value = Int(new), value > 0 { session.draft.durationMin = value }
                }
                .onChange(of: durationFocused) { _, focused in
                    // Left empty or invalid on exit — fall back to the timer (nil = auto).
                    guard !focused else { return }
                    if Int(durationText) ?? 0 <= 0 {
                        session.draft.durationMin = nil
                        durationText = String(timerMinutes)
                    }
                }

            Text("min")
                .font(Typeface.mono(14))
                .foregroundStyle(Theme.muted)

            Text("timer \(Fmt.clock(session.elapsed))")
                .font(Typeface.mono(11))
                .foregroundStyle(Theme.muted2)
        }
        .padding(.top, 6)
    }

    private var rpeBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("How hard was that session?")
                .font(Typeface.body(14, .semibold))
                .foregroundStyle(Theme.fg)
                .padding(.bottom, 10)

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(session.draft.rpe)")
                    .font(Typeface.display(40))
                    .foregroundStyle(Theme.rpe[session.draft.rpe - 1])
                    .contentTransition(.numericText())

                Text(RPE.words[session.draft.rpe] ?? "")
                    .font(Typeface.mono(12))
                    .foregroundStyle(Theme.muted)
            }
            .animation(.snappy(duration: 0.15), value: session.draft.rpe)

            Slider(
                value: Binding(
                    get: { Double(session.draft.rpe) },
                    set: { session.draft.rpe = Int($0.rounded()) }
                ),
                in: 1...10,
                step: 1
            )
            .tint(Theme.rpe[session.draft.rpe - 1])
            .padding(.top, 8)

            HStack {
                Text("1 · easy").tagLabel(size: 9, tracking: 0.7)
                Spacer()
                Text("10 · max effort").tagLabel(size: 9, tracking: 0.7)
            }
        }
        .padding(.top, 32)
    }
}
