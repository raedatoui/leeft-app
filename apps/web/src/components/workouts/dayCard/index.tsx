import { Dumbbell, Flame, Footprints, Heart, type LucideProps, Timer } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { cn, formatExerciseSets } from '@/lib/utils';
import type { CardioWorkout, DayWorkout, Exercise, ExerciseMetadata, Workout } from '@/types';
import { EffortBar } from '../cardioCard/effortBar';

// Yellow/amber color for lifting icon
const LIFTING_COLOR = '#F59E0B'; // amber-500

interface DayCardProps {
    dayWorkout: DayWorkout;
    exerciseMap: Map<string, ExerciseMetadata>;
    miniMode: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupFilter?: string | null;
    includeWarmup?: boolean;
}

const formatExerciseName = (name: string) => {
    return name
        .replace(/^TH:\s*/i, '')
        .replace(/\s*-\s*Barbell$/i, ' (BB)')
        .replace(/\s*-\s*Dumbbell$/i, ' (DB)')
        .replace(/\s*-\s*Cable$/i, ' (Cable)')
        .replace(/\s*-\s*Machine$/i, ' (Mach)');
};

// Exercise row component
const ExerciseRow: FC<{
    exercise: Exercise;
    metadata: ExerciseMetadata | undefined;
    isFocused: boolean;
    miniMode: boolean;
    includeWarmup: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
}> = ({ exercise, metadata, isFocused, miniMode, includeWarmup, cycleId, onExerciseClick }) => {
    return (
        <div className={cn('p-3', isFocused && 'bg-primary/10')}>
            <div className={cn('flex items-start justify-between gap-2', miniMode ? 'flex-col' : 'flex-row mb-2 pb-2 border-b')}>
                {onExerciseClick ? (
                    <button
                        type="button"
                        className={cn(
                            'text-left min-w-[120px] text-md font-semibold hover:underline hover:text-primary/60 leading-tight transition-colors',
                            isFocused ? 'text-primary' : 'text-primary/80'
                        )}
                        onClick={() => onExerciseClick(exercise.exerciseId.toString())}
                    >
                        {formatExerciseName(metadata?.name ?? `Exercise ${exercise.exerciseId}`)}
                    </button>
                ) : (
                    <Link
                        href={`/exercises/${exercise.exerciseId}${cycleId ? `?cycleId=${cycleId}` : ''}`}
                        className={cn(
                            'text-left min-w-[120px] text-md font-semibold hover:underline hover:text-primary/60 leading-tight transition-colors',
                            isFocused ? 'text-primary' : 'text-primary/80'
                        )}
                    >
                        {formatExerciseName(metadata?.name ?? `Exercise ${exercise.exerciseId}`)}
                    </Link>
                )}
                {miniMode && <div className="text-sm text-muted-foreground">{formatExerciseSets(exercise, includeWarmup)}</div>}
                {!miniMode && metadata?.primaryMuscleGroup && (
                    <Badge variant={isFocused ? 'default' : 'secondary'} className="shrink-0">
                        {metadata.primaryMuscleGroup}
                    </Badge>
                )}
                {!miniMode && (
                    <div className="text-sm text-muted-foreground">{(includeWarmup ? exercise.volume : exercise.workVolume).toLocaleString()}</div>
                )}
            </div>
            {!miniMode && (
                <div className="mx-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="w-1/3 text-center">set</th>
                                <th className="w-1/3 text-center">reps</th>
                                <th className="w-1/3 text-center">weight</th>
                            </tr>
                            <tr>
                                <th className="w-1/3 text-center">---</th>
                                <th className="w-1/3 text-center">----</th>
                                <th className="w-1/3 text-center">------</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exercise.sets
                                .filter((set) => includeWarmup || set.isWorkSet)
                                .map((set, index) => (
                                    <tr
                                        key={set.order}
                                        className={cn(
                                            'border-b py-0.5',
                                            set.isWorkSet ? cn('font-bold', isFocused ? 'text-primary' : 'text-primary/80') : 'text-foreground/80'
                                        )}
                                    >
                                        <td className="w-1/3 py-0.5 text-center">{`#${index + 1}`}</td>
                                        <td className="w-1/3 py-0.5 text-center">{set.reps}</td>
                                        <td className="w-1/3 py-0.5 text-center">{Math.round(set.weight)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Lifting section content
const LiftingSection: FC<{
    workout: Workout;
    exerciseMap: Map<string, ExerciseMetadata>;
    miniMode: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupFilter?: string | null;
    includeWarmup: boolean;
    showIcon: boolean;
}> = ({ workout, exerciseMap, miniMode, cycleId, onExerciseClick, muscleGroupFilter, includeWarmup, showIcon }) => {
    const exercises = muscleGroupFilter
        ? workout.exercises.filter((e) => {
              const metadata = exerciseMap.get(e.exerciseId.toString());
              return metadata?.primaryMuscleGroup === muscleGroupFilter;
          })
        : workout.exercises;

    if (exercises.length === 0) return null;

    return (
        <div>
            {showIcon && (
                <div className="flex items-center gap-3 p-3 pb-0">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${LIFTING_COLOR}20` }}>
                        <Dumbbell className="h-5 w-5" style={{ color: LIFTING_COLOR }} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Blocks: {workout.exercises.length} | Vol: {Math.round(includeWarmup ? workout.volume : workout.workVolume).toLocaleString()} |
                        Dur: {workout.duration}m{workout.rpe && ` | RPE: ${workout.rpe}`}
                    </div>
                </div>
            )}
            <div className="divide-y">
                {exercises.map((exercise) => (
                    <ExerciseRow
                        key={exercise.exerciseId}
                        exercise={exercise}
                        metadata={exerciseMap.get(exercise.exerciseId.toString())}
                        isFocused={false}
                        miniMode={miniMode}
                        includeWarmup={includeWarmup}
                        cycleId={cycleId}
                        onExerciseClick={onExerciseClick}
                    />
                ))}
            </div>
        </div>
    );
};

// Cardio section content
const CardioSection: FC<{ activity: CardioWorkout; miniMode: boolean; showIcon: boolean }> = ({ activity, miniMode, showIcon }) => {
    const Icon = cardioIcons[activity.type] || Timer;
    const accentColor = cardioColors[activity.type] || '#888888';
    const activeEffortMinutes = activity.effort?.filter((e) => e.name !== 'sedentary').reduce((sum, e) => sum + e.minutes, 0) ?? 0;

    return (
        <div className="px-4 py-3 min-w-0">
            {showIcon && (
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
                        <Icon className="h-5 w-5" style={{ color: accentColor }} />
                    </div>
                    <span className="font-bold" style={{ color: accentColor }}>
                        {activity.type}
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {Math.round(activity.durationMin)}m
                        {activity.zoneMinutes !== undefined && activity.zoneMinutes > 0 && ` | Zone: ${activity.zoneMinutes}m`}
                    </span>
                </div>
            )}
            {!miniMode && activity.effort && activeEffortMinutes > 0 && <EffortBar effort={activity.effort} />}
            {!miniMode && (activity.averageHeartRate || activity.calories || activity.steps) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {activity.averageHeartRate && (
                        <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>{activity.averageHeartRate} bpm</span>
                        </div>
                    )}
                    {activity.calories && (
                        <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span>{activity.calories} cal</span>
                        </div>
                    )}
                    {activity.steps && (
                        <div className="flex items-center gap-2">
                            <Footprints className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{activity.steps.toLocaleString()} steps</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DayCard: FC<DayCardProps> = ({ dayWorkout, exerciseMap, miniMode, cycleId, onExerciseClick, muscleGroupFilter, includeWarmup = true }) => {
    const { date, liftingWorkouts, cardioWorkouts } = dayWorkout;

    // Check if we should filter out this card entirely
    if (muscleGroupFilter) {
        const hasMatchingLifting = liftingWorkouts.some((w) =>
            w.exercises.some((e) => {
                const metadata = exerciseMap.get(e.exerciseId.toString());
                return metadata?.primaryMuscleGroup === muscleGroupFilter;
            })
        );
        if (!hasMatchingLifting) return null;
    }

    const dateDisplay = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

    const hasLifting = liftingWorkouts.length > 0;
    const hasCardio = cardioWorkouts.length > 0;
    const isMixed = hasLifting && hasCardio;
    const isSingleLifting = hasLifting && !hasCardio && liftingWorkouts.length === 1;
    const isSingleCardio = hasCardio && !hasLifting && cardioWorkouts.length === 1;
    const _totalWorkouts = liftingWorkouts.length + cardioWorkouts.length;

    // Build unique header icons list
    type HeaderIconInfo = { icon: FC<LucideProps>; color: string; bg: string; key: string };
    const headerIcons: HeaderIconInfo[] = [];

    if (hasLifting) {
        headerIcons.push({
            icon: Dumbbell,
            color: LIFTING_COLOR,
            bg: `${LIFTING_COLOR}20`,
            key: 'lift',
        });
    }

    if (hasCardio) {
        // Get unique cardio types
        const uniqueCardioTypes = [...new Set(cardioWorkouts.map((c) => c.type))];
        for (const cardioType of uniqueCardioTypes) {
            const color = cardioColors[cardioType] || '#888888';
            headerIcons.push({
                icon: cardioIcons[cardioType] || Timer,
                color,
                bg: `${color}20`,
                key: cardioType,
            });
        }
    }

    // Stats for header
    const liftingStats = isSingleLifting ? liftingWorkouts[0] : null;
    const cardioStats = isSingleCardio ? cardioWorkouts[0] : null;

    // Combine and sort activities by time for mixed days
    type Activity = { type: 'lift'; data: Workout; time: number } | { type: 'cardio'; data: CardioWorkout; time: number };
    const activities: Activity[] = isMixed
        ? [
              ...liftingWorkouts.map((w) => ({ type: 'lift' as const, data: w, time: w.date.getTime() })),
              ...cardioWorkouts.map((c) => ({ type: 'cardio' as const, data: c, time: c.date.getTime() })),
          ].sort((a, b) => a.time - b.time)
        : [];

    return (
        <div className="relative w-full h-full min-w-0">
            <Card className="rounded-xl font-mono w-full h-full flex flex-col min-w-0">
                <CardHeader className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        {headerIcons.length > 0 ? (
                            <div className="flex gap-1">
                                {headerIcons.map(({ icon: Icon, color, bg, key }) => (
                                    <div key={key} className="p-2 rounded-lg" style={{ backgroundColor: bg }}>
                                        <Icon className="h-5 w-5" style={{ color }} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-8" />
                        )}
                        <h2 className="text-lg font-semibold text-center flex-1">{dateDisplay}</h2>
                        <div className="w-8" />
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-2 text-sm text-muted-foreground flex-wrap justify-center">
                        {liftingStats && (
                            <>
                                <span>Blocks: {liftingStats.exercises.length}</span>
                                <span>|</span>
                                <span>Vol: {Math.round(includeWarmup ? liftingStats.volume : liftingStats.workVolume).toLocaleString()}</span>
                                <span>|</span>
                                <span>Dur: {liftingStats.duration}m</span>
                                {liftingStats.rpe && (
                                    <>
                                        <span>|</span>
                                        <span>RPE: {liftingStats.rpe}</span>
                                    </>
                                )}
                            </>
                        )}
                        {cardioStats && (
                            <>
                                <span className="font-bold" style={{ color: cardioColors[cardioStats.type] }}>
                                    {cardioStats.type}
                                </span>
                                <span>|</span>
                                <span>{Math.round(cardioStats.durationMin)}m</span>
                                {cardioStats.zoneMinutes !== undefined && cardioStats.zoneMinutes > 0 && (
                                    <>
                                        <span>|</span>
                                        <span>Zone: {cardioStats.zoneMinutes}m</span>
                                    </>
                                )}
                            </>
                        )}
                        {isMixed && (
                            <>
                                <span>
                                    {liftingWorkouts.length} lift{liftingWorkouts.length > 1 ? 's' : ''}
                                </span>
                                <span>|</span>
                                <span>{cardioWorkouts.length} cardio</span>
                            </>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="overflow-y-auto flex-1 p-0 min-w-0">
                    {/* Single lifting */}
                    {isSingleLifting && (
                        <LiftingSection
                            workout={liftingWorkouts[0]}
                            exerciseMap={exerciseMap}
                            miniMode={miniMode}
                            cycleId={cycleId}
                            onExerciseClick={onExerciseClick}
                            muscleGroupFilter={muscleGroupFilter}
                            includeWarmup={includeWarmup}
                            showIcon={false}
                        />
                    )}

                    {/* Single cardio */}
                    {isSingleCardio && (
                        <div className="px-6 pb-3">
                            {!miniMode && cardioWorkouts[0].effort && <EffortBar effort={cardioWorkouts[0].effort} />}
                            {!miniMode && (cardioWorkouts[0].averageHeartRate || cardioWorkouts[0].calories || cardioWorkouts[0].steps) && (
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    {cardioWorkouts[0].averageHeartRate && (
                                        <div className="flex items-center gap-2">
                                            <Heart className="h-4 w-4 text-red-500" />
                                            <span>{cardioWorkouts[0].averageHeartRate} bpm</span>
                                        </div>
                                    )}
                                    {cardioWorkouts[0].calories && (
                                        <div className="flex items-center gap-2">
                                            <Flame className="h-4 w-4 text-orange-500" />
                                            <span>{cardioWorkouts[0].calories} cal</span>
                                        </div>
                                    )}
                                    {cardioWorkouts[0].steps && (
                                        <div className="flex items-center gap-2">
                                            <Footprints className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">{cardioWorkouts[0].steps.toLocaleString()} steps</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multiple cardio only */}
                    {!hasLifting && cardioWorkouts.length > 1 && (
                        <div className="divide-y">
                            {cardioWorkouts.map((activity) => (
                                <CardioSection key={activity.uuid} activity={activity} miniMode={miniMode} showIcon={true} />
                            ))}
                        </div>
                    )}

                    {/* Mixed day */}
                    {isMixed && (
                        <div className="divide-y">
                            {activities.map((activity) =>
                                activity.type === 'lift' ? (
                                    <LiftingSection
                                        key={activity.data.uuid}
                                        workout={activity.data}
                                        exerciseMap={exerciseMap}
                                        miniMode={miniMode}
                                        cycleId={cycleId}
                                        onExerciseClick={onExerciseClick}
                                        muscleGroupFilter={muscleGroupFilter}
                                        includeWarmup={includeWarmup}
                                        showIcon={true}
                                    />
                                ) : (
                                    <CardioSection key={activity.data.uuid} activity={activity.data} miniMode={miniMode} showIcon={true} />
                                )
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DayCard;
