/**
 * Parser for workout session text exports (leeft-compatible).
 *
 * Handles the "reps @ weights" notation used in Train Heroic screenshots:
 *
 *   A: Bench Press
 *   20,10,8,6,4,10,10,14 @ 45,95,115,135,150,165,165,135lb
 *
 *   F: 1-Arm DB Row
 *   1 x 44 @ 100lb
 */

export interface WorkSet {
    reps: number;
    weight: number;
}

export interface Exercise {
    block: string;
    name: string;
    sets: WorkSet[];
}

export interface Session {
    date: string | null;
    exercises: Exercise[];
}

const NXM_RE = /^\s*(\d+)\s*[x×]\s*(\d+)\s*@\s*([\d.]+)\s*lb\b/i;
const LIST_RE = /^\s*([\d,\s]+?)\s*@\s*([\d.,\s]+?)\s*lb\b/i;
const HEADER_RE = /^([A-Z]\d?)\s*[:.-]\s*(.+?)\s*$/;

export function parseSets(body: string): WorkSet[] {
    const trimmed = body.trim();

    const nxm = NXM_RE.exec(trimmed);
    if (nxm?.[1] && nxm[2] && nxm[3]) {
        const nSets = Number.parseInt(nxm[1], 10);
        const reps = Number.parseInt(nxm[2], 10);
        const weight = Number.parseFloat(nxm[3]);
        return Array.from({ length: nSets }, () => ({ reps, weight }));
    }

    const list = LIST_RE.exec(trimmed);
    if (list?.[1] && list[2]) {
        let reps = list[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => Number.parseInt(s, 10));
        let weights = list[2]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => Number.parseFloat(s));

        if (reps.length === 1 && weights.length > 1) {
            reps = Array(weights.length).fill(reps[0]);
        } else if (weights.length === 1 && reps.length > 1) {
            weights = Array(reps.length).fill(weights[0]);
        }

        if (reps.length !== weights.length) {
            throw new Error(`reps/weights length mismatch (${reps.length} vs ${weights.length}): ${JSON.stringify(trimmed)}`);
        }

        return reps.map((r, i) => ({ reps: r, weight: weights[i] as number }));
    }

    throw new Error(`Unrecognized set notation: ${JSON.stringify(trimmed)}`);
}

export function parseSession(text: string, sessionDate: string | null = null): Session {
    const session: Session = { date: sessionDate, exercises: [] };
    let block: string | null = null;
    let name: string | null = null;
    let buf: string[] = [];

    const flush = () => {
        if (block && name && buf.length) {
            session.exercises.push({ block, name, sets: parseSets(buf.join(' ')) });
        }
        buf = [];
    };

    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const header = HEADER_RE.exec(line);
        if (header?.[1] && header[2]) {
            flush();
            block = header[1];
            name = header[2];
        } else {
            buf.push(line);
        }
    }
    flush();
    return session;
}

export function sessionVolume(session: Session): number {
    return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0);
}

export function sessionTotalSets(session: Session): number {
    return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

export function sessionTotalReps(session: Session): number {
    return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps, 0), 0);
}

// ---------------------------------------------------------------------------
// Train Heroic JSON output (matches leeft workouts schema)
// ---------------------------------------------------------------------------

const BASE_ID = 260000000;
const USER_ID = 757279;
const TEAM_LOGO = 'https://static.trainheroic.com/avatar/avatar-RA-3abb79aff6e6b643c08c1efc20bfc3f5.png';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtWeight(w: number): string {
    return Number.isInteger(w) ? String(Math.trunc(w)) : String(w);
}

function abr(reps: number[], weights: number[]): string {
    return `${reps.join(', ')} @ ${weights.map(fmtWeight).join(', ')} lb`;
}

function paramFields(reps: number[], weights: number[]): Record<string, string | number> {
    const fields: Record<string, string | number> = {};
    for (let i = 1; i <= 10; i++) {
        const r = reps[i - 1];
        const w = weights[i - 1];
        fields[`param_1_data_${i}`] = r !== undefined ? String(r) : '';
        fields[`param_2_data_${i}`] = w !== undefined ? fmtWeight(w) : '';
        fields[`param_${i}_made`] = r !== undefined ? 1 : 0;
    }
    return fields;
}

function isoDateParts(iso: string): { yy: string; mm: string; dd: string; yyyy: string } {
    const [yyyy = '', mm = '', dd = ''] = iso.split('-');
    return { yyyy, mm, dd, yy: yyyy.slice(2) };
}

function datePretty(iso: string): string {
    const { yy, mm, dd } = isoDateParts(iso);
    const day = WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()];
    return `${day} ${mm}.${dd}.${yy}`;
}

function localEpoch(iso: string, time: string): number {
    return Math.floor(new Date(`${iso}T${time}`).getTime() / 1000);
}

