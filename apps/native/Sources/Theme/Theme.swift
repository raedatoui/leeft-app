import SwiftUI

/// The v2 design tokens, transcribed from the `[data-theme="v2"]` block in
/// `apps/web/src/app/v2.css`. Hex values are the source of truth on both sides —
/// when one moves, move the other.
enum Theme {
    // MARK: surfaces
    static let bg = Color(hex: 0x0B0A08)
    static let surface = Color(hex: 0x14130F)
    static let surface2 = Color(hex: 0x1C1A15)
    static let border = Color(hex: 0x2A2722)
    static let borderSoft = Color(hex: 0x1F1D18)

    // MARK: text
    static let fg = Color(hex: 0xECEBE2)
    static let muted = Color(hex: 0x807A6C)
    static let muted2 = Color(hex: 0x5A5448)

    // MARK: accents
    static let strength = Color(hex: 0x19E68C)
    static let hyper = Color(hex: 0xFF3B30)
    /// `break` is a Swift keyword — the CSS token is `--break`.
    static let breakBlue = Color(hex: 0x5B9BFF)
    /// Yellow is the accent: brand mark, primary buttons, inline stat numbers.
    static let maint = Color(hex: 0xFFA000)
    static let cardio = Color(hex: 0x00D4FF)
    static let zone = Color(hex: 0xFFD60A)

    /// Readiness 1–5 scale, red → green (`SCALE_COLORS` in addWorkoutConstants.ts).
    static let scale: [Color] = [0xFF3B30, 0xFF8C42, 0xFFD60A, 0xA8DD4A, 0x19E68C].map(Color.init(hex:))

    /// RPE 1–10 slider, green → red (`RPE_COLORS`).
    static let rpe: [Color] = [
        0x19E68C, 0x4CE07B, 0x8ADA62, 0xC4D94E, 0xFFD60A,
        0xFFBF1F, 0xFFA62E, 0xFF8C42, 0xFF5F38, 0xFF3B30,
    ].map(Color.init(hex:))

    /// Muscle-group dot colors (`--mg-*`). Keys match `primaryMuscleGroup` in the
    /// exercise catalog; anything unrecognized falls back to `muted`.
    private static let muscleGroups: [String: Color] = [
        "chest": Color(hex: 0xFF6B9D),
        "back": Color(hex: 0x7AA2F7),
        "quads": Color(hex: 0x9C88FF),
        "shoulders": Color(hex: 0x19E68C),
        "hams": Color(hex: 0xFFA000),
        "biceps": Color(hex: 0xFF8C42),
        "triceps": Color(hex: 0x5B9BFF),
        "glutes": Color(hex: 0xFF3B30),
        "core": Color(hex: 0xB8B8A8),
        "calves": Color(hex: 0xC47BD2),
    ]

    static func muscleGroupColor(_ group: String?) -> Color {
        guard let group else { return muted }
        return muscleGroups[group.lowercased()] ?? muted
    }
}

/// The three v2 faces. Each falls back to a system font when the TTF isn't bundled,
/// so the app builds and runs with an empty `Resources/Fonts/` (see that folder's README).
enum Typeface {
    private static func isAvailable(_ name: String) -> Bool {
        UIFont(name: name, size: 12) != nil
    }

    /// Anton — the display face: brand mark, screen titles, big buttons.
    static func display(_ size: CGFloat) -> Font {
        isAvailable("Anton-Regular")
            ? .custom("Anton-Regular", fixedSize: size)
            : .system(size: size, weight: .heavy)
    }

    /// DM Sans — body copy, labels, list rows.
    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        let name =
            switch weight {
            case .bold, .heavy, .black: "DMSans-Bold"
            case .medium, .semibold: "DMSans-Medium"
            default: "DMSans-Regular"
            }
        return isAvailable(name)
            ? .custom(name, fixedSize: size)
            : .system(size: size, weight: weight)
    }

    /// JetBrains Mono — numbers, clocks, tags, anything tabular.
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        // Font.Weight isn't Comparable, so the heavy weights are matched explicitly.
        let heavy: Set<Font.Weight> = [.semibold, .bold, .heavy, .black]
        let name = heavy.contains(weight) ? "JetBrainsMono-SemiBold" : "JetBrainsMono-Regular"
        return isAvailable(name)
            ? .custom(name, fixedSize: size)
            : .system(size: size, weight: weight, design: .monospaced)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension View {
    /// The uppercase mono micro-label used throughout v2 (`.page-tag`, `.readiness-sub`,
    /// `.q-ends`) — small, letterspaced, muted.
    func tagLabel(size: CGFloat = 9, tracking: CGFloat = 1.4, color: Color = Theme.muted2) -> some View {
        font(Typeface.mono(size))
            .tracking(tracking)
            .foregroundStyle(color)
            .textCase(.uppercase)
    }
}
