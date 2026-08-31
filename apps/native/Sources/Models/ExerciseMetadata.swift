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
    /// How this movement was last measured, used to seed the unit pickers when it's picked — so a
    /// sled push opens on feet rather than needing both columns set every time. Optional because
    /// the catalog artifact predates the field for anything not yet reclassified.
    let measurement: ColumnUnits?

    /// "chest · barbell" — the picker's secondary line.
    var subtitle: String {
        "\(primaryMuscleGroup) · \(equipment.first ?? category)"
    }
}
