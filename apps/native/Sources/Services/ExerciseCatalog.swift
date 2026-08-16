import Foundation
import Observation

/// The exercise list behind the picker, fetched from the same GCS artifacts the web app reads.
///
/// The upload script sets `Content-Encoding: gzip` on these objects (scripts/shell/upload.sh),
/// so URLSession inflates them transparently — no manual gunzip here.
@Observable
final class ExerciseCatalog {
    private(set) var exercises: [ExerciseMetadata] = []
    private(set) var isLoading = false
    private(set) var loadFailed = false

    /// Public bucket URL, same value as NEXT_PUBLIC_CDN_URL in apps/web/.env.local.
    private static let cdnBase = "https://storage.googleapis.com/typedef/leeft"

    private static var cacheURL: URL? {
        try? FileManager.default.url(
            for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        ).appendingPathComponent("exercise-catalog.json")
    }

    init() {
        // Show the cached catalog immediately; the network refresh replaces it when it lands.
        if let url = Self.cacheURL,
           let data = try? Data(contentsOf: url),
           let cached = try? JSONDecoder().decode([ExerciseMetadata].self, from: data) {
            exercises = cached
        }
    }

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let timestamp = try await fetchLatestTimestamp()
            let fetched = try await fetchCatalog(timestamp: timestamp)
            // Picker order: alphabetical. The web sorts by usage frequency, which needs the
            // full lifting log — deliberately out of scope here.
            exercises = fetched.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            loadFailed = false
            if let url = Self.cacheURL, let data = try? JSONEncoder().encode(exercises) {
                try? data.write(to: url, options: .atomic)
            }
        } catch {
            // A cached catalog is still on screen — only a cold first launch is truly empty.
            loadFailed = exercises.isEmpty
        }
    }

    /// The mutable pointer to the current dataset, republished on every pipeline upload.
    private func fetchLatestTimestamp() async throws -> String {
        struct Latest: Decodable { let timestamp: String }
        var request = URLRequest(url: URL(string: "\(Self.cdnBase)/latest.json")!)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(Latest.self, from: data).timestamp
    }

    private func fetchCatalog(timestamp: String) async throws -> [ExerciseMetadata] {
        let url = URL(string: "\(Self.cdnBase)/exercise-classified_\(timestamp).json.gz")!
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([ExerciseMetadata].self, from: data)
    }

    /// Catalog entries not already in the session, filtered by the search box.
    func available(excluding added: Set<Int>, query: String) -> [ExerciseMetadata] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return exercises.filter { ex in
            !added.contains(ex.id) && (q.isEmpty || ex.name.lowercased().contains(q))
        }
    }

    func name(for id: Int) -> String? {
        exercises.first { $0.id == id }?.name
    }

    func metadata(for id: Int) -> ExerciseMetadata? {
        exercises.first { $0.id == id }
    }
}
