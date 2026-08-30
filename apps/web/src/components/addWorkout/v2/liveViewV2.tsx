'use client';

import FinishPageV2 from '@/components/addWorkout/v2/finishPageV2';
import SessionListPageV2 from '@/components/addWorkout/v2/sessionListPageV2';
import SwipePager from '@/components/ui/v2/swipePager';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';
import { formatNumber } from '@/lib/statsUtils';

interface LiveViewV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
}

export default function LiveViewV2({ state, muscleGroupColor }: LiveViewV2Props) {
    // Page 0 is always the exercise list (or the empty "Let's go" variant); page 1, when it
    // exists, is the finish page. Exercise detail is a separate bottom sheet, not a page here.
    const isListPage = state.pageIndex === 0;

    return (
        <div className="view">
            <div className="live-strip">
                <span>
                    {state.exercises.length} exercise{state.exercises.length === 1 ? '' : 's'}
                </span>
                <span>
                    VOL <b>{formatNumber(state.totals.volume)}</b> · WORK <b>{formatNumber(state.totals.workVolume)}</b>
                </span>
            </div>
            <div className="pager">
                <SwipePager
                    pageKey={state.pageIndex}
                    onPrev={state.pagerPrev}
                    onNext={state.pagerNext}
                    disabled={{ next: state.pageIndex >= state.pageCount - 1 }}
                    className={isListPage ? `page next-page${state.exercises.length > 0 ? ' has-exercises' : ''}` : 'page next-page'}
                >
                    {isListPage ? <SessionListPageV2 state={state} muscleGroupColor={muscleGroupColor} /> : <FinishPageV2 state={state} />}
                </SwipePager>
            </div>
            <div className="pager-nav">
                <button
                    type="button"
                    className="chev"
                    onClick={state.pagerPrev}
                    aria-label={state.pageIndex === 0 ? 'Back to check-in' : 'Previous page'}
                >
                    ‹
                </button>
                <div className="dots">
                    {Array.from({ length: state.pageCount }, (_, i) => {
                        const plus = i === state.pageCount - 1;
                        return (
                            <button
                                type="button"
                                // biome-ignore lint/suspicious/noArrayIndexKey: dots map 1:1 to a fixed pageCount range, no reordering
                                key={i}
                                className={`dot${plus ? ' plus' : ''}${i === state.pageIndex ? ' on' : ''}`}
                                onClick={() => state.goToPage(i)}
                                aria-label={`page ${i + 1}`}
                            />
                        );
                    })}
                </div>
                <button
                    type="button"
                    className="chev"
                    disabled={state.pageIndex >= state.pageCount - 1}
                    onClick={state.pagerNext}
                    aria-label="Next page"
                >
                    ›
                </button>
            </div>
        </div>
    );
}
