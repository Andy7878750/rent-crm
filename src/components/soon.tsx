export function Soon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-[22px] font-bold">{title}</h1>
      <div className="card max-w-[640px] p-6 leading-relaxed text-ink-2">
        <span className="pill mb-3 bg-accent-soft text-accent">В разработке</span>
        <div>{children}</div>
      </div>
    </>
  );
}
