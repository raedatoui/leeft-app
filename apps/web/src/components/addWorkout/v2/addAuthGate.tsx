'use client';

import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { type ReactNode, useEffect, useState } from 'react';
import { auth, googleProvider, OWNER_EMAIL, saveErrorMessage } from '@/lib/firebase';

/** Google-login gate for /add (hurdl's AuthContext mechanics, scoped to this route):
 *  nothing renders until auth state resolves, signed-out visitors get an in-place
 *  sign-in panel, and non-owner accounts are force-signed-out. Rules enforce access —
 *  this is just the UX in front of them. */
export default function AddAuthGate({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(
        () =>
            onAuthStateChanged(auth, (u) => {
                if (u && u.email !== OWNER_EMAIL) {
                    setDenied(true);
                    signOut(auth); // re-fires this listener with null
                    return;
                }
                if (u) setDenied(false);
                setUser(u);
                setLoading(false);
            }),
        []
    );

    if (loading) return null;
    if (user) return <>{children}</>;

    const signIn = async () => {
        setError(null);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            setError(saveErrorMessage(err));
        }
    };

    return (
        <div className="stage">
            <div className="stage-caption">owner sign-in required</div>
            <div className="auth-gate">
                <div className="auth-gate-title">SIGN IN</div>
                <div className="auth-gate-sub">Logging a workout writes to Firestore — sign in with the owner account.</div>
                <button type="button" className="btn-big green" onClick={signIn}>
                    Sign in with Google
                </button>
                {denied && <div className="auth-gate-error">This account isn't authorized.</div>}
                {error && <div className="auth-gate-error">{error}</div>}
            </div>
        </div>
    );
}
