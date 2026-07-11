export type { MobilityConf, MobilityMovement } from '@/types';

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
    warmup?: MobilityProgramWarmup;
    sessions: MobilityProgramSession[];
}
