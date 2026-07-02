interface PagerControlsProps {
    index: number;
    count: number;
    onPrev: () => void;
    onNext: () => void;
    prevDisabled: boolean;
    nextDisabled: boolean;
    prevLabel?: string;
    nextLabel?: string;
    prevTitle?: string;
    nextTitle?: string;
}

export default function PagerControls({
    index,
    count,
    onPrev,
    onNext,
    prevDisabled,
    nextDisabled,
    prevLabel = 'Previous',
    nextLabel = 'Next',
    prevTitle = prevLabel,
    nextTitle = nextLabel,
}: PagerControlsProps) {
    return (
        <>
            <button type="button" className="icon-btn sm" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <title>{prevTitle}</title>
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <span className="toolbar-pos">
                <b>{index + 1}</b>
                <span className="sep">/</span>
                {count}
            </span>
            <button type="button" className="icon-btn sm" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <title>{nextTitle}</title>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </>
    );
}
