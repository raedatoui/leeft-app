import Foundation

/// One entry in the exercise catalog, mirroring `ExerciseMetadataSchema` in
/// `packages/types/src/index.ts`. Only the fields the picker actually renders are
/// decoded; the artifact carries more (slug, videoUrl, description, originalMuscleGroup).
struct ExerciseMetadata: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let category: String
    let equipment: [String]
    let primaryMuscleGroup: String

    /// "chest · barbell" — the picker's secondary line.
    var subtitle: String {
        "\(primaryMuscleGroup) · \(equipment.first ?? category)"
    }
}
