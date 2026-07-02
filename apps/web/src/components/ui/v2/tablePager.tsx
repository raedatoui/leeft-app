interface TablePagerProps {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    rangeLabel?: string;
}

export default function TablePager({ currentPage, totalPages, onPrev, onNext, rangeLabel }: TablePagerProps) {
    return (
        <div className="pr-pager">
            <button type="button" className="icon-btn sm" onClick={onPrev} disabled={currentPage === 0} aria-label="Newer page">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <title>Previous</title>
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <span className="pr-pager-pos">
                Page <b>{currentPage + 1}</b> / {totalPages}
            </span>
            <button type="button" className="icon-btn sm" onClick={onNext} disabled={currentPage >= totalPages - 1} aria-label="Older page">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <title>Next</title>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
            {rangeLabel && <span className="pr-pager-range">{rangeLabel}</span>}
        </div>
    );
}
