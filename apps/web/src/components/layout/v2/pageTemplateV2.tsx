import type { ReactNode } from 'react';
import HeaderV2 from './headerV2';

interface PageTemplateV2Props {
    children: ReactNode;
    footer?: ReactNode;
}

export default function PageTemplateV2({ children, footer }: PageTemplateV2Props) {
    return (
        <div className="shell">
            <HeaderV2 />
            <main className="stagger">{children}</main>
            <footer>
                {footer}
                {footer ? ' · ' : ''}build {process.env.NEXT_PUBLIC_BUILD_TIME}
            </footer>
        </div>
    );
}
