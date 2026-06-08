import { Link } from 'react-router-dom';
import { ArrowRight, Target, Grid2x2, ScanEye } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy } from '@/data/appData';
import { useAppStore } from '@/store/appStore';

const links = [
  { to: '/games/ishihara', icon: ScanEye },
  { to: '/games/color-diff', icon: Grid2x2 },
  { to: '/games/mosaic', icon: Target },
] as const;

export default function GamesPage() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="SELF-TEST" title={text.games.title} body={text.games.body} />
      <section className="grid gap-5">
        {text.games.entries.map((entry, index) => {
          const { to, icon: Icon } = links[index];
          return (
            <Link
              key={entry.title}
              to={to}
              className="group flex items-center justify-between gap-6 rounded-none border theme-card-border bg-transparent p-5 shadow-none transition hover:-translate-y-1"
            >
              <div className="flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#f4efe7] text-[#d6643e]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-stone-900">{entry.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{entry.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-center text-sm font-semibold text-[#1c1917]">
                <span>{language === 'zh' ? '打开' : 'Open'}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