export function toTrainHeroicJson(session: Session, baseId?: number): unknown {
    const dateStr = session.date ?? 'unknown';
    let resolvedBaseId: number;
    if (baseId !== undefined) {
        resolvedBaseId = baseId;
    } else if (session.date) {
        const { yy, mm, dd } = isoDateParts(session.date);
        resolvedBaseId = Number.parseInt(`${yy}${mm}${dd}`, 10) * 1000 + BASE_ID;
    } else {
        resolvedBaseId = BASE_ID;
    }

    const savedId = resolvedBaseId;
    const workoutId = resolvedBaseId + 1;
    const datePrettyStr = session.date ? datePretty(session.date) : '';
    const tsStart = session.date ? localEpoch(session.date, '10:00:00') : 0;
    const tsEnd = session.date ? localEpoch(session.date, '12:20:00') : 0;

    const savedWorkoutSets: unknown[] = [];
    const workoutSets: unknown[] = [];

    session.exercises.forEach((ex, i) => {
        const order = i + 1;
        const swSetId = resolvedBaseId + 100 + i;
        const wSetId = resolvedBaseId + 200 + i;
        const swExId = resolvedBaseId + 300 + i;
        const wExId = resolvedBaseId + 400 + i;
        const exId = resolvedBaseId + 500 + i;

        const reps = ex.sets.map((s) => s.reps);
        const weights = ex.sets.map((s) => s.weight);
        const abrStr = abr(reps, weights);
        const params = paramFields(reps, weights);
        const dataParams = Object.fromEntries(Object.entries(params).filter(([k]) => k.startsWith('param_') && k.includes('data')));

        const swWse = {
            id: swExId,
            saved_workout_set_id: swSetId,
            workout_set_exercise_id: exId,
            exercise_title: ex.name,
            exercise_id: exId,
            has_history: false,
            notes: null,
            instruction: '',
            order: 1,
            no_sets: 0,
            tips: '',
            abr: abrStr,
            abr_results: '',
            video_url: '',
            param_count: reps.length,
            completed: 1,
            param_1_type: 3,
            param_2_type: 1,
            ...params,
        };
        savedWorkoutSets.push({
            id: swSetId,
            plain_text: 0,
            saved_workout_id: savedId,
            workout_set_id: wSetId,
            title: 'Strength/Power',
            version: 1,
            is_super_set: 0,
            test_instruction: '',
            is_power: 0,
            is_speed: 0,
            is_agility: 0,
            is_endurance: 0,
            is_power_endurance: 0,
            is_strength: 0,
            test_type: 0,
            test_data_1: '0.00',
            test_data_2: '0.00',
            this_workout_rz: 0,
            rx: 1,
            completed: 1,
            date_completed: `${dateStr} 21:00:00`,
            date_updated: `${dateStr} 21:00:00`,
            notes: null,
            workout_percent_completed: 1,
            order,
            phase: 0,
            exercise_count: 1,
            workoutSetExercises: [swWse],
            is_test: false,
            instruction: '',
            has_history: false,
        });

        const wWse = {
            id: wExId,
            set_id: wSetId,
            exercise_id: exId,
            order: 1,
            title: ex.name,
            instruction: '',
            no_sets: 0,
            param_1_type: 3,
            param_2_type: 1,
            reference_max_exercise_id: null,
            workout_set_exercise_template_id: null,
            param_count: reps.length,
            tags: [],
            video_url: '',
            video_thumbnail: null,
            abr: abrStr,
            ...dataParams,
        };
        const ws = {
            id: wSetId,
            workout_id: workoutId,
            title: 'Strength/Power',
            phase: 0,
            order,
            instruction: '',
            is_test: 0,
            is_redzone: 0,
            test_instruction: '',
            plain_text: 0,
            redzone_instruction: '',
            redzone_type: 0,
            resets_working_max: null,
            smaller_is_better: null,
            source_id: null,
            tracker_id: null,
            updated_by: null,
            updated_on: null,
            workout_combo_id: null,
            is_power: 0,
            is_speed: 0,
            is_agility: 0,
            is_endurance: 0,
            is_power_endurance: 0,
            is_strength: 0,
            test_type: 0,
            is_set: 0,
            type: 4,
            typeClass: 'wstype-4',
            workoutSetExercises: [wWse],
            exercises: [wWse],
            tags: [],
        };
        workoutSets.push(ws);
    });

    return {
        saved_workout: {
            id: savedId,
            user_id: USER_ID,
            program_workout_id: savedId,
            user_full_name: 'Raed Atoui',
            name_last: 'Atoui',
            use_metric: 0,
            workout_id: workoutId,
            title: dateStr,
            instruction: null,
            completed: 1,
            date_completed: `${dateStr} 21:00:00`,
            workout_rating: '0.000000',
            notes: '',
            status: 0,
            statusMessage: '',
            version: 0,
            notes_on_feed: 0,
            percent_completed: 1,
            set_count: session.exercises.length,
            rpe: 8,
            timestamp_updated: tsEnd,
            timestamp_started: tsStart,
            timestamp_completed: tsEnd,
            timestamp_rpe: tsEnd,
            workoutSets: savedWorkoutSets,
            date_rescheduled: null,
            team_title: 'Raes Atoui',
            team_logo: TEAM_LOGO,
            date_pretty: datePrettyStr,
            is_in_compliance_mode: false,
        },
        workout: {
            id: workoutId,
            title: dateStr,
            instruction: null,
            created_on: `${dateStr} 10:00:00`,
            updated_on: `${dateStr} 10:00:00`,
            workoutSets,
            exercises: workoutSets,
            team_title: 'Raes Atoui',
            team_logo: TEAM_LOGO,
            date_pretty: datePrettyStr,
        },
        date: datePrettyStr,
    };
}
