import SwiftUI

/// `.btn-big` — the full-width primary action. Yellow by default, green for the
/// "commit" actions (Done Working Out, Save Session), muted when disabled.
struct BigButton: View {
    enum Tone { case yellow, green }

    let title: String
    var tone: Tone = .yellow
    var enabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Typeface.display(18))
                .tracking(1.8)
                .foregroundStyle(Theme.bg)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(enabled ? (tone == .green ? Theme.strength : Theme.maint) : Theme.muted2)
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

/// `.chk` — the round set-complete toggle. Fills green when on.
struct CheckCircle: View {
    let isOn: Bool
    var glyph: String = "✓"
    var size: CGFloat = 42
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(glyph)
                .font(.system(size: glyph.count > 1 ? 12 : 16, weight: .heavy))
                .tracking(glyph.count > 1 ? -3 : 0)
                .foregroundStyle(isOn ? Theme.bg : Theme.muted2)
                .frame(width: size, height: size)
                .background(isOn ? Theme.strength : .clear, in: .circle)
                .overlay(Circle().strokeBorder(isOn ? Theme.strength : Theme.border, lineWidth: 2))
        }
        .buttonStyle(.plain)
    }
}

/// `.ctl-circle` — outlined yellow circle used for add/remove set and sheet close.
struct ControlCircle: View {
    /// SF Symbol name — a text glyph like "⌄" carries baseline metrics that sit it off
    /// visual center in the circle; symbols are optically centered by design.
    let symbol: String
    var size: CGFloat = 46
    var enabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size > 40 ? 18 : 13, weight: .semibold))
                .foregroundStyle(Theme.maint)
                .frame(width: size, height: size)
                .overlay(Circle().strokeBorder(Theme.maint, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .opacity(enabled ? 1 : 0.3)
        .disabled(!enabled)
    }
}

/// `.num-box` — the centered mono reps/weight field.
///
/// Keeps its own text state rather than formatting the bound number back on every
/// keystroke: rendering the parsed value would eat the trailing "." while typing a
/// decimal like 132.5, the same reason the web carries a separate `weightText`.
struct NumBox<Field: Hashable>: View {
    @Binding var value: Double
    let field: Field
    var focus: FocusState<Field?>.Binding
    /// What the column counts, which decides how the value reads and which pad it needs.
    var unit: SetUnit = .lb

    @State private var text = ""

    var body: some View {
        TextField("0", text: $text)
            .font(Typeface.mono(20, .semibold))
            .foregroundStyle(Theme.fg)
            .multilineTextAlignment(.center)
            // One pad for both boxes. Reps only ever need digits, but swapping the input
            // view between a numberPad and a decimalPad as focus walks a row is what leaves
            // you on a pad with no "." when you reach the weight — so the decimal pad serves
            // both, and a decimal typed into reps is truncated by its binding.
            // One pad for both boxes, except a duration — "1:30" needs a colon the decimal pad
            // doesn't carry.
            .keyboardType(unit == .time ? .numbersAndPunctuation : .decimalPad)
            .focused(focus, equals: field)
            .frame(height: 54)
            .frame(maxWidth: .infinity)
            .background(Theme.surface2, in: .rect(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(focus.wrappedValue == field ? Theme.muted2 : Theme.border, lineWidth: 1)
            )
            .onChange(of: text) { _, new in
                value = unit.parse(new.replacingOccurrences(of: ",", with: "."))
            }
            .onChange(of: value) { _, new in
                // Only re-render from the model while the box isn't being typed into.
                guard focus.wrappedValue != field else { return }
                text = display(new)
            }
            .onAppear { text = display(value) }
    }

    private func display(_ v: Double) -> String {
        v == 0 ? "" : (unit == .time ? unit.format(v) : Fmt.weight(v))
    }
}

/// `.ex-dot` — the muscle-group color dot.
struct MuscleDot: View {
    let group: String?
    var size: CGFloat = 12

