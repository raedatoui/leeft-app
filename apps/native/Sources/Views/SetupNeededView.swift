import SwiftUI

/// Shown when GoogleService-Info.plist hasn't been added yet, so a fresh checkout launches
/// into instructions rather than a Firebase trap. See apps/native/README.md.
struct SetupNeededView: View {
    private let steps = [
        "Firebase console → project leeft-app → Add app → iOS",
        "Bundle ID: com.leeft.app",
        "Download GoogleService-Info.plist into apps/native/Resources/",
        "Copy REVERSED_CLIENT_ID from it into the URL scheme in Resources/Info.plist",
        "Re-run xcodegen, then build again",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("🏋️")
                .font(.system(size: 40))
                .padding(.bottom, 12)

            Text("SETUP NEEDED")
                .font(Typeface.display(30))
                .foregroundStyle(Theme.fg)

            Text("GoogleService-Info.plist is missing")
                .font(Typeface.mono(11))
                .foregroundStyle(Theme.hyper)
                .padding(.top, 6)
                .padding(.bottom, 24)

            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: 12) {
                    Text("\(index + 1)")
                        .font(Typeface.mono(11, .semibold))
                        .foregroundStyle(Theme.bg)
                        .frame(width: 22, height: 22)
                        .background(Theme.maint, in: .circle)

                    Text(step)
                        .font(Typeface.body(14))
                        .foregroundStyle(Theme.fg)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.vertical, 9)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
}
