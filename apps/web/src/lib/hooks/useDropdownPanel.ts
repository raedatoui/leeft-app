'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared open/close mechanism for the v2 dropdown panels (DropdownV2, ExerciseLookupV2):
 * outside-mousedown + Escape close, search-input autofocus on open (skipped on touch
 * devices, where the panel is a bottom sheet and the keyboard would cover it), and
 * query reset whenever the panel closes.
 */
export function useDropdownPanel({ autofocus = true }: { autofocus?: boolean } = {}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        if (open && autofocus && !window.matchMedia('(pointer: coarse)').matches) inputRef.current?.focus();
    }, [open, autofocus]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    const close = () => setOpen(false);
    const toggle = () => setOpen((o) => !o);

    return { open, close, toggle, query, setQuery, wrapperRef, inputRef };
}
