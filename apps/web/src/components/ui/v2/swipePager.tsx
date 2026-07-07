'use client';

import { AnimatePresence, motion, type PanInfo, type Transition, useReducedMotion, type Variants } from 'motion/react';
import { type MouseEvent, type ReactNode, useRef, useState } from 'react';

export interface SwipePagerProps {
    /** Monotonic page position (slide index, year, timestamp…) — larger means further "next".
     *  Any change plays the slide transition; the sign of the delta picks its direction, so
     *  chevrons, dropdown jumps, and swipes all animate consistently with no extra wiring. */
    pageKey: number;
    onPrev?: () => void;
    onNext?: () => void;
    disabled?: { prev?: boolean; next?: boolean };
    /** Applied to the animated element itself, so existing grid/table classes keep their layout. */
    className?: string;
    children: ReactNode;
}

/** Horizontal drag distance that commits a page turn on release. */
const COMMIT_DISTANCE = 60;
/** Flick velocity (px/s) that commits a page turn even under the distance threshold. */
const COMMIT_VELOCITY = 500;
/** Movement below this is treated as a sloppy tap: no page turn, click not suppressed. */
const TAP_SLOP = 10;

/* 104% (not 100%) so the pages' edges clear each other while crossing. */
const slideVariants: Variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '104%' : '-104%' }),
    center: { x: '0%' },
    exit: (direction: number) => ({ x: direction > 0 ? '-104%' : '104%' }),
};

const fadeVariants: Variants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
};

const slideTransition: Transition = { type: 'spring', stiffness: 340, damping: 34 };
const fadeTransition: Transition = { duration: 0.15 };

/**
 * Drag-driven paging: the content follows the finger, commits prev/next on distance or
 * flick velocity, springs back otherwise, and rubber-bands against disabled directions.
 * The outgoing page springs out while the incoming one springs in from the opposite side,
 * continuing from wherever the drag released. Vertical scrolling is untouched (pan-y).
 */
export function SwipePager({ pageKey, onPrev, onNext, disabled, className, children }: SwipePagerProps) {
    const reducedMotion = useReducedMotion();

    // Direction is derived from the pageKey delta ("adjusting state during render" pattern),
    // so the exiting page reads the fresh direction in the same render that removes it.
    const [prevKey, setPrevKey] = useState(pageKey);
    const [direction, setDirection] = useState(1);
    if (pageKey !== prevKey) {
        setDirection(pageKey > prevKey ? 1 : -1);
        setPrevKey(pageKey);
    }

    // A real drag must not also fire the click on whatever the finger ends over (cards are
    // links). Set once movement passes tap slop, cleared at the start of the next gesture.
    const draggedRef = useRef(false);

    const handleDrag = (_: unknown, info: PanInfo) => {
        if (Math.abs(info.offset.x) > TAP_SLOP) draggedRef.current = true;
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        const dx = info.offset.x;
        const flick = Math.abs(info.velocity.x) > COMMIT_VELOCITY && Math.abs(dx) > TAP_SLOP;
        if (Math.abs(dx) < COMMIT_DISTANCE && !flick) return;
        if (dx < 0) {
            if (!disabled?.next) onNext?.();
        } else if (!disabled?.prev) {
            onPrev?.();
        }
    };

    const handleClickCapture = (e: MouseEvent) => {
        if (!draggedRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        draggedRef.current = false;
    };

    const handlePointerDownCapture = () => {
        draggedRef.current = false;
    };

    return (
        <div className="swipe-pager" onClickCapture={handleClickCapture} onPointerDownCapture={handlePointerDownCapture}>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                    key={pageKey}
                    className={className}
                    custom={direction}
                    variants={reducedMotion ? fadeVariants : slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={reducedMotion ? fadeTransition : slideTransition}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: disabled?.next ? 0.08 : 0.85, right: disabled?.prev ? 0.08 : 0.85 }}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default SwipePager;
