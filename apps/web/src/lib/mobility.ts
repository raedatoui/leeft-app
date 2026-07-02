import movementsJson from '@/data/mobilityMovements.json';

export type MobilityConf = 'High' | 'Med' | 'Low';

export interface MobilityMovement {
    name: string;
    aliases: string;
    region: string;
    type: string;
    position: string;
    equipment: string;
    target: string;
    dosage: string;
    video: string;
    source: string;
    conf: MobilityConf;
    notes: string;
    id: string;
    equip_tags: string[];
}

export interface MobilityProgramWarmup {
    title: string;
    time: string;
    note: string;
    items: string[];
}

export interface MobilityProgramSession {
    letter: string;
    title: string;
    focus: string;
    time: string;
    items: string[];
}

export interface MobilityProgram {
    title: string;
    intro: string[];
    warmup: MobilityProgramWarmup;
    sessions: MobilityProgramSession[];
}

export const mobilityMovements = movementsJson as MobilityMovement[];

export const movementById: ReadonlyMap<string, MobilityMovement> = new Map(mobilityMovements.map((m) => [m.id, m]));

function uniqueInOrder(values: string[]): string[] {
    return [...new Set(values)];
}

export const mobilityRegions = uniqueInOrder(mobilityMovements.map((m) => m.region));
export const mobilityTypes = uniqueInOrder(mobilityMovements.map((m) => m.type));
export const mobilityEquipTags = uniqueInOrder(mobilityMovements.flatMap((m) => m.equip_tags));
