import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import type { MobilityConf, MobilityMovement } from '@leeft/types';

type Decision = 'keep' | 'remove' | 'modify';

interface Progress {
    decided: Record<string, Decision>;
}

const MOVEMENTS_PATH = join(import.meta.dir, 'mobility-movements.json');
const PROGRESS_PATH = join(import.meta.dir, '../../data/mobility-review-progress.json');
const PROGRAM_PATH = join(import.meta.dir, '../../../web/src/data/mobilityProgram.ts');

const TEXT_FIELDS = ['name', 'aliases', 'region', 'type', 'position', 'equipment', 'target', 'dosage', 'video', 'source', 'notes'] as const;
type TextField = (typeof TEXT_FIELDS)[number];

function readJson<T>(path: string, fallback: T): T {
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

// 4-space indent to match repo formatting; equip_tags arrays kept on one line (biome style)
function writeJson(path: string, data: unknown): void {
    const json = `${JSON.stringify(data, null, 4)}\n`.replace(/"equip_tags": \[([^\]]*)\]/g, (_match, inner: string) => {
        const tags = JSON.parse(`[${inner}]`) as string[];
        return `"equip_tags": ${JSON.stringify(tags).replace(/","/g, '", "')}`;
    });
    writeFileSync(path, json);
}

function truncate(value: string, max: number): string {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function describe(m: MobilityMovement): string {
    const lines = [
        `${m.region} · ${m.type} · ${m.position} · conf: ${m.conf}`,
        m.target && `target:    ${m.target}`,
        m.dosage && `dosage:    ${m.dosage}`,
        (m.equipment || m.equip_tags.length > 0) && `equipment: ${m.equipment}${m.equip_tags.length > 0 ? ` [${m.equip_tags.join(', ')}]` : ''}`,
        m.source && `source:    ${m.source}`,
        m.video && `video:     ${m.video}`,
        m.notes && `notes:     ${m.notes}`,
        m.aliases && `aliases:   ${m.aliases}`,
    ];
    return lines.filter(Boolean).join('\n');
}

async function modifyMovement(movement: MobilityMovement, programText: string, onProgramWarning: () => void): Promise<'done' | 'cancel'> {
    while (true) {
        const field = await p.select({
            message: `Edit which field of "${movement.name}"?`,
            options: [
                ...TEXT_FIELDS.map((f) => ({ value: f as string, label: f, hint: truncate(movement[f], 48) || '(empty)' })),
                { value: 'conf', label: 'conf', hint: movement.conf },
                { value: 'equip_tags', label: 'equip_tags', hint: movement.equip_tags.join(', ') || '(empty)' },
                { value: '__done', label: 'done', hint: 'finish editing this movement' },
            ],
        });
        if (p.isCancel(field)) return 'cancel';
        if (field === '__done') return 'done';

        if (field === 'conf') {
            const value = await p.select({
                message: 'conf',
                initialValue: movement.conf,
                options: [
                    { value: 'High' as MobilityConf, label: 'High' },
                    { value: 'Med' as MobilityConf, label: 'Med' },
                    { value: 'Low' as MobilityConf, label: 'Low' },
                ],
            });
            if (p.isCancel(value)) continue;
            movement.conf = value;
        } else if (field === 'equip_tags') {
            const value = await p.text({ message: 'equip_tags (comma-separated)', initialValue: movement.equip_tags.join(', ') });
            if (p.isCancel(value)) continue;
            movement.equip_tags = String(value ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        } else {
            const textField = field as TextField;
            const value = await p.text({ message: textField, initialValue: movement[textField] });
            if (p.isCancel(value)) continue;
            const next = String(value ?? '');
            if (textField === 'name' && next !== movement.name && programText.includes(movement.name)) {
                onProgramWarning();
                p.log.warn(`"${movement.name}" is referenced in mobilityProgram.ts — update it there manually to "${next}".`);
            }
            movement[textField] = next;
        }
    }
}

async function main(): Promise<void> {
    if (process.argv.includes('--restart') && existsSync(PROGRESS_PATH)) {
        rmSync(PROGRESS_PATH);
    }

    const movements = readJson<MobilityMovement[]>(MOVEMENTS_PATH, []);
    const progress = readJson<Progress>(PROGRESS_PATH, { decided: {} });
    const programText = existsSync(PROGRAM_PATH) ? readFileSync(PROGRAM_PATH, 'utf8') : '';

    const active = movements.filter((m) => m.status === 'active');
    const queue = active.filter((m) => !progress.decided[m.id]);

    p.intro('mobility movement review');
    p.log.info(`${active.length} active movements · ${Object.keys(progress.decided).length} already decided · ${queue.length} to review`);

    const counts = { keep: 0, remove: 0, modify: 0 };
    let programWarnings = 0;

    const save = () => {
        writeJson(MOVEMENTS_PATH, movements);
        writeJson(PROGRESS_PATH, progress);
    };

    for (let i = 0; i < queue.length; i++) {
        const movement = queue[i];
        p.note(describe(movement), `[${i + 1}/${queue.length}] ${movement.name}`);

        const action = await p.select({
            message: 'What to do?',
            options: [
                { value: 'keep', label: 'keep' },
                { value: 'remove', label: 'remove', hint: 'flag as removed' },
                { value: 'modify', label: 'modify', hint: 'edit fields' },
                { value: 'skip', label: 'skip', hint: 'decide later' },
                { value: 'quit', label: 'quit & save' },
            ],
        });
        if (p.isCancel(action) || action === 'quit') break;
        if (action === 'skip') continue;

        if (action === 'keep') {
            progress.decided[movement.id] = 'keep';
            counts.keep++;
        } else if (action === 'remove') {
            if (programText.includes(movement.name)) {
                programWarnings++;
                p.log.warn(`"${movement.name}" is referenced in mobilityProgram.ts — removing it will break that program entry.`);
                const sure = await p.confirm({ message: 'Remove anyway?' });
                if (p.isCancel(sure)) break;
                if (!sure) {
                    i--;
                    continue;
                }
            }
            movement.status = 'removed';
            movement.removedAt = new Date().toISOString().slice(0, 10);
            progress.decided[movement.id] = 'remove';
            counts.remove++;
        } else if (action === 'modify') {
            const result = await modifyMovement(movement, programText, () => programWarnings++);
            if (result === 'cancel') break;
            progress.decided[movement.id] = 'modify';
            counts.modify++;
        }

        save();
    }

    save();
    const remaining = movements.filter((m) => m.status === 'active' && !progress.decided[m.id]).length;
    if (programWarnings > 0) {
        p.log.warn('Some removed/renamed movements are referenced in apps/web/src/data/mobilityProgram.ts — update it manually.');
    }
    const summary = `kept ${counts.keep} · removed ${counts.remove} · modified ${counts.modify} · ${remaining} still to review`;
    p.outro(remaining === 0 ? `all done — ${summary}` : summary);
}

await main();
