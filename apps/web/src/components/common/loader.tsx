export default function Loader() {
    return (
        <div className="flex items-center justify-center h-full min-h-[60vh] gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="w-1.5 rounded-full bg-primary animate-loader-bar"
                    style={{
                        animationDelay: `${i * 0.12}s`,
                    }}
                />
            ))}
        </div>
    );
}
