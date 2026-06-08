import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy } from '@/data/appData';
import { useAppStore } from '@/store/appStore';
import { readNumber, writeNumber } from '@/utils/storage';

const difficulties = {
  easy: { startGrid: 3, deltaStart: 42, deltaDecay: 1.3 },
  normal: { startGrid: 4, deltaStart: 30, deltaDecay: 1.8 },
  hard: { startGrid: 5, deltaStart: 20, deltaDecay: 2.3 },
} as const;

type Difficulty = keyof typeof difficulties;

export default function ColorDiffPage() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundSeed, setRoundSeed] = useState(0);
  const [best, setBest] = useState(() => readNumber('web-cvt-best-score', 0));

  useEffect(() => {
    if (!started || paused || timeLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [paused, started, timeLeft]);

  useEffect(() => {
    if (timeLeft > 0 || !started) {
      return;
    }

    setStarted(false);
    if (score > best) {
      setBest(score);
      writeNumber('web-cvt-best-score', score);
    }
  }, [best, score, started, timeLeft]);

  const grid = useMemo(() => {
    const config = difficulties[difficulty];
    const gridSize = Math.min(config.startGrid + Math.floor(level / 3), 7);
    const delta = Math.max(4, config.deltaStart - level * config.deltaDecay);
    const baseH = ((roundSeed + 1) * 57) % 360;
    const baseS = 48 + ((roundSeed * 11) % 28);
    const baseL = 42 + ((roundSeed * 7) % 24);
    const diffIndex = Math.floor((roundSeed * 13 + level * 5) % (gridSize * gridSize));
    const variant = roundSeed % 3;

    const diffH = variant === 2 ? (baseH + delta + 360) % 360 : baseH;
    const diffS = variant === 1 ? Math.min(baseS + delta, 92) : baseS;
    const diffL = variant === 0 ? Math.min(baseL + delta, 92) : baseL;

    return {
      gridSize,
      diffIndex,
      cells: Array.from({ length: gridSize * gridSize }, (_, index) => ({
        id: index,
        color: index === diffIndex ? `hsl(${diffH} ${diffS}% ${diffL}%)` : `hsl(${baseH} ${baseS}% ${baseL}%)`,
        correct: index === diffIndex,
      })),
    };
  }, [difficulty, level, roundSeed]);

  function startGame() {
    setStarted(true);
    setPaused(false);
    setLevel(1);
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(60);
    setRoundSeed(1);
  }

  function handlePick(isCorrect: boolean) {
    if (!started || paused || timeLeft <= 0) {
      return;
    }

    if (isCorrect) {
      setCorrect((current) => current + 1);
      setScore((current) => current + level * 10);
      setLevel((current) => current + 1);
      setRoundSeed((current) => current + 1);
      return;
    }

    setWrong((current) => current + 1);
    setScore((current) => Math.max(0, current - 5));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/games" className="inline-flex items-center gap-2 rounded-none border border-stone-200 bg-transparent px-4 py-2 text-sm font-semibold text-stone-700">
          <ArrowLeft className="h-4 w-4" />
          {text.common.backHome}
        </Link>
      </div>

      <PageHeader eyebrow="Arcade" title={text.colorDiff.title} body={text.colorDiff.intro} />

      {!started ? (
        <section className="theme-card bg-transparent p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['easy', text.colorDiff.easy],
              ['normal', text.colorDiff.normal],
              ['hard', text.colorDiff.hard],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDifficulty(key)}
                className={[
                  'rounded-none border px-4 py-3 text-sm font-semibold transition',
                  difficulty === key ? 'border-[#d6643e] bg-[#fff3eb] text-[#d6643e]' : 'border-stone-200 bg-white text-stone-700 hover:border-[#d6643e]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{text.colorDiff.best}</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">{best}</p>
            </div>
            <div className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{text.colorDiff.time}</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">60s</p>
            </div>
          </div>
          <button type="button" onClick={startGame} className="mt-5 rounded-none bg-[#d6643e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">{text.colorDiff.start}</button>
        </section>
      ) : null}

      {started ? (
        <section className="grid gap-6 xl:grid-cols-2">
        <article className="theme-card bg-transparent p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              [text.colorDiff.level, level],
              [text.colorDiff.score, score],
              [text.colorDiff.correct, correct],
              [text.colorDiff.wrong, wrong],
            ].map(([label, value]) => (
              <div key={label} className="rounded-none border theme-card-border bg-[#F7F7F4] p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 mx-auto grid max-w-[560px] gap-2" style={{ gridTemplateColumns: `repeat(${grid.gridSize}, minmax(0, 1fr))` }}>
            {grid.cells.map((cell) => (
              <button
                type="button"
                key={cell.id}
                onClick={() => handlePick(cell.correct)}
                className="aspect-square rounded-none transition hover:scale-[1.02]"
                style={{ background: cell.color }}
                aria-label={cell.correct ? 'target tile' : 'tile'}
              />
            ))}
          </div>
        </article>

        <article className="theme-card bg-transparent p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{text.colorDiff.best}</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">{best}</p>
            </div>
            <div className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{text.colorDiff.time}</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">{timeLeft}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setPaused((current) => !current)} className="rounded-none border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">
              {paused ? text.colorDiff.resume : text.colorDiff.pause}
            </button>
          </div>
        </article>
      </section>
      ) : null}
    </div>
  );
}