    var body: some View {
        Circle()
            .fill(Theme.muscleGroupColor(group))
            .frame(width: size, height: size)
    }
}

/// `.ex-badge` — the lettered circle at the head of an exercise row.
struct ExerciseBadge: View {
    let index: Int
    let group: String?

    var body: some View {
        Text(String(UnicodeScalar(65 + min(index, 25))!))
            .font(Typeface.body(17, .bold))
            .foregroundStyle(Theme.bg)
            .frame(width: 42, height: 42)
            .background(Theme.muscleGroupColor(group), in: .circle)
    }
}

/// `.seg` / `.seg-btn` — the segmented control from v2.css. Binds an *optional* value on
/// purpose: on the exercise page a one-rep-max formula is picked from a menu, and while one is
/// active no metric segment is selected, which is what makes the menu read as the current choice.
struct SegControl<Value: Hashable>: View {
    let options: [Value]
    let label: (Value) -> String
    @Binding var selection: Value?

    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                let active = option == selection
                Button { selection = option } label: {
                    Text(label(option))
                        .font(Typeface.mono(11, active ? .semibold : .regular))
                        .tracking(1.1)
                        .textCase(.uppercase)
                        .foregroundStyle(active ? Theme.maint : Theme.muted)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(active ? Theme.bg : .clear, in: .capsule)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Theme.surface2, in: .capsule)
        .overlay(Capsule().strokeBorder(Theme.borderSoft, lineWidth: 1))
    }
}

/// The pill that fronts a menu or opens a sheet — the shape `.select.sm` takes in v2, with a
/// trailing chevron so it reads as something that opens.
struct PillButton: View {
    let title: String
    var tint: Color = Theme.breakBlue
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            label
        }
        .buttonStyle(.plain)
    }

    /// Exposed so a `Menu` can borrow the same chrome for its label.
    var label: some View {
        HStack(spacing: 5) {
            Text(title)
                .font(Typeface.mono(11, .semibold))
                .tracking(1.1)
                .textCase(.uppercase)
            Image(systemName: "chevron.down")
                .font(.system(size: 8, weight: .bold))
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 11)
        .padding(.vertical, 7)
        .background(Theme.surface2, in: .capsule)
        .overlay(Capsule().strokeBorder(Theme.borderSoft, lineWidth: 1))
    }
}

/// `.toast` — transient confirmation over the current screen.
struct ToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(Typeface.mono(12, .semibold))
            .foregroundStyle(Theme.fg)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Theme.surface2, in: .capsule)
            .overlay(Capsule().strokeBorder(Theme.border, lineWidth: 1))
            .shadow(color: .black.opacity(0.45), radius: 18, y: 6)
            .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

/// `.actions-divider` — a centered "or" between two hairlines.
struct OrDivider: View {
    var body: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Theme.borderSoft).frame(height: 1)
            Text("or").tagLabel(size: 10, tracking: 1.4)
            Rectangle().fill(Theme.borderSoft).frame(height: 1)
        }
    }
}

extension View {
    /// The page background used by every screen in the flow.
    func sessionBackground() -> some View {
        background(Theme.bg.ignoresSafeArea())
    }

    /// Parks the caret at the end of every text field as it takes focus, app-wide.
    ///
    /// The number boxes are far wider than their digits and centre them, so UIKit's own
    /// placement — wherever the tap landed — drops the caret to the left of the number as
    /// often as not, ahead of the digits you meant to backspace over. The async hop is
    /// what makes this stick: UIKit sets its own selection right after posting the
    /// notification. Attached once at the root, since the notification is app-wide.
    func caretAtEndOnFocus() -> some View {
        onReceive(NotificationCenter.default.publisher(for: UITextField.textDidBeginEditingNotification)) { note in
            guard let field = note.object as? UITextField else { return }
            DispatchQueue.main.async {
                field.selectedTextRange = field.textRange(from: field.endOfDocument, to: field.endOfDocument)
            }
        }
    }
}
