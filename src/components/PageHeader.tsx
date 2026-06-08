interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  body: string;
  aside?: string;
}

export default function PageHeader({ eyebrow, title, body, aside }: PageHeaderProps) {
  return (
    <section className="theme-card overflow-hidden bg-transparent p-6 md:p-8">
      {eyebrow ? <p className="theme-kicker">{eyebrow}</p> : null}
      <div className="mt-2 grid gap-6 lg:grid-cols-[1.5fr_0.8fr] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 md:text-base">{body}</p>
        </div>
        {aside ? (
          <div className="theme-soft-card bg-transparent p-4 text-sm leading-7 text-stone-600">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
