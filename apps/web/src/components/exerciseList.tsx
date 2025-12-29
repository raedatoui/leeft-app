import Link from 'next/link';
import PageTemplate from '@/components/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExerciseMetadata } from '@/types';

interface ExerciseListProps {
    title: string;
    exercises: ExerciseMetadata[];
    parentUrl: string;
    parentLabel: string;
}

export default function ExerciseList({ title, exercises, parentUrl, parentLabel }: ExerciseListProps) {
    return (
        <PageTemplate>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/exercises" className="hover:text-foreground">
                        Exercises
                    </Link>
                    <span>/</span>
                    <Link href={parentUrl} className="hover:text-foreground">
                        {parentLabel}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground capitalize">{decodeURIComponent(title)}</span>
                </div>

                <h1 className="text-3xl font-bold capitalize">{decodeURIComponent(title)} Exercises</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exercises.map((ex) => (
                        <Link key={ex.id} href={`/exercise/${ex.id}`} className="no-underline">
                            <Card className="hover:bg-accent transition-colors h-full">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-lg font-medium">{ex.name}</CardTitle>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                            {ex.primaryMuscleGroup}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            {ex.category}
                                        </Badge>
                                    </div>
                                    {ex.equipment && ex.equipment.length > 0 && (
                                        <CardDescription className="mt-2 text-xs">{ex.equipment.join(', ')}</CardDescription>
                                    )}
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </PageTemplate>
    );
}
