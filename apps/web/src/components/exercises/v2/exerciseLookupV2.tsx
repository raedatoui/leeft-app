'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExerciseMetadata } from '@/types';

interface ExerciseLookupV2Props {
    exerciseMap: Map<string, ExerciseMetadata>;
    currentExerciseId?: string;
}

export default function ExerciseLookupV2({ exerciseMap, currentExerciseId }: ExerciseLookupV2Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const exercises = useMemo(() => {
        return Array.from(exerciseMap.values())
            .filter((e) => e.id.toString() !== currentExerciseId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap, currentExerciseId]);

    const filtered = useMemo(() => {
        if (!query) return exercises;
        const q = query.toLowerCase();
        return exercises.filter((e) => e.name.toLowerCase().includes(q) || e.primaryMuscleGroup.toLowerCase().includes(q));
    }, [exercises, query]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const handleSelect = (id: string) => {
        router.push(`/exercises/${id}`);
        setOpen(false);
        setQuery('');
    };

    const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filtered[0]) {
            e.preventDefault();
            handleSelect(filtered[0].id.toString());
        }
    };

    return (
        <div className="exercise-lookup" ref={wrapperRef}>
            <button type="button" className="exercise-lookup-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <title>Search</title>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search exercises…</span>
            </button>
            {open && (
                <div className="exercise-lookup-panel" role="listbox">
                    <input
                        ref={inputRef}
                        type="text"
                        className="exercise-lookup-input"
                        placeholder="Search exercises…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleInputKey}
                    />
                    <div className="exercise-lookup-list">
                        {filtered.length === 0 ? (
                            <div className="exercise-lookup-empty">No exercises found.</div>
                        ) : (
                            filtered.map((ex) => (
                                <button
                                    key={ex.id}
                                    type="button"
                                    className="exercise-lookup-item"
                                    onClick={() => handleSelect(ex.id.toString())}
                                    role="option"
                                    aria-selected={false}
                                >
                                    <span className="info">
                                        <span className="name">{ex.name}</span>
                                        <span className="mg">{ex.primaryMuscleGroup}</span>
                                    </span>
                                    {ex.equipment[0] && <span className="equip">{ex.equipment[0]}</span>}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
