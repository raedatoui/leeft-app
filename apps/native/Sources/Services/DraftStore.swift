import Foundation

/// File-backed persistence for the in-progress draft — the native replacement for the
/// debounced localStorage write-through in addWorkoutSession.tsx.
///
/// Application Support (not Caches, not tmp) so the OS never reclaims an unsaved session,
/// and excluded from iCloud/iTunes backup since it's transient by nature.
enum DraftStore {
    private static let filename = "draft-session.json"

    private static var url: URL? {
        guard let dir = try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        ) else { return nil }
        return dir.appendingPathComponent(filename)
    }

    private static let queue = DispatchQueue(label: "com.leeft.app.draftstore", qos: .utility)

    static func load() -> Draft? {
        guard let url = Self.url, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Draft.self, from: data)
    }

    /// A blank draft is stored as file absence, so a discarded session leaves nothing behind.
    static func save(_ draft: Draft) {
        guard !draft.isBlank else { clear(); return }
        queue.async {
            guard var url = Self.url else { return }
            guard let data = try? JSONEncoder().encode(draft) else { return }
            try? data.write(to: url, options: .atomic)

            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? url.setResourceValues(values)
        }
    }

    static func clear() {
        queue.async {
            guard let url = Self.url else { return }
            try? FileManager.default.removeItem(at: url)
        }
    }
}
