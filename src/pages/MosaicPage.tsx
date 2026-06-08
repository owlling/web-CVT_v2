import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy, mosaicBackgrounds, mosaicSeries } from '@/data/appData';
import { useAppStore } from '@/store/appStore';

const seriesList = [mosaicSeries.redGreen, mosaicSeries.purpleBlue, mosaicSeries.purpleGreen];

interface Cell {
  baseL: number;
  phase: number;
  freq: number;
  amplitude: number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const saturation = s / 100;
  const lightness = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function createGrid(testIndex: number): Cell[] {
  return Array.from({ length: 18 * 18 }, (_, index) => ({
    baseL: mosaicBackgrounds[testIndex][2],
    phase: Math.random() * Math.PI * 4,
    freq: 0.8 + Math.random() * 2,
    amplitude: 4 + Math.random() * 6,
  }));
}

export default function MosaicPage() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [testIndex, setTestIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [errors, setErrors] = useState(0);
  const [results, setResults] = useState([0, 0, 0]);
  const [target, setTarget] = useState({ row: 8, col: 8 });
  const [grid, setGrid] = useState<Cell[]>(() => createGrid(0));
  const animationRef = useRef<number | null>(null);

  const axisProgress = useMemo(
    () => results.map((value, index) => (index === testIndex ? Math.floor((level / 20) * 100) : value)),
    [level, results, testIndex],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !started || testIndex > 2) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const tileSize = 24;
    canvas.width = tileSize * 18;
    canvas.height = tileSize * 18;

    const draw = () => {
      const background = mosaicBackgrounds[testIndex];
      const series = seriesList[testIndex];
      const waveIndex = level * 3;
      const targetH = series[waveIndex] ?? series[series.length - 3];
      const targetS = series[waveIndex + 1] ?? series[series.length - 2];
      const time = Date.now();

      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let row = 0; row < 18; row += 1) {
        for (let col = 0; col < 18; col += 1) {
          const index = row * 18 + col;
          const cell = grid[index];
          const isTarget = Math.abs(row - target.row) <= 1 && Math.abs(col - target.col) <= 1;
          const wave1 = Math.sin(time * cell.freq * 0.003 + cell.phase);
          const wave2 = Math.sin(time * cell.freq * 0.007 + cell.phase * 1.5);
          const lightness = cell.baseL + (wave1 * 0.7 + wave2 * 0.3) * cell.amplitude;
          const hue = isTarget ? targetH : background[0];
          const saturation = isTarget ? targetS : background[1];
          const [r, g, b] = hslToRgb(hue, saturation, lightness);
          context.fillStyle = `rgb(${r}, ${g}, ${b})`;
          context.fillRect(col * tileSize, row * tileSize, tileSize - 2, tileSize - 2);
        }
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [grid, level, started, target, testIndex]);

  function refreshTarget(nextTest = testIndex) {
    setGrid(createGrid(nextTest));
    setTarget({
      row: 1 + Math.floor(Math.random() * 16),
      col: 1 + Math.floor(Math.random() * 16),
    });
  }

  function start() {
    setStarted(true);
    setTestIndex(0);
    setLevel(0);
    setErrors(0);
    setResults([0, 0, 0]);
    refreshTarget(0);
  }

  function commitAxisResult(nextLevel: number, nextTestIndex: number) {
    const score = Math.floor((nextLevel / 20) * 100);
    setResults((current) => {
      const next = [...current];
      next[testIndex] = score;
      return next;
    });
    setLevel(0);
    setErrors(0);
    setTestIndex(nextTestIndex);
    if (nextTestIndex <= 2) {
      refreshTarget(nextTestIndex);
    }
  }

  function handleHit(success: boolean) {
    if (!started || testIndex > 2) {
      return;
    }

    if (success) {
      const nextLevel = level + 1;
      if (nextLevel >= 20) {
        commitAxisResult(nextLevel, testIndex + 1);
      } else {
        setLevel(nextLevel);
        setErrors(0);
        refreshTarget();
      }
      return;
    }

    const nextErrors = errors + 1;
    if (nextErrors >= 2) {
      commitAxisResult(level, testIndex + 1);
      return;
    }

    setErrors(nextErrors);
    refreshTarget();
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const col = Math.floor(((event.clientX - rect.left) * scaleX) / 24);
    const row = Math.floor(((event.clientY - rect.top) * scaleY) / 24);
    const success = Math.abs(row - target.row) <= 1 && Math.abs(col - target.col) <= 1;
    handleHit(success);
  }

  const finished = started && testIndex > 2;
  const diagnosis = results[0] > 80 ? text.mosaic.diagnosisNormal : text.mosaic.diagnosisDiff;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/games" className="inline-flex items-center gap-2 rounded-none border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
          <ArrowLeft className="h-4 w-4" />
          {text.common.backHome}
        </Link>
      </div>

      <PageHeader eyebrow="Threshold" title={text.mosaic.title} body={text.mosaic.intro} />

      {!started ? (
        <div className="theme-card p-6">
          <button type="button" onClick={start} className="rounded-none bg-[#d6643e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">{text.mosaic.start}</button>
        </div>
      ) : null}

      {started && !finished ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="theme-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">{text.mosaic.axes[testIndex]}</h2>
              <span className="rounded-none bg-[#F7F7F4] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Level {level + 1}</span>
            </div>
            <div className="mt-5 flex justify-center rounded-none border theme-card-border bg-[#1e1714] p-4">
              <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full max-w-[520px] cursor-crosshair rounded-none" />
            </div>
          </article>

          <article className="theme-card p-5">
            <div className="space-y-3">
              {text.mosaic.axes.map((axis, index) => (
                <div key={axis} className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
                  <p className="text-sm font-semibold text-stone-500">{axis}</p>
                  <p className="mt-2 text-3xl font-bold text-stone-900">{axisProgress[index]}%</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => handleHit(false)} className="mt-4 rounded-none border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">{text.mosaic.cantSee}</button>
          </article>
        </section>
      ) : null}

      {finished ? (
        <section className="theme-card p-6">
          <p className="theme-kicker">{text.mosaic.resultTitle}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {text.mosaic.axes.map((axis, index) => (
              <div key={axis} className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
                <p className="text-sm font-semibold text-stone-500">{axis}</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">{results[index]}%</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-none border theme-card-border bg-[#F7F7F4] p-5 text-sm leading-7 text-stone-600">
            {diagnosis}
          </div>
          <button type="button" onClick={start} className="mt-5 rounded-none bg-[#d6643e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b95a38]">{text.mosaic.reset}</button>
        </section>
      ) : null}
    </div>
  );
}
