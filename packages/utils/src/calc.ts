import type { MappedWorkout, RepRange, SetDetail } from "@leeft/types";

type OneRepMaxCalc = (weight: number, reps: number) => number;
type Calculator = (workout: MappedWorkout, repRange?: RepRange) => number;

export interface CalculationMethod {
	name: string;
	description: string;
	formula: string;
	calculator: Calculator;
}

export const getTopSet = (
	workout: MappedWorkout,
	repRange?: RepRange,
): SetDetail | undefined => {
	if (!workout?.selected?.sets?.length) return undefined;

	if (!repRange) {
		return workout.selected.sets.sort((a, b) => b.weight - a.weight)[0];
	}

	const filteredSets = workout.selected.sets.filter(
		(s) =>
			s.reps &&
			s.reps >= (repRange?.min ?? 1) &&
			s.reps <= (repRange?.max ?? 5),
	);

	return filteredSets.length > 0
		? filteredSets.sort((a, b) => b.weight - a.weight)[0]
		: undefined;
};

export const getVolumeWeight = (workout: MappedWorkout): number => {
	if (!workout?.selected?.sets) return 0;
	return workout.selected.sets.reduce(
		(acc, s) => acc + s.weight * (s.reps ?? 0),
		0,
	);
};

export const getMaxWeight = (
	workout: MappedWorkout,
	repRange?: RepRange,
): number => {
	const set = getTopSet(workout, repRange);
	return set?.weight ?? 0;
};

export const getTopNSets = (
	workout: MappedWorkout,
	setCount = 3,
	targetReps = 5,
): number => {
	if (!workout?.selected?.sets) return 0;

	const sets = workout.selected.sets;

	// Filter sets that have exactly the target reps
	const targetRepSets = sets.filter((s) => s.reps === targetReps);

	// Return 0 if we don't have enough sets with target reps
	if (targetRepSets.length < setCount) return 0;

	// Find the maximum weight among sets with target reps
	const maxWeightForTargetReps = Math.max(
		...targetRepSets.map((set) => set.weight),
	);

	// Find the index of the set with max weight for target reps
	const maxWeightIndex = sets.findIndex(
		(set) => set.reps === targetReps && set.weight === maxWeightForTargetReps,
	);

	// Check all possible windows that could include the max weight set
	for (
		let start = Math.max(0, maxWeightIndex - setCount + 1);
		start <= Math.min(maxWeightIndex, sets.length - setCount);
		start++
	) {
		const window = sets.slice(start, start + setCount);

		// Check if all sets in window have target reps
		if (window.every((set) => set.reps === targetReps)) {
			return window.reduce((acc, set) => acc + set.weight, 0);
		}
	}

	return 0;
};

const createOneRepMaxCalculator =
	(oneRepMax: OneRepMaxCalc) =>
	(workout: MappedWorkout, repRange?: RepRange) => {
		const set = getTopSet(workout, repRange);
		if (!set?.reps) return 0;
		return oneRepMax(set.weight, set.reps);
	};

export const defaultMaxCalculator: CalculationMethod = {
	name: "Max Weight",
	description: "Max weight",
	formula: "max(weight)",
	calculator: getMaxWeight,
};

export const maxCalculators: CalculationMethod[] = [
	defaultMaxCalculator,
	{
		name: "Max Volume",
		description: "Max total volume",
		formula: "Σ(weight × reps)",
		calculator: getVolumeWeight,
	},
	{
		name: "Max 3x5",
		description: "Max top N consecutive reps sets at M reps",
		formula: "sum of top 3 sets at 5 reps",
		calculator: (workout) => getTopNSets(workout, 3, 5),
	},
];

export const oneRepMaxCalculators: CalculationMethod[] = [
	{
		name: "Epley",
		description: "Most widely used formula, good for 1-10 reps",
		formula: "weight × (1 + reps/30)",
		calculator: createOneRepMaxCalculator((w, r) => w * (1 + r / 30)),
	},
	{
		name: "Brzycki",
		description: "More accurate for higher reps (>10)",
		formula: "weight × (36/(37 - reps))",
		calculator: createOneRepMaxCalculator((w, r) => w * (36 / (37 - r))),
	},
	{
		name: "McGlothin",
		description: "Conservative estimate for lower reps",
		formula: "(100 × weight)/(101.3 - 2.67123 × reps)",
		calculator: createOneRepMaxCalculator(
			(w, r) => (100 * w) / (101.3 - 2.67123 * r),
		),
	},
	{
		name: "Lombardi",
		description: "Simple exponential formula",
		formula: "weight × reps^0.1",
		calculator: createOneRepMaxCalculator((w, r) => w * r ** 0.1),
	},
	{
		name: "Mayhew",
		description: "Good for bench press specifically",
		formula: "(100 × weight)/(52.2 + 41.9e^(-0.055 × reps))",
		calculator: createOneRepMaxCalculator(
			(w, r) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)),
		),
	},
	{
		name: "O'Conner",
		description: "Linear formula, similar to Epley",
		formula: "weight × (1 + reps/40)",
		calculator: createOneRepMaxCalculator((w, r) => w * (1 + r / 40)),
	},
	{
		name: "Wathen",
		description: "More accurate for squat and deadlift",
		formula: "(100 × weight)/(48.8 + 53.8e^(-0.075 × reps))",
		calculator: createOneRepMaxCalculator(
			(w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
		),
	},
];
