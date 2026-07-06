'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface DropdownV2Option {
    value: string;
    label: string;
    sublabel?: string;
    trailing?: string;
    keywords?: string;
    color?: string;
}

interface DropdownV2Props {
    value: string;
    options: DropdownV2Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    searchable?: boolean;
    ariaLabel?: string;
    size?: 'sm' | 'md';
    align?: 'left' | 'right';
    panelWidth?: number;
    triggerMinWidth?: number;
}

const SEARCH_AUTO_THRESHOLD = 8;

export default function DropdownV2({
    value,
    options,
    onChange,
    placeholder = 'Select…',
    searchable,
    ariaLabel,
    size = 'sm',
    align = 'left',
    panelWidth,
    triggerMinWidth,
}: DropdownV2Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isSearchable = searchable ?? options.length >= SEARCH_AUTO_THRESHOLD;
    const selected = options.find((o) => o.value === value);

    const filtered = useMemo(() => {
        if (!query) return options;
        const q = query.toLowerCase();
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(q) ||
                (o.sublabel?.toLowerCase().includes(q) ?? false) ||
                (o.keywords?.toLowerCase().includes(q) ?? false)
        );
    }, [options, query]);

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
        if (open && isSearchable) inputRef.current?.focus();
    }, [open, isSearchable]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    const handleSelect = (v: string) => {
        onChange(v);
        setOpen(false);
    };

    const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filtered[0]) {
            e.preventDefault();
            handleSelect(filtered[0].value);
        }
    };

    return (
        <div className="dd-v2" ref={wrapperRef}>
            <button
                type="button"
                className={`dd-v2-trigger${size === 'sm' ? ' sm' : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                style={triggerMinWidth ? { minWidth: triggerMinWidth } : undefined}
            >
                <span className="dd-v2-trigger-label" style={selected?.color ? { color: selected.color } : undefined}>
                    {selected?.label ?? placeholder}
                </span>
            </button>
            {open && (
                <div
                    className={`dd-v2-panel${align === 'right' ? ' align-right' : ''}`}
                    role="listbox"
                    style={panelWidth ? { width: panelWidth } : undefined}
                >
                    {isSearchable && (
                        <input
                            ref={inputRef}
                            type="text"
                            className="dd-v2-input"
                            placeholder="Search…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleInputKey}
                        />
                    )}
                    <div className="dd-v2-list">
                        {filtered.length === 0 ? (
                            <div className="dd-v2-empty">No matches.</div>
                        ) : (
                            filtered.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`dd-v2-item${opt.value === value ? ' selected' : ''}`}
                                    onClick={() => handleSelect(opt.value)}
                                    role="option"
                                    aria-selected={opt.value === value}
                                >
                                    <span className="info">
                                        <span className="name" style={opt.color ? { color: opt.color } : undefined}>
                                            {opt.label}
                                        </span>
                                        {opt.sublabel && <span className="sub">{opt.sublabel}</span>}
                                    </span>
                                    {opt.trailing && <span className="trail">{opt.trailing}</span>}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
