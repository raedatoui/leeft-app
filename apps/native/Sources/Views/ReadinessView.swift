import SwiftUI

/// The `pre` phase: the 5-question, 1–5 readiness survey gating the start of a session.
struct ReadinessView: View {
    @Environment(SessionModel.self) private var session

    private var alreadyStarted: Bool { session.draft.startedAt != nil }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Readiness survey")
                        .tagLabel(size: 10, tracking: 1.4, color: Theme.muted)
                        .padding(.top, 8)

                    ForEach(ReadinessQuestion.all) { question in
                        questionBlock(question)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            }
            .scrollBounceBehavior(.basedOnSize)

            BigButton(
                title: alreadyStarted ? "Resume Workout" : "Start Workout",
                enabled: session.canStartWorkout
            ) {
                session.startWorkout()
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    private func questionBlock(_ question: ReadinessQuestion) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(question.label)
                .font(Typeface.body(14, .semibold))
                .foregroundStyle(Theme.fg)
                .padding(.bottom, 8)

            HStack(spacing: 6) {
                ForEach(1...5, id: \.self) { value in
                    let isOn = session.draft.readiness[question.key] == value
                    Button {
                        session.draft.readiness[question.key] = value
                    } label: {
                        Text("\(value)")
                            .font(Typeface.mono(15, isOn ? .bold : .regular))
                            .foregroundStyle(isOn ? Theme.bg : Theme.scale[value - 1])
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(
                                isOn ? Theme.scale[value - 1] : Theme.surface2,
                                in: .rect(cornerRadius: 10, style: .continuous)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .strokeBorder(isOn ? .clear : Theme.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .animation(.snappy(duration: 0.12), value: session.draft.readiness)

            HStack {
                Text(question.lo).tagLabel(size: 9, tracking: 0.7)
                Spacer()
                Text(question.hi).tagLabel(size: 9, tracking: 0.7)
            }
            .padding(.top, 5)
        }
        .padding(.top, 20)
    }
}
