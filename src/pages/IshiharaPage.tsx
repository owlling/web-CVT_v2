import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy, ishiharaPlates } from '@/data/appData';
import { useAppStore } from '@/store/appStore';

function shuffle<T>(list: T[]): T[] {
  const clone = [...list];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export default function IshiharaPage() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];
  const [started, setStarted] = useState(false);
  const [order, setOrder] = useState<number[]>(() => shuffle(ishiharaPlates.map((_, index) => index)));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => ishiharaPlates.map(() => ''));
  const [hiddenAnswers, setHiddenAnswers] = useState<boolean[]>(() => ishiharaPlates.map(() => false));

  const plateIndex = order[currentIndex] ?? 0;
  const plate = ishiharaPlates[plateIndex];

  useEffect(() => {
    if (!started) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (/^[0-9]$/.test(event.key)) {
        setAnswers((current) => {
          const next = [...current];
          next[plateIndex] = (next[plateIndex] + event.key).slice(0, 3);
          return next;
        });
      }
      if (event.key === 'Backspace') {
        setAnswers((current) => {
          const next = [...current];
          next[plateIndex] = next[plateIndex].slice(0, -1);
          return next;
        });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        nextPlate();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [plateIndex, started]);

  const result = useMemo(() => {
    const wrongCount = ishiharaPlates.reduce((count, current, index) => {
      const wrong = hiddenAnswers[index] || answers[index] !== current.answer;
      return count + (wrong ? 1 : 0);
    }, 0);

    if (wrongCount < 2) {
      return text.ishihara.states.normal;
    }
    if (wrongCount <= 4) {
      return text.ishihara.states.mild;
    }
    if (wrongCount <= 8) {
      return text.ishihara.states.moderate;
    }
    return text.ishihara.states.severe;
  }, [answers, hiddenAnswers, text.ishihara.states]);

  function start() {
    setStarted(true);
    setOrder(shuffle(ishiharaPlates.map((_, index) => index)));
    setCurrentIndex(0);
    setAnswers(ishiharaPlates.map(() => ''));
    setHiddenAnswers(ishiharaPlates.map(() => false));
  }

  function nextPlate() {
    setCurrentIndex((current) => Math.min(current + 1, ishiharaPlates.length));
  }

  const finished = started && currentIndex >= ishiharaPlates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/games" className="inline-flex items-center gap-2 rounded-none border border-stone-200 bg-transparent px-4 py-2 text-sm font-semibold text-stone-700">
          <ArrowLeft className="h-4 w-4" />
          {text.common.backHome}
        </Link>
      </div>

      <PageHeader eyebrow="Ishihara" title={text.ishihara.title} body={text.ishihara.intro} />

      {!started ? (
        <div className="theme-card bg-transparent p-6">
          <button type="button" onClick={start} className="rounded-none bg-[#d6643e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">
            {text.ishihara.start}
          </button>
        </div>
      ) : null}

      {started && !finished ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="theme-card bg-transparent p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-500">{currentIndex + 1} / {ishiharaPlates.length}</p>
              <div className="h-2 w-40 rounded-none bg-stone-200">
                <div className="h-2 rounded-none bg-[#d6643e]" style={{ width: `${((currentIndex + 1) / ishiharaPlates.length) * 100}%` }} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-center rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <img src={plate.src} alt={`Plate ${plate.id}`} className="max-h-[420px] w-full max-w-[420px]" />
            </div>
          </article>

          <article className="theme-card bg-transparent p-6">
            <p className="theme-kicker">Answer</p>
            <div className="mt-4 rounded-none border theme-card-border bg-[#F7F7F4] px-4 py-6 text-center font-mono text-5xl font-bold uppercase tracking-[0.24em] text-[#b95a38]">
              {answers[plateIndex] || '_'}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6,7,8,9].map((number) => (
                <button key={number} type="button" onClick={() => setAnswers((current) => {
                  const next = [...current];
                  next[plateIndex] = (next[plateIndex] + String(number)).slice(0, 3);
                  return next;
                })} className="rounded-none border border-stone-200 bg-white px-4 py-4 text-2xl font-bold text-stone-800 transition hover:border-[#d6643e] hover:bg-[#fff3eb]">
                  {number}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <button type="button" onClick={nextPlate} className="rounded-none border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">{text.ishihara.skip}</button>
              <button type="button" onClick={() => setAnswers((current) => {
                const next = [...current];
                next[plateIndex] = next[plateIndex].slice(0, -1);
                return next;
              })} className="rounded-none border border-stone-200 bg-[#f8f1ea] px-4 py-3 text-sm font-semibold text-stone-700">{text.ishihara.clear}</button>
              <button type="button" onClick={nextPlate} className="rounded-none bg-[#d6643e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">{text.ishihara.next}</button>
            </div>
          </article>
        </section>
      ) : null}

      {finished ? (
        <section className="theme-card bg-transparent p-6">
          <p className="theme-kicker">{text.ishihara.score}</p>
          <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-stone-950">
            {ishiharaPlates.length - ishiharaPlates.reduce((count, current, index) => count + (hiddenAnswers[index] || answers[index] !== current.answer ? 1 : 0), 0)} / {ishiharaPlates.length}
          </h2>
          <div className="mt-5 rounded-none border theme-card-border bg-[#F7F7F4] p-5">
            <p className="text-sm font-semibold text-stone-500">{text.ishihara.resultTitle}</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900">{result[0]}</h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">{result[1]}</p>
          </div>
          <button type="button" onClick={start} className="mt-5 rounded-none bg-[#d6643e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">{text.ishihara.start}</button>
        </section>
      ) : null}
    </div>
  );
}
