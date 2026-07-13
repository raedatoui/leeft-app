'use client';

import { useEffect, useState } from 'react';

interface ToastV2Props {
    message: string | null;
}

// Keeps the last message rendered while fading out, so the text doesn't blank
// before the opacity/transform transition finishes.
export default function ToastV2({ message }: ToastV2Props) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        if (message) setDisplayed(message);
    }, [message]);

    return <div className={`toast${message ? ' show' : ''}`}>{displayed}</div>;
}
