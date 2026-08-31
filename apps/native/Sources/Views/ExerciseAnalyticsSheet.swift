import SwiftUI

/// One exercise's history: how the metric has moved, what the standing records are, and the way
/// into any single day. The iOS half of `/exercises/[id]`
/// (apps/web/src/pageComponents/v2/exercisePageV2.tsx).
///
/// Scoped down from the web deliberately: no paginated session table (the chart plus the scrub
/// card covers it on a phone) and no cycle filter (cycles aren't published to Firestore).
///
/// Not to be confused with `ExerciseDetailPage`, which is the live-session set editor.
struct ExerciseAnalyticsSheet: View {
    let exerciseId: Int

    @Environment(\.dismiss) private var dismiss
    @Environment(ExerciseCatalog.self) private var catalog

    @State private var filters = ExerciseFilters()
    @State private var model: ExerciseAnalyticsModel
    @State private var repRangeSheet = false
    @State private var daySheet: LiftingWorkoutDoc?

    /// Takes the history by value and derives synchronously, so the sheet opens on data rather
    /// than on a spinner — the presenter already has the whole collection in memory.
    init(exerciseId: Int, workouts: [LiftingWorkoutDoc]) {
        self.exerciseId = exerciseId
        _model = State(initialValue: ExerciseAnalyticsModel(exerciseId: exerciseId, workouts: workouts, filters: ExerciseFilters()))
    }

    private var metadata: ExerciseMetadata? { catalog.metadata(for: exerciseId) }

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    statStrip
                    controls
                    methodExplain
                    Rectangle().fill(Theme.borderSoft).frame(height: 1).padding(.vertical, 16)

                    if model.chartSessions.isEmpty {
                        emptyState
                    } else {
                        sectionLabel
                        ExercisePRChart(
                            sessions: model.chartSessions,
                            prMarks: model.prMarks,
                            metricName: model.metricName,
                            unit: model.chartUnit,
                            showsLbs: model.plotsLoad && filters.method == .maxWeight,
                            yDomain: model.yDomain,
                            onOpen: { daySheet = $0.workout }
                        )
                        .padding(.top, 8)

                        Text("\(model.stats.sessionCount) sessions tracked")
                            .tagLabel(size: 9, tracking: 1.6)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
        }
        .background(Theme.bg)
        .presentationDetents([.large])
        .presentationBackground(Theme.bg)
        .onChange(of: filters) { _, new in model.apply(new) }
        .sheet(isPresented: $repRangeSheet) {
            RepRangeSheet(initial: filters.repRange) { filters.repRange = $0 }
        }
        .sheet(item: $daySheet) { workout in
            ExerciseDaySheet(workout: workout)
        }
    }

    // MARK: - chrome

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                // Only drawn once the catalog has landed — an unknown group is a missing dot.
                if let group = metadata?.primaryMuscleGroup { MuscleDot(group: group, size: 8) }

                Text(metadata?.name ?? "Exercise \(exerciseId)")
                    .font(Typeface.display(18))
                    .tracking(0.7)
                    .textCase(.uppercase)
                    .foregroundStyle(Theme.muscleGroupColor(metadata?.primaryMuscleGroup))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Spacer(minLength: 0)

                ControlCircle(symbol: "chevron.down", size: 32) { dismiss() }
            }

            if let metadata {
                Text(metadata.subtitle)
                    .tagLabel(size: 9, tracking: 1.2)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }

    private var statStrip: some View {
        HStack(alignment: .top, spacing: 0) {
            stat(model.plotsLoad ? Fmt.number(model.stats.pr) : model.chartUnit.format(model.stats.pr),
                 "PR · \(model.metricName)", Theme.maint)
            stat("\(model.stats.sessionCount)", "Sessions", Theme.fg)
            stat("\(model.stats.totalSets)", "Sets", Theme.fg)
            stat(Fmt.volume(model.stats.volume), "Volume", Theme.fg)
        }
        .padding(.bottom, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }
    }

    private func stat(_ value: String, _ label: String, _ tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(Typeface.mono(17, .semibold))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .tagLabel(size: 9, tracking: 1.2)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - controls

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            controlRow("Range") {
                SegControl(
                    options: TimeRange.allCases,
                    label: \.rawValue,
                    selection: Binding(get: { filters.timeRange }, set: { filters.timeRange = $0 ?? .all })
                )
            }

            controlRow("Metric") {
                HStack(spacing: 8) {
                    SegControl(
                        options: CalculationMethod.maxOptions,
                        label: { $0 == .maxWeight ? "Max Wt" : $0 == .maxVolume ? "Volume" : "3×5" },
                        // nil while a 1RM formula is active, so no segment reads as chosen.
                        selection: Binding(
                            get: { CalculationMethod.maxOptions.contains(filters.method) ? filters.method : nil },
                            set: { if let new = $0 { filters.method = new } }
                        )
                    )
                    Menu {
                        ForEach(CalculationMethod.oneRepMax) { method in
                            Button(method.name) { filters.method = method }
                        }
                    } label: {
                        PillButton(title: CalculationMethod.oneRepMax.contains(filters.method) ? filters.method.name : "1RM", action: {}).label
                    }
                }
            }

            controlRow("Reps") {
                PillButton(title: "\(filters.repRange.min) – \(filters.repRange.max)") { repRangeSheet = true }
            }
        }
        // An unloaded basis has no method to apply and no rep window that means anything. The web
        // leaves these live; on a phone a dead control that still looks live is worse than one
        // visibly out.
        .disabled(!model.plotsLoad)
        .opacity(model.plotsLoad ? 1 : 0.4)
        .padding(.top, 18)
    }

    private func controlRow(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        HStack(spacing: 10) {
            Text(label)
                .tagLabel(size: 10, tracking: 1.6)
                .frame(width: 54, alignment: .leading)
            content()
            Spacer(minLength: 0)
        }
    }

    private var methodExplain: some View {
        HStack(spacing: 8) {
            if model.plotsLoad {
                Text(filters.method.name).foregroundStyle(Theme.fg)
                Text(filters.method.formula).foregroundStyle(Theme.muted2)
            } else {
                Text("not applicable on this basis").foregroundStyle(Theme.muted2)
            }
            Spacer(minLength: 0)
        }
        .font(Typeface.mono(11))
        .padding(.top, 12)
    }

    private var sectionLabel: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .center, spacing: 10) {
                Text("\(model.metricName) over time")
                    .tagLabel(size: 10, tracking: 1.6, color: Theme.muted)

                Spacer(minLength: 0)

                // Only when the exercise was actually logged on more than one scale — a chin-up
                // at `bw+ @10` and one at `lb @210` are the same lift on two axes.
                if model.bases.count > 1 {
                    SegControl(
                        options: model.bases.map(\.key),
                        label: { key in
                            let basis = model.bases.first { $0.key == key }
                            return "\(basis?.label ?? key) \(basis?.count ?? 0)"
                        },
                        selection: Binding(get: { model.activeBasis }, set: { filters.basis = $0 })
                    )
                }
            }

            // Only promise a star when one is actually on the canvas — see the star rule in
            // ExerciseSessions.rows.
            if !model.prMarks.isEmpty {
                Text("★ pr — gold all-time · green active · grey beaten")
                    .tagLabel(size: 9, tracking: 1.1)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Text(model.candidateCount == 0 ? "No logged sessions" : "No sessions match the current filters")
                .font(Typeface.mono(13))
                .tracking(1.1)
                .textCase(.uppercase)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)

            if model.candidateCount > 0 {
                Button("Reset filters") { filters = ExerciseFilters() }
                    .font(Typeface.body(14, .bold))
                    .foregroundStyle(Theme.maint)
                    .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .padding(.horizontal, 24)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .strokeBorder(Theme.borderSoft, style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
        )
    }
}

