import Link from 'next/link';
import PageTemplate from '@/components/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface ExerciseGroupListProps {
    title: string;
    items: { name: string; count: number }[];
    baseUrl: string;
}

export default function ExerciseGroupList({ title, items, baseUrl }: ExerciseGroupListProps) {
    return (
        <PageTemplate>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/exercises" className="hover:text-foreground">
                        Exercises
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">{title}</span>
                </div>

                <h1 className="text-3xl font-bold">{title}</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item) => (
                        <Link key={item.name} href={`${baseUrl}/${encodeURIComponent(item.name)}`} className="no-underline">
                            <Card className="hover:bg-accent transition-colors h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
                                    <CardTitle className="text-lg font-medium capitalize">{item.name}</CardTitle>
                                    <Badge variant="secondary" className="ml-2">
                                        {item.count}
                                    </Badge>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </PageTemplate>
    );
}
