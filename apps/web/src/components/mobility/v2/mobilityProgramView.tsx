'use client';

import { useMemo } from 'react';
import { mobilityProgram } from '@/data/mobilityProgram';
import { useWorkoutData } from '@/lib/contexts';
import type { MobilityMovement } from '@/lib/mobility';
import { regionColor } from '@/lib/mobility-theme';

function ProgramRow({ name, movement }: { name: string; movement: MobilityMovement | undefined }) {
    if (!movement) {
        return (
            <div className="program-row">
                <span className="mob-dot" style={{ background: 'var(--muted-2)' }} />
                <span className="name">{name}</span>
                <span className="dose" />
                <span className="detail-link none">—</span>
            </div>
        );
    }

    return (
        <div className="program-row">
            <span className="mob-dot" style={{ background: regionColor(movement.region) }} />
            <span className="name">
                {movement.name}
                <small>
                    {movement.region} · {movement.type}
                </small>
            </span>
            <span className="dose">{movement.dosage}</span>
            {movement.video ? (
                <a className="detail-link" href={movement.video} target="_blank" rel="noopener noreferrer">
                    Video ↗
                </a>
            ) : (
                <span className="detail-link none">—</span>
            )}
        </div>
    );
}

export default function MobilityProgramView() {
    const program = mobilityProgram;
    const { mobilityMovements } = useWorkoutData();
    const movementByName = useMemo(() => new Map(mobilityMovements.map((m) => [m.name, m])), [mobilityMovements]);

    return (
        <>
            <div className="panel-label">
                <span>{program.title}</span>
            </div>
            <div className="program-intro">
                {program.intro.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
            </div>
            <div className="pain-pills">
                <span className="pain-pill" style={{ color: 'var(--strength)' }}>
                    GREEN · tolerable, keep going
                </span>
                <span className="pain-pill" style={{ color: 'var(--maint)' }}>
                    YELLOW · ease range/reps
                </span>
                <span className="pain-pill" style={{ color: 'var(--hyper)' }}>
                    RED · sharp pain, stop
                </span>
            </div>
            <section className="program-grid">
                <div className="program-session">
                    <div className="program-head">
                        <span className="program-letter" style={{ color: 'var(--maint)' }}>
                            ≈
                        </span>
                        <div className="titles">
                            <span className="session-title" style={{ fontSize: '20px' }}>
                                {program.warmup.title}
                            </span>
                            <span className="session-subtitle">{program.warmup.note}</span>
                        </div>
                        <span className="session-vol">
                            <span className="v maint">
                                <b>{program.warmup.time}</b>
                            </span>
                        </span>
                    </div>
                    <div className="program-rows">
                        {program.warmup.items.map((name) => (
                            <ProgramRow key={name} name={name} movement={movementByName.get(name)} />
                        ))}
                    </div>
                </div>
                {program.sessions.map((session) => (
                    <div key={session.letter} className="program-session">
                        <div className="program-head">
                            <span className="program-letter">{session.letter}</span>
                            <div className="titles">
                                <span className="session-title" style={{ fontSize: '20px' }}>
                                    {session.title}
                                </span>
                                <span className="session-subtitle">{session.focus}</span>
                            </div>
                            <span className="session-vol">
                                <span className="v">
                                    <b>{session.time}</b>
                                </span>
                            </span>
                        </div>
                        <div className="program-rows">
                            {session.items.map((name) => (
                                <ProgramRow key={name} name={name} movement={movementByName.get(name)} />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </>
    );
}