/// One day, rendered with the same card the History tab uses. `onSelectExercise` is left nil, so
/// tapping an exercise here can't open another chart on top of this one.
private struct ExerciseDaySheet: View {
    let workout: LiftingWorkoutDoc
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Session")
                    .tagLabel(size: 10, tracking: 1.6, color: Theme.muted)
                Spacer()
                ControlCircle(symbol: "chevron.down", size: 32) { dismiss() }
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 10)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.borderSoft).frame(height: 1) }

            ScrollView { WorkoutCardView(workout: workout) }
        }
        .background(Theme.bg)
        .presentationDetents([.large])
        .presentationBackground(Theme.bg)
    }
}

/// Two wheels under a Cancel / Select toolbar, following `UnitPickerSheet`. Local state so
/// Cancel leaves the range alone.
private struct RepRangeSheet: View {
    let initial: RepRange
    let onSelect: (RepRange) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var low: Int
    @State private var high: Int

    init(initial: RepRange, onSelect: @escaping (RepRange) -> Void) {
        self.initial = initial
        self.onSelect = onSelect
        _low = State(initialValue: initial.min)
        _high = State(initialValue: initial.max)
    }

    var body: some View {
        NavigationStack {
            HStack(spacing: 0) {
                wheel(selection: $low)
                wheel(selection: $high)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Theme.muted)
                }
                ToolbarItem(placement: .principal) {
                    Text("Rep range").tagLabel(size: 10, tracking: 1.6, color: Theme.muted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Select") {
                        // The wheels move independently, so a crossed pair is reachable.
                        onSelect(RepRange(min: Swift.min(low, high), max: Swift.max(low, high)))
                        dismiss()
                    }
                    .font(Typeface.body(15, .bold))
                    .foregroundStyle(Theme.maint)
                }
            }
        }
        .presentationDetents([.height(320)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Theme.bg)
    }

    private func wheel(selection: Binding<Int>) -> some View {
        Picker("", selection: selection) {
            ForEach(1...50, id: \.self) { Text("\($0)").font(Typeface.mono(17)).tag($0) }
        }
        .pickerStyle(.wheel)
        .frame(maxWidth: .infinity)
    }
}
