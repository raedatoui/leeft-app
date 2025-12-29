interface PageHeaderProps {
    title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 mb-4">
            <h1 className="text-3xl sm:text-5xl text-center font-black tracking-tighter uppercase leading-none text-primary">{title}</h1>
        </div>
    );
}
