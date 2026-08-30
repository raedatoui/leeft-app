import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, type Firestore, getDoc, getFirestore, setDoc } from 'firebase/firestore/lite';
import type { ReadinessAnswers } from '@/lib/addWorkoutConstants';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Mirrors isOwner() in firestore.rules — the client check is cosmetic UX; rules enforce. */
export const OWNER_EMAIL = 'raed.atoui@gmail.com';

let appInstance: FirebaseApp | undefined;
// Definite-assignment: populated by init() in the browser. On the server they stay undefined at
// runtime and are never dereferenced (all consumers are client components that touch Firebase only
// in effects/handlers), so the non-null type is safe.
let authInstance!: Auth;
let dbInstance!: Firestore;

function init() {
    // Never touch Firebase at module scope on the server (static-export prerender).
    if (typeof window === 'undefined' || appInstance) return;
    // getApps() is Firebase's own global registry — survives Fast Refresh within a page.
    appInstance = getApps()[0] ?? initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
}

init();

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

/** The Firestore doc shape at lifting-workouts/{YYYY-MM-DD}. All temporal fields are ISO
 *  strings, never Firestore Timestamps — keeps the pipeline's REST decoder trivial. */
export interface LiftingWorkoutDoc {
    uuid: string;
    date: string;
    title: string;
    startedAt: string;
    duration: number;
    rpe: number;
    readiness: ReadinessAnswers;
    exercises: {
        exerciseId: number;
        order: number;
        sets: { order: number; weight: number; reps: number; isWorkSet: boolean }[];
        volume: number;
        workVolume: number;
    }[];
    volume: number;
    workVolume: number;
}

/** Firestore rejects `undefined` values (unanswered readiness questions) — strip them. */
const sanitize = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Overwrites the day's doc, but keeps its uuid stable across re-saves so downstream
 *  pipeline artifacts (PRs, cycles) don't see the same workout as a new one. */
export async function saveLiftingWorkout(dateKey: string, workout: Omit<LiftingWorkoutDoc, 'uuid'>): Promise<void> {
    const ref = doc(db, 'lifting-workouts', dateKey);
    const existing = await getDoc(ref);
    const uuid = existing.exists() ? (existing.data() as LiftingWorkoutDoc).uuid : crypto.randomUUID();
    await setDoc(ref, sanitize({ uuid, ...workout }));
}

export function saveErrorMessage(err: unknown): string {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
    if (code === 'auth/popup-closed-by-user') return 'Sign-in cancelled';
    if (code === 'auth/popup-blocked') return 'Popup blocked — allow popups for this site';
    if (code === 'permission-denied') return 'Not authorized to save workouts';
    return 'Save failed — check your connection and retry';
}
