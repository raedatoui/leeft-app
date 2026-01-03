'use client';

interface WorkoutStatsGridProps {
    workoutCount: number;
    avgExercises: number;
    avgVolume: number;
}

export const WorkoutStatsGrid = ({ workoutCount, avgExercises, avgVolume }: WorkoutStatsGridProps) => {
    return (
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                <div className="text-xl font-bold">{workoutCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Workouts</div>
            </div>

            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                <div className="text-xl font-bold">{avgExercises.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Ex.</div>
            </div>

            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                <div className="text-xl font-bold">{avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Vol.</div>
            </div>
        </div>
    );
};
