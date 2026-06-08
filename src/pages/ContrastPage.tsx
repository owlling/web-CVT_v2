import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy } from '@/data/appData';
import { useAppStore } from '@/store/appStore';
import { evaluateContrast } from '@/utils/contrast';
import { hexToRgb, isValidHex, normalizeHex } from '@/utils/colorVision';

export default function ContrastPage() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];
  const [background, setBackground] = useState('#111827');
  const [foreground, setForeground] = useState('#f8fafc');

  const result = useMemo(() => evaluateContrast(hexToRgb(background), hexToRgb(foreground)), [background, foreground]);
  const checks = [
    [text.contrast.aaNormal, result.aaNormal],
    [text.contrast.aaLarge, result.aaLarge],
    [text.contrast.aaaNormal, result.aaaNormal],
    [text.contrast.aaaLarge, result.aaaLarge],
  ] as const;
  const previewCopy =
    language === 'zh'
      ? {
          heading: '大标题示例',
          body: '16px 的正文内容可以帮助你快速判断日常产品界面的阅读体验。',
          helper: '更小的辅助文案能进一步暴露高密度界面中的可读性风险。',
        }
      : {
          heading: 'Large heading sample',
          body: 'Normal body copy at 16px gives you a realistic idea of readability in everyday product layouts.',
          helper: 'Smaller helper text quickly reveals whether the combination remains accessible under dense UI conditions.',
        };
  const statusText = language === 'zh' ? { pass: '通过', fail: '未通过' } : { pass: 'Pass', fail: 'Fail' };
  const colorInputs = [
    { label: text.contrast.background, value: background, setter: setBackground },
    { label: text.contrast.foreground, value: foreground, setter: setForeground },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="WCAG 2.1" title={text.contrast.title} body={text.contrast.body} />

      <section className="grid gap-6">
        <div className="theme-card bg-transparent p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end lg:gap-8">
            {colorInputs.map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-4">
                <p className="shrink-0 text-sm font-semibold text-stone-500">{label}</p>
                <div className="flex flex-1 items-center gap-4">
                  <input type="color" value={value} onChange={(event) => setter(event.target.value)} className="h-14 w-14 rounded-none border-0 bg-transparent p-0" />
                  <input
                    value={value}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (isValidHex(next)) {
                        setter(normalizeHex(next));
                      }
                    }}
                    className="h-14 flex-1 rounded-none border border-stone-200 bg-white px-4 font-mono text-base font-semibold uppercase tracking-[0.08em] text-stone-800 outline-none transition focus:border-[#d6643e]"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setBackground(foreground);
                setForeground(background);
              }}
              className="theme-button-primary lg:self-stretch"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {text.contrast.swap}
            </button>
          </div>
        </div>

        <article className="theme-card bg-transparent p-5">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">{text.contrast.preview}</h2>
          <div className="mt-5 rounded-none border theme-card-border p-6" style={{ backgroundColor: background }}>
            <p style={{ color: foreground }} className="text-3xl font-bold">{previewCopy.heading}</p>
            <p style={{ color: foreground }} className="mt-4 text-base leading-7">
              {previewCopy.body}
            </p>
            <p style={{ color: foreground }} className="mt-3 text-sm leading-6">
              {previewCopy.helper}
            </p>
          </div>
          <div className="mt-4 flex w-full justify-center rounded-none bg-[#F7F7F4] px-6 py-5 font-mono text-sm font-semibold text-[#0C0A09]">
            <span className="flex flex-col items-center text-center">
              <span>{text.contrast.ratio}</span>
              <span className="mt-1 text-[40px] leading-none">{result.ratio.toFixed(2)}:1</span>
            </span>
          </div>

          <section className="mt-5 grid gap-4 md:grid-cols-2">
            {checks.map(([label, pass]) => (
              <article key={label} className="rounded-none border theme-card-border bg-transparent p-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-600">{label}</p>
                  <span
                    className={[
                      'inline-flex w-fit rounded-none px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]',
                      pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                    ].join(' ')}
                  >
                    {pass ? statusText.pass : statusText.fail}
                  </span>
                </div>
              </article>
            ))}
          </section>
        </article>
      </section>
    </div>
  );
}
