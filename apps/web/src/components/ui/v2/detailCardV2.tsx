'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export interface DetailCardRow {
    key: string;
    label: string;
    value: ReactNode;
    emphasize?: boolean;
}

interface DetailCardV2Props {
    titleHref?: string;
    title: ReactNode;
    tags: ReactNode;
    rows?: DetailCardRow[];
    footer?: ReactNode;
}

export default function DetailCardV2({ titleHref, title, tags, rows, footer }: DetailCardV2Props) {
    return (
        <div className="detail-card">
            <div className="top">
                <h3>{titleHref ? <Link href={titleHref}>{title}</Link> : title}</h3>
            </div>
            <div className="tags">{tags}</div>
            {rows && rows.length > 0 && (
                <div className="detail-body">
                    {rows.map((row) => (
                        <div key={row.key} className={`detail-row${row.emphasize ? ' emphasize' : ''}`}>
                            <span className="k">{row.label}</span>
                            <span className="v">{row.value}</span>
                        </div>
                    ))}
                </div>
            )}
            {footer && <div className="detail-foot">{footer}</div>}
        </div>
    );
}
