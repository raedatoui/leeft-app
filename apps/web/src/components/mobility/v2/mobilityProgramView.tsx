'use client';

import { mobilityProgram } from '@/data/mobilityProgram';
import { movementById } from '@/lib/mobility';
import { regionColor } from '@/lib/mobility-theme';

function ProgramRow({ itemId }: { itemId: string }) {
    const movement = movementById.get(itemId);

    if (!movement) {
        return (
            <div className="program-row">
                <span className="mob-dot" style={{ background: 'var(--muted-2)' }} />
                <span className="name">{itemId}</span>
                <span className="dose" />
                <span className="mob-video none">—</span>
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
                <a className="mob-video" href={movement.video} target="_blank" rel="noopener noreferrer">
                    Video ↗
                </a>
            ) : (
                <span className="mob-video none">—</span>
            )}
        </div>
    );
}

export default function MobilityProgramView() {
    const program = mobilityProgram;

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
                        {program.warmup.items.map((itemId) => (
                            <ProgramRow key={itemId} itemId={itemId} />
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
                            {session.items.map((itemId) => (
                                <ProgramRow key={itemId} itemId={itemId} />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </>
    );
}
