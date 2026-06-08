import { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { copy, cvdTypes } from '@/data/appData';
import { useAppStore } from '@/store/appStore';
import { isValidHex, normalizeHex, simulateHex } from '@/utils/colorVision';

export default function ColorPage() {
  const language = useAppStore((state) => state.language);
  const currentColor = useAppStore((state) => state.currentColor);
  const colorType = useAppStore((state) => state.colorType);
  const setCurrentColor = useAppStore((state) => state.setCurrentColor);
  const setColorType = useAppStore((state) => state.setColorType);
  const text = copy[language];

  const selectedMeta = useMemo(
    () => cvdTypes.find((item) => item.key === colorType) ?? cvdTypes[0],
    [colorType],
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Color Mode" title={text.color.title} body={text.color.body} />

      <section className="grid gap-6">
        <div className="theme-card bg-transparent p-5">
          <p className="theme-kicker">HEX</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900">{text.color.selectedColor}</h2>

          <div className="mt-5 flex items-center gap-4 theme-soft-card bg-transparent p-4">
            <input
              type="color"
              value={currentColor}
              onChange={(event) => setCurrentColor(event.target.value)}
              className="h-14 w-14 cursor-pointer rounded-none border-0 bg-transparent p-0"
            />
            <input
              value={currentColor}
              onChange={(event) => {
                const next = event.target.value;
                if (isValidHex(next)) {
                  setCurrentColor(normalizeHex(next));
                }
              }}
              className="h-14 flex-1 rounded-none border border-stone-200 bg-white px-4 font-mono text-base font-semibold uppercase tracking-[0.08em] text-stone-800 outline-none transition focus:border-[#d6643e]"
            />
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cvdTypes.map((item) => {
              const simulated = simulateHex(currentColor, item.key);
              const active = item.key === colorType;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setColorType(item.key)}
                  className={[
                    'rounded-none border theme-card-border p-4 text-left transition',
                    active
                      ? 'border-[#d6643e] bg-[#fff3eb] shadow-none'
                      : 'bg-transparent hover:-translate-y-1',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-none border border-white/60" style={{ backgroundColor: simulated }} />
                    <div>
                      <p className="font-semibold text-stone-900">{item.names[language]}</p>
                      <p className="text-xs text-stone-500">{item.prevalence[language]}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{item.descriptions[language]}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-stone-500">{simulated}</p>
                </button>
              );
            })}
          </section>
        </div>

        <article className="theme-card bg-transparent p-5">
          <h3 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">{text.color.comparison}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="theme-soft-card p-4">
              <p className="text-sm font-semibold text-stone-500">{text.color.selectedColor}</p>
              <div className="mt-3 h-40 rounded-none" style={{ backgroundColor: currentColor }} />
              <p className="mt-3 font-mono text-sm uppercase tracking-[0.08em] text-stone-700">{currentColor}</p>
            </div>
            <div className="theme-soft-card p-4">
              <p className="text-sm font-semibold text-stone-500">{selectedMeta.names[language]}</p>
              <div className="mt-3 h-40 rounded-none" style={{ backgroundColor: simulateHex(currentColor, colorType) }} />
              <p className="mt-3 font-mono text-sm uppercase tracking-[0.08em] text-stone-700">
                {simulateHex(currentColor, colorType)}
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
