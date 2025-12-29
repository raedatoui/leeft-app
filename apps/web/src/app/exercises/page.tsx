'use client';

import { BicepsFlexed, Dumbbell, Layers, List } from 'lucide-react';
import Link from 'next/link';
import PageTemplate from '@/components/pageTemplate';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExercisesPage() {
    return (
        <PageTemplate>
            <h1 className="text-3xl font-bold mb-6">Exercises</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/exercises/all" className="no-underline">
                    <Card className="hover:bg-accent transition-colors h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <List className="w-5 h-5" />
                                All Exercises
                            </CardTitle>
                            <CardDescription>Browse all exercises with filters</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/exercises/muscle" className="no-underline">
                    <Card className="hover:bg-accent transition-colors h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BicepsFlexed className="w-5 h-5" />
                                Muscle Group
                            </CardTitle>
                            <CardDescription>Browse exercises by primary muscle group</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/exercises/equipment" className="no-underline">
                    <Card className="hover:bg-accent transition-colors h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Dumbbell className="w-5 h-5" />
                                Equipment
                            </CardTitle>
                            <CardDescription>Browse exercises by equipment used</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/exercises/category" className="no-underline">
                    <Card className="hover:bg-accent transition-colors h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                Category
                            </CardTitle>
                            <CardDescription>Browse exercises by category</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </PageTemplate>
    );
}
