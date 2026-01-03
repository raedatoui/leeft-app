'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ExerciseMetadata } from '@/types';

interface ExerciseSearchProps {
    exerciseMap: Map<string, ExerciseMetadata>;
}

export default function ExerciseSearch({ exerciseMap }: ExerciseSearchProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // Convert map to array and sort
    const exercises = Array.from(exerciseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Filter exercises based on search term
    const filteredExercises = searchValue
        ? exercises.filter((exercise) => {
              const searchLower = searchValue.toLowerCase();
              return exercise.name.toLowerCase().includes(searchLower) || exercise.primaryMuscleGroup.toLowerCase().includes(searchLower);
          })
        : exercises;

    const handleSelect = (exerciseId: string) => {
        router.push(`/exercises/${exerciseId}`);
        setOpen(false);
        setSearchValue('');
    };

    return (
        <div className="w-full max-w-[360px]">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-start text-left font-normal">
                        <Search className="mr-2 h-4 w-4 shrink-0" />
                        <span className="text-muted-foreground">Search exercises...</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Search exercises..." value={searchValue} onValueChange={setSearchValue} />
                        <CommandList>
                            <CommandEmpty>No exercises found.</CommandEmpty>
                            <CommandGroup>
                                {filteredExercises.map((exercise) => (
                                    <CommandItem
                                        key={exercise.id}
                                        value={exercise.id.toString()}
                                        onSelect={() => handleSelect(exercise.id.toString())}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{exercise.name}</span>
                                            <span className="text-sm text-muted-foreground">{exercise.primaryMuscleGroup}</span>
                                        </div>
                                        {exercise.equipment && exercise.equipment.length > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {exercise.equipment[0]}
                                            </Badge>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
