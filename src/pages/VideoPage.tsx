import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, Clapperboard, Lightbulb, TimerReset, Video } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import TypePills from '@/components/TypePills';
import { copy, cvdTypes, type CvdType } from '@/data/appData';
import { useAppStore } from '@/store/appStore';
import { analyzeVideoImpact, classifyImpactScore, drawVideoFrame, type ImpactLevel, type VideoImpactAnalysis } from '@/utils/colorVision';

const impactLevelLabels = {
  zh: {
    low: '轻度影响',
    medium: '中度影响',
    high: '高影响',
    critical: '严重影响',
  },
  en: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  },
} as const;

const timelineCurveColors: Record<Exclude<CvdType, 'normal'>, { stroke: string; fill: string }> = {
  protanopia: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.12)' },
  deuteranopia: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.12)' },
  tritanopia: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.12)' },
  protanomaly: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.12)' },
  deuteranomaly: { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.12)' },
  tritanomaly: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.12)' },
};

function getImpactTone(level: ImpactLevel): string {
  if (level === 'critical') {
    return 'bg-rose-100 text-rose-700';
  }
  if (level === 'high') {
    return 'bg-amber-100 text-amber-700';
  }
  if (level === 'medium') {
    return 'bg-sky-100 text-sky-700';
  }
  return 'bg-emerald-100 text-emerald-700';
}

function formatSeconds(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getHeatmapTone(score: number): string {
  if (score >= 75) {
    return 'linear-gradient(180deg, #ef4444 0%, #7f1d1d 100%)';
  }
  if (score >= 55) {
    return 'linear-gradient(180deg, #f97316 0%, #9a3412 100%)';
  }
  if (score >= 30) {
    return 'linear-gradient(180deg, #f59e0b 0%, #92400e 100%)';
  }
  return 'linear-gradient(180deg, #34d399 0%, #065f46 100%)';
}

function buildTimelineCurvePath(scores: number[]): string {
  if (!scores.length) {
    return '';
  }

  const step = 10;
  if (scores.length === 1) {
    const y = 100 - scores[0];
    return `M 5 ${y} L 5 ${y}`;
  }

  return scores
    .map((score, index) => {
      const x = index * step + 5;
      const y = 100 - Math.max(0, Math.min(score, 100));
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function getRiskTone(level: ImpactLevel): string {
  if (level === 'critical') {
    return 'bg-rose-100 text-rose-700 border-rose-200';
  }
  if (level === 'high') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (level === 'medium') {
    return 'bg-sky-100 text-sky-700 border-sky-200';
  }
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

interface RiskRange {
  start: number;
  end: number;
  maxScore: number;
  dominantType: Exclude<CvdType, 'normal'>;
  startIndex: number;
  endIndex: number;
}

interface RangeAdvice extends RiskRange {
  title: string;
  issueTypes: Array<'caption' | 'redGreen' | 'bluePurple' | 'transition' | 'sceneConsistency'>;
  actions: string[];
}

type IssueType = RangeAdvice['issueTypes'][number];

interface AdviceGroup {
  key: IssueType;
  title: string;
  items: RangeAdvice[];
}

type SegmentKey = 'front' | 'middle' | 'back';

function buildRiskRanges(analysis: VideoImpactAnalysis, threshold = 55): RiskRange[] {
  const flagged = analysis.timeline
    .map((frame, index) => ({ ...frame, index }))
    .filter((frame) => frame.dominantScore >= threshold);

  if (!flagged.length) {
    return [];
  }

  const times = analysis.timeline.map((frame) => frame.time);
  const frameWindow = (index: number) => {
    const current = times[index];
    const prev = index > 0 ? times[index - 1] : current;
    const next = index < times.length - 1 ? times[index + 1] : current;
    const start = index > 0 ? (prev + current) / 2 : Math.max(0, current - (next - current) / 2);
    const end = index < times.length - 1 ? (current + next) / 2 : current + (current - prev) / 2;
    return { start, end };
  };

  const ranges: RiskRange[] = [];

  for (const frame of flagged) {
    const window = frameWindow(frame.index);
    const previousRange = ranges[ranges.length - 1];

    if (!previousRange || window.start > previousRange.end + 0.12) {
      ranges.push({
        start: Math.max(0, window.start),
        end: Math.max(window.end, window.start),
        maxScore: frame.dominantScore,
        dominantType: frame.dominantType,
        startIndex: frame.index,
        endIndex: frame.index,
      });
      continue;
    }

    previousRange.end = Math.max(previousRange.end, window.end);
    previousRange.endIndex = frame.index;
    if (frame.dominantScore >= previousRange.maxScore) {
      previousRange.maxScore = frame.dominantScore;
      previousRange.dominantType = frame.dominantType;
    }
  }

  return ranges;
}

function buildRangeAdvice(range: RiskRange, language: 'zh' | 'en'): RangeAdvice {
  const duration = Math.max(0, range.end - range.start);
  const actions: string[] = [];
  const issueTypes: RangeAdvice['issueTypes'] = [];

  if (range.maxScore >= 75) {
    issueTypes.push('transition');
    actions.push(
      language === 'zh'
        ? '降低该区间的转场速度，并让标题、按钮或提示信息至少多停留 0.5 到 1 秒。'
        : 'Slow this section down and keep titles, CTAs, or alerts on screen for at least 0.5 to 1 second longer.',
    );
  } else {
    issueTypes.push('caption');
    actions.push(
      language === 'zh'
        ? '先检查这一段是否有只靠颜色表达的状态、图标或说明文案。'
        : 'Check whether this section relies on color alone for state, icons, or explanatory text.',
    );
  }

  if (range.dominantType.includes('protan') || range.dominantType.includes('deuter')) {
    issueTypes.push('redGreen');
    actions.push(
      language === 'zh'
        ? '把红绿对立信息改成“颜色 + 图标/描边/文字”双编码，并拉开明度差。'
        : 'Convert red-green distinctions into dual encoding with icons, outlines, or labels, and increase luminance contrast.',
    );
  }

  if (range.dominantType.includes('tritan')) {
    issueTypes.push('bluePurple', 'caption');
    actions.push(
      language === 'zh'
        ? '避免把细文字压在蓝紫渐变或冷色高亮上，改用浅底深字或增加字幕底板。'
        : 'Avoid placing fine text on blue-purple gradients or cool highlights; switch to high-luminance contrast or add caption backplates.',
    );
  }

  if (duration >= 2.5) {
    issueTypes.push('sceneConsistency');
    actions.push(
      language === 'zh'
        ? '这是连续风险区间，建议整段统一调整背景、字幕样式和状态颜色，而不是只修单帧。'
        : 'This is a sustained risk range. Standardize the background, caption style, and state colors across the full scene instead of patching one frame.',
    );
  } else {
    actions.push(
      language === 'zh'
        ? '这是短时高风险片段，优先加强该镜头的字幕底板、边界和高对比提示。'
        : 'This is a short high-risk moment. Strengthen caption backplates, boundaries, and high-contrast hints in this shot.',
    );
  }

  return {
    ...range,
    title:
      language === 'zh'
        ? `建议优先修改 ${formatSeconds(range.start)} - ${formatSeconds(range.end)}`
        : `Review ${formatSeconds(range.start)} - ${formatSeconds(range.end)} first`,
    issueTypes: [...new Set(issueTypes)],
    actions,
  };
}

function buildAdviceGroups(rangeAdvice: RangeAdvice[], language: 'zh' | 'en'): AdviceGroup[] {
  const titles = {
    zh: {
      caption: '字幕可读性',
      redGreen: '红绿区分',
      bluePurple: '蓝紫背景',
      transition: '转场节奏',
      sceneConsistency: '整段一致性',
    },
    en: {
      caption: 'Caption Readability',
      redGreen: 'Red-Green Distinction',
      bluePurple: 'Blue-Purple Backgrounds',
      transition: 'Transition Timing',
      sceneConsistency: 'Scene Consistency',
    },
  } as const;

  const order: AdviceGroup['key'][] = ['caption', 'redGreen', 'bluePurple', 'transition', 'sceneConsistency'];

  return order
    .map((key) => ({
      key,
      title: titles[language][key],
      items: rangeAdvice.filter((item) => item.issueTypes.includes(key)),
    }))
    .filter((group) => group.items.length > 0);
}

function getIssueGroupTone(key: IssueType): string {
  if (key === 'caption') {
    return 'bg-sky-100 text-sky-700 border-sky-200';
  }
  if (key === 'redGreen') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (key === 'bluePurple') {
    return 'bg-violet-100 text-violet-700 border-violet-200';
  }
  if (key === 'transition') {
    return 'bg-rose-100 text-rose-700 border-rose-200';
  }
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function getSegmentOverlap(start: number, end: number, segmentStart: number, segmentEnd: number): number {
  return Math.max(0, Math.min(end, segmentEnd) - Math.max(start, segmentStart));
}

function getSegmentBounds(totalDuration: number): Record<SegmentKey, { start: number; end: number }> {
  const firstEnd = totalDuration / 3;
  const secondEnd = (totalDuration * 2) / 3;
  return {
    front: { start: 0, end: firstEnd },
    middle: { start: firstEnd, end: secondEnd },
    back: { start: secondEnd, end: totalDuration },
  };
}

export default function VideoPage() {
  const language = useAppStore((state) => state.language);
  const videoType = useAppStore((state) => state.videoType);
  const setVideoType = useAppStore((state) => state.setVideoType);
  const text = copy[language];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulatedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoName, setVideoName] = useState('');
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });
  const [analysis, setAnalysis] = useState<VideoImpactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);
  const [selectedIssueFilters, setSelectedIssueFilters] = useState<IssueType[]>([]);
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<SegmentKey | null>(null);
  const typeMeta = useMemo(() => cvdTypes.find((item) => item.key === videoType), [videoType]);
  const labels = impactLevelLabels[language];
  const hoveredFrame = hoveredFrameIndex !== null ? analysis?.timeline[hoveredFrameIndex] ?? null : null;
  const recommendation = useMemo(() => {
    if (!analysis) {
      return null;
    }

    const overallLevel = classifyImpactScore(analysis.overallScore);
    const dominantMeta = cvdTypes.find((item) => item.key === analysis.dominantType);
    const highestPeak = analysis.summaries.reduce((current, summary) => Math.max(current, summary.peakScore), 0);
    const focusFrames = analysis.frames.slice(0, 3);
    const riskRanges = buildRiskRanges(analysis);
    const rangeAdvice = riskRanges.map((range) => buildRangeAdvice(range, language));
    const adviceGroups = buildAdviceGroups(rangeAdvice, language);
    const suggestions: string[] = [];

    if (analysis.overallScore >= 55) {
      suggestions.push(
        language === 'zh'
          ? '优先重做关键提示镜头，避免仅依赖颜色区分状态、按钮或信息层级。'
          : 'Prioritize key scenes and avoid using color alone for state, CTA, or information hierarchy.',
      );
    } else if (analysis.overallScore >= 30) {
      suggestions.push(
        language === 'zh'
          ? '给核心信息增加文字、图标或描边，降低中等风险片段对识别的影响。'
          : 'Add text, icons, or outlines to core information so medium-risk moments stay readable.',
      );
    } else {
      suggestions.push(
        language === 'zh'
          ? '整体风险较低，继续重点检查高峰值片段和转场镜头。'
          : 'Overall risk is low. Keep checking peak moments and transitions.',
      );
    }

    if (analysis.dominantType.includes('protan') || analysis.dominantType.includes('deuter')) {
      suggestions.push(
        language === 'zh'
          ? '主风险集中在红绿轴，避免红色与绿色承担唯一语义，改用明度差和形状差异辅助表达。'
          : 'Risk concentrates on the red-green axis. Add luminance and shape cues instead of relying on red versus green alone.',
      );
    }

    if (analysis.dominantType.includes('tritan')) {
      suggestions.push(
        language === 'zh'
          ? '主风险集中在蓝紫轴，减少蓝紫渐变背景上的细文字，并提高文字与底色的亮度对比。'
          : 'Risk concentrates on the blue-purple axis. Avoid fine text on blue-purple gradients and raise luminance contrast.',
      );
    }

    if (highestPeak >= 75) {
      suggestions.push(
        language === 'zh'
          ? '存在严重峰值片段，建议放慢该时段转场速度，给关键信息留出更长停留时间。'
          : 'A critical peak exists. Slow down that transition and give critical information more dwell time.',
      );
    } else if (highestPeak >= 55) {
      suggestions.push(
        language === 'zh'
          ? '存在高风险瞬时片段，建议为对应镜头增加底板、阴影或高对比字幕。'
          : 'A high-risk moment exists. Add backplates, shadows, or higher-contrast captions in that section.',
      );
    }

    if (riskRanges.length >= 2) {
      suggestions.push(
        language === 'zh'
          ? '高风险并非集中在单点，建议按区间复查镜头组，统一调整配色、字幕底板和状态提示样式。'
          : 'Risk appears across multiple stretches. Review scene groups instead of isolated frames and standardize color, caption backplates, and state cues.',
      );
    }

    const riskSummary =
      language === 'zh'
        ? overallLevel === 'critical'
          ? `综合影响较高，${dominantMeta?.names.zh ?? '目标人群'}在多段画面中存在明显识别风险，应优先优化。`
          : overallLevel === 'high'
            ? `综合影响偏高，${dominantMeta?.names.zh ?? '目标人群'}在关键片段里可能难以稳定识别内容。`
            : overallLevel === 'medium'
              ? `综合影响中等，${dominantMeta?.names.zh ?? '目标人群'}在部分镜头和转场中会受到干扰。`
              : `综合影响较低，当前视频整体可接受，但仍建议检查高峰值片段。`
        : overallLevel === 'critical'
          ? `Overall impact is critical. ${dominantMeta?.names.en ?? 'The dominant audience'} is likely to miss important content across multiple scenes.`
          : overallLevel === 'high'
            ? `Overall impact is high. ${dominantMeta?.names.en ?? 'The dominant audience'} may struggle in key moments.`
            : overallLevel === 'medium'
              ? `Overall impact is moderate. ${dominantMeta?.names.en ?? 'The dominant audience'} may be affected in some scenes and transitions.`
              : `Overall impact is low. The video is broadly acceptable, but peak moments still deserve review.`;

    return {
      level: overallLevel,
      riskSummary,
      focusFrames,
      riskRanges,
      rangeAdvice,
      adviceGroups,
      suggestions,
    };
  }, [analysis, language]);
  const timelineCurves = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return analysis.summaries.map((summary) => ({
      type: summary.type,
      path: buildTimelineCurvePath(analysis.timeline.map((frame) => frame.scores[summary.type])),
      color: timelineCurveColors[summary.type],
      meta: cvdTypes.find((item) => item.key === summary.type),
    }));
  }, [analysis]);
  const segmentBounds = useMemo(() => getSegmentBounds(analysis?.duration ?? 0), [analysis?.duration]);
  const issueFilteredRangeAdvice = useMemo(() => {
    if (!recommendation) {
      return [];
    }
    if (!selectedIssueFilters.length) {
      return recommendation.rangeAdvice;
    }
    return recommendation.rangeAdvice.filter((range) =>
      range.issueTypes.some((issueType) => selectedIssueFilters.includes(issueType)),
    );
  }, [recommendation, selectedIssueFilters]);
  const highlightedRanges = useMemo(() => {
    if (!issueFilteredRangeAdvice.length) {
      return [];
    }
    if (!selectedSegmentFilter) {
      return issueFilteredRangeAdvice;
    }
    const activeBounds = segmentBounds[selectedSegmentFilter];
    return issueFilteredRangeAdvice.filter((range) => getSegmentOverlap(range.start, range.end, activeBounds.start, activeBounds.end) > 0);
  }, [issueFilteredRangeAdvice, segmentBounds, selectedSegmentFilter]);
  const filteredAdviceGroups = useMemo(() => {
    if (!recommendation) {
      return [];
    }
    return recommendation.adviceGroups
      .filter((group) => !selectedIssueFilters.length || selectedIssueFilters.includes(group.key))
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          highlightedRanges.some((range) => range.start === item.start && range.end === item.end && range.startIndex === item.startIndex),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [highlightedRanges, recommendation, selectedIssueFilters]);
  const filterStats = useMemo(() => {
    const matchedRanges = highlightedRanges.length;
    const coveredDuration = highlightedRanges.reduce((sum, range) => sum + Math.max(0, range.end - range.start), 0);
    const totalDuration = analysis?.duration ?? 0;
    const coverageRatio = totalDuration > 0 ? (coveredDuration / totalDuration) * 100 : 0;
    const segments = issueFilteredRangeAdvice.reduce(
      (accumulator, range) => {
        accumulator.front += getSegmentOverlap(range.start, range.end, segmentBounds.front.start, segmentBounds.front.end);
        accumulator.middle += getSegmentOverlap(range.start, range.end, segmentBounds.middle.start, segmentBounds.middle.end);
        accumulator.back += getSegmentOverlap(range.start, range.end, segmentBounds.back.start, segmentBounds.back.end);
        return accumulator;
      },
      { front: 0, middle: 0, back: 0 },
    );
    const orderedSegments = [
      { key: 'front', value: segments.front },
      { key: 'middle', value: segments.middle },
      { key: 'back', value: segments.back },
    ].sort((left, right) => right.value - left.value);
    const dominantSegment = orderedSegments[0];
    const secondSegment = orderedSegments[1];
    const segmentLabels =
      language === 'zh'
        ? { front: '前段', middle: '中段', back: '后段' }
        : { front: 'early', middle: 'middle', back: 'late' };
    const trendSummary =
      coveredDuration <= 0 || totalDuration <= 0
        ? language === 'zh'
          ? '当前筛选条件下暂无明显风险分布。'
          : 'No clear risk distribution is detected under the current filter.'
        : dominantSegment.value >= secondSegment.value * 1.35
          ? language === 'zh'
            ? `问题主要集中在视频${segmentLabels[dominantSegment.key as keyof typeof segmentLabels]}。`
            : `Issues are mainly concentrated in the ${segmentLabels[dominantSegment.key as keyof typeof segmentLabels]} part of the video.`
          : language === 'zh'
            ? `问题在视频${segmentLabels[dominantSegment.key as keyof typeof segmentLabels]}和${segmentLabels[secondSegment.key as keyof typeof segmentLabels]}分布更集中。`
            : `Issues are more concentrated across the ${segmentLabels[dominantSegment.key as keyof typeof segmentLabels]} and ${segmentLabels[secondSegment.key as keyof typeof segmentLabels]} parts of the video.`;
    const segmentDurations = {
      front: Math.max(segmentBounds.front.end - segmentBounds.front.start, 0),
      middle: Math.max(segmentBounds.middle.end - segmentBounds.middle.start, 0),
      back: Math.max(segmentBounds.back.end - segmentBounds.back.start, 0),
    };
    const densitySegments = [
      { key: 'front', covered: segments.front, duration: segmentDurations.front, label: text.video.earlySegment, start: segmentBounds.front.start, end: segmentBounds.front.end },
      { key: 'middle', covered: segments.middle, duration: segmentDurations.middle, label: text.video.middleSegment, start: segmentBounds.middle.start, end: segmentBounds.middle.end },
      { key: 'back', covered: segments.back, duration: segmentDurations.back, label: text.video.lateSegment, start: segmentBounds.back.start, end: segmentBounds.back.end },
    ].map((segment) => ({
      ...segment,
      density: segment.duration > 0 ? (segment.covered / segment.duration) * 100 : 0,
    }));
    const maxDensity = densitySegments.reduce((currentMax, segment) => Math.max(currentMax, segment.density), 0);
    return {
      matchedRanges,
      coveredDuration,
      coverageRatio,
      trendSummary,
      densitySegments: densitySegments.map((segment) => ({
        ...segment,
        isHighlighted: segment.density > 0 && segment.density === maxDensity,
        isSelected: selectedSegmentFilter === segment.key,
      })),
    };
  }, [analysis?.duration, highlightedRanges, issueFilteredRangeAdvice, language, segmentBounds, selectedSegmentFilter, text.video.earlySegment, text.video.lateSegment, text.video.middleSegment]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const originalCanvas = originalCanvasRef.current;
    const simulatedCanvas = simulatedCanvasRef.current;
    if (!video || !originalCanvas || !simulatedCanvas || !videoSrc) {
      return;
    }

    const drawCurrentFrame = () => {
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }

      try {
        setRenderSize(drawVideoFrame(video, originalCanvas, simulatedCanvas, videoType));
      } catch {
        setRenderSize({ width: 0, height: 0 });
      }
    };

    const startLoop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const render = () => {
        drawCurrentFrame();
        if (!video.paused && !video.ended) {
          animationFrameRef.current = requestAnimationFrame(render);
        }
      };

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const stopLoop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const handleLoaded = () => {
      drawCurrentFrame();
      if (!video.paused && !video.ended) {
        startLoop();
      }
    };

    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('seeked', drawCurrentFrame);
    video.addEventListener('pause', drawCurrentFrame);
    video.addEventListener('play', startLoop);
    video.addEventListener('ended', stopLoop);

    drawCurrentFrame();

    return () => {
      stopLoop();
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('seeked', drawCurrentFrame);
      video.removeEventListener('pause', drawCurrentFrame);
      video.removeEventListener('play', startLoop);
      video.removeEventListener('ended', stopLoop);
    };
  }, [videoSrc, videoType]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoSrc(url);
    setVideoName(file.name);
    setRenderSize({ width: 0, height: 0 });
    setAnalysis(null);
    setAnalysisError('');
    setHoveredFrameIndex(null);
    setSelectedIssueFilters([]);
    setSelectedSegmentFilter(null);
  }

  async function handleAnalyze() {
    if (!videoSrc || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const result = await analyzeVideoImpact(videoSrc);
      setAnalysis(result);
      setHoveredFrameIndex(0);
      setSelectedIssueFilters([]);
      setSelectedSegmentFilter(null);
    } catch {
      setAnalysis(null);
      setAnalysisError(language === 'zh' ? '视频分析失败，请尝试重新上传或更换视频文件。' : 'Video analysis failed. Please try another file.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function jumpToTime(time: number, hoveredIndex?: number) {
    const video = videoRef.current;
    if (!video || Number.isNaN(time)) {
      return;
    }

    const safeTime = Math.max(0, Math.min(time, Number.isFinite(video.duration) && video.duration > 0 ? video.duration : time));
    const wasPaused = video.paused;

    try {
      video.currentTime = safeTime;
      if (!wasPaused) {
        void video.play().catch(() => undefined);
      }
    } catch {
      return;
    }

    if (hoveredIndex !== undefined) {
      setHoveredFrameIndex(hoveredIndex);
      return;
    }

    if (analysis) {
      const matchedIndex = analysis.timeline.findIndex((frame) => Math.abs(frame.time - safeTime) < 0.2);
      if (matchedIndex >= 0) {
        setHoveredFrameIndex(matchedIndex);
      }
    }
  }

  function toggleIssueFilter(issueType: IssueType) {
    setSelectedIssueFilters((current) =>
      current.includes(issueType) ? current.filter((item) => item !== issueType) : [...current, issueType],
    );
    setSelectedSegmentFilter(null);
  }

  function toggleSegmentFilter(segmentKey: SegmentKey) {
    setSelectedSegmentFilter((current) => (current === segmentKey ? null : segmentKey));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Video Mode" title={text.video.title} body={text.video.body} />

      <section className="grid gap-6">
        <div className="theme-card bg-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#f4efe7] text-[#d6643e]">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <p className="theme-kicker">Simulate</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">
                {typeMeta?.names[language]}
                <span className="ml-2 align-middle font-sans text-sm font-normal tracking-normal text-stone-600">
                  {typeMeta?.descriptions[language]}
                  {typeMeta?.prevalence ? ` · ${typeMeta.prevalence[language]}` : ''}
                </span>
              </h2>
            </div>
          </div>

          <div className="mt-5">
            <TypePills language={language} value={videoType} onChange={setVideoType} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-none bg-[#d6643e] px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-[#b95a38]">
              <Video className="h-4 w-4" />
              {text.common.uploadVideo}
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!videoSrc || isAnalyzing}
              className={[
                'inline-flex w-full items-center justify-center gap-2 rounded-none px-4 py-3 text-sm font-semibold transition',
                !videoSrc || isAnalyzing
                  ? 'cursor-not-allowed bg-[#F7F7F4] text-[#C3C3C3]'
                  : 'bg-[#d6643e] text-white hover:bg-[#b95a38]',
              ].join(' ')}
            >
              <BarChart3 className="h-4 w-4" />
              {isAnalyzing ? text.video.analyzing : text.video.analyze}
            </button>
          </div>

          {analysis ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="theme-soft-card p-4">
                <p className="theme-kicker">{text.video.overall}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-3xl font-bold text-stone-900">{analysis.overallScore.toFixed(1)}</p>
                  {recommendation ? (
                    <span className={['rounded-none border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]', getRiskTone(recommendation.level)].join(' ')}>
                      {labels[recommendation.level]}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="theme-soft-card p-4">
                <p className="theme-kicker">{text.video.dominant}</p>
                <p className="mt-2 text-xl font-semibold text-stone-900">
                  {cvdTypes.find((item) => item.key === analysis.dominantType)?.names[language]}
                </p>
              </div>
              <div className="theme-soft-card p-4">
                <p className="theme-kicker">{text.video.sampleCount}</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">{analysis.sampleCount}</p>
              </div>
            </div>
          ) : null}

          {analysisError ? (
            <div className="mt-4 rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {analysisError}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="theme-card bg-transparent p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">{text.video.original}</h3>
              {renderSize.width > 0 ? (
                <span className="theme-chip">
                  {renderSize.width} x {renderSize.height}
                </span>
              ) : null}
            </div>
            <div className="theme-soft-card flex min-h-[320px] items-center justify-center p-4">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls
                  muted
                  playsInline
                  className="max-h-[560px] max-w-full rounded-none"
                />
              ) : (
                <p className="w-full text-center text-sm text-stone-500">{text.common.emptyVideo}</p>
              )}
            </div>
          </article>

          <article className="theme-card bg-transparent p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-stone-900">{typeMeta?.names[language] || text.video.simulated}</h3>
              {renderSize.width > 0 ? (
                <span className="theme-chip">
                  {renderSize.width} x {renderSize.height}
                </span>
              ) : null}
            </div>
            <div className="theme-soft-card flex min-h-[320px] items-center justify-center p-4">
              {videoSrc ? (
                <canvas ref={simulatedCanvasRef} className="max-h-[560px] max-w-full rounded-none" />
              ) : (
                <p className="w-full text-center text-sm text-stone-500">{text.common.emptyVideo}</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="theme-card bg-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#f4efe7] text-[#d6643e]">
            <TimerReset className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">{text.video.timeline}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">{text.video.timelineBody}</p>
          </div>
        </div>

        {analysis ? (
          <div className="mt-5">
            <div className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              {hoveredFrame ? (
                <div className="mb-4 rounded-none border theme-card-border bg-white/95 p-4 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                        {language === 'zh' ? '当前悬停时间点' : 'Hovered sample'}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-stone-900">{formatSeconds(hoveredFrame.time)}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {language === 'zh' ? '主受影响人群：' : 'Dominant audience: '}
                        {cvdTypes.find((item) => item.key === hoveredFrame.dominantType)?.names[language]}
                      </p>
                    </div>
                    <div className="rounded-none bg-[#F7F7F4] px-4 py-3 text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                        {language === 'zh' ? '主影响分' : 'Top score'}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-stone-900">{hoveredFrame.dominantScore.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {analysis.summaries.map((summary) => {
                      const meta = cvdTypes.find((item) => item.key === summary.type);
                      const color = timelineCurveColors[summary.type];
                      return (
                        <div key={`tooltip-${summary.type}`} className="rounded-none border theme-card-border bg-[#fcfaf8] px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-none" style={{ backgroundColor: color.stroke }} />
                              <p className="text-sm font-semibold text-stone-900">{meta?.names[language]}</p>
                            </div>
                            <p className="text-lg font-bold text-stone-900">{hoveredFrame.scores[summary.type].toFixed(1)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div
                className="overflow-x-auto pb-2"
                style={{
                  scrollbarWidth: 'thin',
                }}
              >
                <div
                  className="min-w-[560px]"
                  style={{
                    width: `max(100%, ${analysis.timeline.length * 34}px)`,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${analysis.timeline.length}, minmax(30px, 1fr))`,
                      gap: '0.25rem',
                    }}
                  >
                    {highlightedRanges.map((range) => {
                      const left = (range.startIndex / analysis.timeline.length) * 100;
                      const width = ((range.endIndex - range.startIndex + 1) / analysis.timeline.length) * 100;
                      return (
                        <div
                          key={`overlay-${range.start}-${range.end}`}
                          className="pointer-events-none absolute inset-y-0 z-0 rounded-none border border-rose-300/80 bg-rose-200/20"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                        />
                      );
                    })}
                    {analysis.timeline.map((frame, index) => {
                      return (
                        <div key={`${frame.time}-${index}`} className="z-10 flex flex-col justify-end">
                          <button
                            type="button"
                            className={[
                              'h-24 w-full rounded-t-[14px] transition',
                              hoveredFrameIndex === index ? 'scale-y-[1.02] ring-2 ring-white/90 ring-offset-2 ring-offset-[#fbf6f1]' : 'hover:scale-y-[1.02]',
                            ].join(' ')}
                            style={{
                              background: getHeatmapTone(frame.dominantScore),
                              opacity: 0.45 + frame.dominantScore / 180,
                            }}
                            onMouseEnter={() => setHoveredFrameIndex(index)}
                            onFocus={() => setHoveredFrameIndex(index)}
                            onClick={() => jumpToTime(frame.time, index)}
                            aria-label={`${formatSeconds(frame.time)} ${frame.dominantScore.toFixed(1)}`}
                          />
                        </div>
                      );
                    })}

                    <svg
                      viewBox={`0 0 ${analysis.timeline.length * 10} 100`}
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-24 w-full overflow-visible"
                    >
                      {timelineCurves.map((curve) => (
                        <path
                          key={`fill-${curve.type}`}
                          d={`${curve.path} L ${(analysis.timeline.length - 1) * 10 + 5} 100 L 5 100 Z`}
                          fill={curve.color.fill}
                        />
                      ))}
                      {timelineCurves.map((curve) => (
                        <path
                          key={curve.type}
                          d={curve.path}
                          fill="none"
                          stroke={curve.color.stroke}
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>
                  </div>

                  <div
                    className="mt-2"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${analysis.timeline.length}, minmax(30px, 1fr))`,
                      gap: '0.25rem',
                    }}
                  >
                    {analysis.timeline.map((frame, index) => (
                      <button
                        type="button"
                        key={`label-${frame.time}-${index}`}
                        className={[
                          'text-center text-[11px] font-semibold transition',
                          hoveredFrameIndex === index ? 'text-stone-900' : 'text-stone-500',
                        ].join(' ')}
                        onMouseEnter={() => setHoveredFrameIndex(index)}
                        onFocus={() => setHoveredFrameIndex(index)}
                        onClick={() => jumpToTime(frame.time, index)}
                      >
                        {analysis.timeline.length <= 10 || index % 2 === 0 ? formatSeconds(frame.time) : '·'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <div key={level} className="inline-flex items-center gap-2 rounded-none bg-white px-3 py-2 text-xs font-semibold text-stone-600">
                    <span className="h-3 w-3 rounded-none" style={{ background: getHeatmapTone(level === 'low' ? 10 : level === 'medium' ? 40 : level === 'high' ? 65 : 85) }} />
                    {labels[level]}
                  </div>
                ))}
                {highlightedRanges.length ? (
                  <div className="inline-flex items-center gap-2 rounded-none bg-white px-3 py-2 text-xs font-semibold text-stone-600">
                    <span className="h-3 w-3 rounded-none border border-rose-300 bg-rose-200/50" />
                    {!selectedIssueFilters.length
                      ? text.video.highRiskRanges
                      : `${text.video.highRiskRanges} · ${selectedIssueFilters.length}`}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {timelineCurves.map((curve) => (
                  <div key={`legend-${curve.type}`} className="inline-flex items-center gap-2 rounded-none bg-white px-3 py-2 text-xs font-semibold text-stone-600">
                    <span className="h-2.5 w-5 rounded-none" style={{ backgroundColor: curve.color.stroke }} />
                    {curve.meta?.names[language]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-none border border-dashed theme-card-border bg-[#F7F7F4] p-5 text-sm leading-7 text-stone-500">
            {text.video.noAnalysis}
          </div>
        )}
      </section>

      <section className="theme-card bg-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#f4efe7] text-[#d6643e]">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">{text.video.recommendationTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">{text.video.recommendationBody}</p>
          </div>
        </div>

        {analysis && recommendation ? (
          <div className="mt-5 grid gap-6 [grid-template-columns:1fr]">
            <article className="theme-soft-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="theme-kicker">{text.video.riskLevel}</p>
                  <h4 className="mt-2 text-2xl font-bold text-stone-900">{labels[recommendation.level]}</h4>
                </div>
                <span className={['rounded-none border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]', getRiskTone(recommendation.level)].join(' ')}>
                  {analysis.overallScore.toFixed(1)}
                </span>
              </div>

              <div className="mt-4 rounded-none bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-stone-900" />
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{text.video.riskSummary}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{recommendation.riskSummary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-none bg-white px-4 py-4">
                <p className="text-sm font-semibold text-stone-900">{text.video.focusSegments}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.focusFrames.map((frame) => (
                    <button
                      key={`focus-${frame.time}`}
                      type="button"
                      onClick={() => jumpToTime(frame.time)}
                      className="theme-pill"
                    >
                      {formatSeconds(frame.time)} · {frame.dominantScore.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-none bg-white px-4 py-4">
                <p className="text-sm font-semibold text-stone-900">{text.video.highRiskRanges}</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">{text.video.rangeHint}</p>
                <div className="mt-3 grid gap-2">
                  {highlightedRanges.length ? (
                    highlightedRanges.map((range) => {
                      const meta = cvdTypes.find((item) => item.key === range.dominantType);
                      return (
                        <button
                          key={`range-${range.start}-${range.end}`}
                          type="button"
                          onClick={() => jumpToTime(range.start, range.startIndex)}
                          className="theme-soft-card flex items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white"
                        >
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {formatSeconds(range.start)} - {formatSeconds(range.end)}
                            </p>
                            <p className="text-xs text-stone-500">{meta?.names[language]}</p>
                          </div>
                          <span className="rounded-none bg-white px-3 py-1 text-xs font-bold text-stone-700">
                            {range.maxScore.toFixed(1)}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-none border border-dashed theme-card-border px-4 py-3 text-sm text-stone-500">
                      {language === 'zh' ? '当前没有持续高风险区间。' : 'No sustained high-risk ranges detected.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-none bg-white px-4 py-4">
                <p className="text-sm font-semibold text-stone-900">{text.video.rangeAdvice}</p>
                <div className="theme-soft-card mt-3 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{text.video.issueFilter}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{text.video.issueFilterHint}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIssueFilters([]);
                        setSelectedSegmentFilter(null);
                      }}
                      className={[
                        'theme-pill text-xs',
                        !selectedIssueFilters.length ? 'theme-pill-active' : '',
                      ].join(' ')}
                    >
                      {text.video.issueFilterAll}
                    </button>
                    {recommendation.adviceGroups.map((group) => (
                      <button
                        key={`filter-${group.key}`}
                        type="button"
                        onClick={() => toggleIssueFilter(group.key)}
                        className={[
                          'rounded-none border px-3 py-2 text-xs font-semibold transition',
                          selectedIssueFilters.includes(group.key)
                            ? getIssueGroupTone(group.key)
                            : 'theme-card-border bg-white text-stone-600 hover:bg-stone-50',
                        ].join(' ')}
                      >
                        {group.title}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-none border theme-card-border bg-white px-4 py-4">
                      <p className="theme-kicker">{text.video.matchedRanges}</p>
                      <p className="mt-2 text-2xl font-bold text-stone-900">{filterStats.matchedRanges}</p>
                    </div>
                    <div className="rounded-none border theme-card-border bg-white px-4 py-4">
                      <p className="theme-kicker">{text.video.coveredDuration}</p>
                      <p className="mt-2 text-2xl font-bold text-stone-900">{filterStats.coveredDuration.toFixed(1)}s</p>
                    </div>
                    <div className="rounded-none border theme-card-border bg-white px-4 py-4">
                      <p className="theme-kicker">{text.video.coverageRatio}</p>
                      <p className="mt-2 text-2xl font-bold text-stone-900">{filterStats.coverageRatio.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-none border theme-card-border bg-white px-4 py-4">
                    <p className="theme-kicker">{text.video.trendSummary}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-700">{filterStats.trendSummary}</p>
                  </div>

                  <div className="mt-3 rounded-none border theme-card-border bg-white px-4 py-4">
                    <p className="theme-kicker">{text.video.densityBar}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-500">{text.video.densityBarHint}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {filterStats.densitySegments.map((segment) => (
                        <button
                          key={`density-${segment.key}`}
                          type="button"
                          onClick={() => toggleSegmentFilter(segment.key as SegmentKey)}
                          className={[
                            'space-y-2 rounded-none border theme-card-border px-3 py-3 text-left transition',
                            segment.isSelected
                              ? 'border-[#d6643e] bg-[#d6643e] text-stone-50 shadow-none'
                              : segment.isHighlighted
                                ? 'border-[#d6643e] bg-[#fff3eb] text-[#d6643e] shadow-none'
                                : 'border-transparent bg-stone-50 hover:bg-white',
                          ].join(' ')}
                        >
                          <div
                            className={[
                              'flex items-center justify-between text-xs font-semibold',
                              segment.isSelected ? 'text-stone-50' : segment.isHighlighted ? 'text-stone-900' : 'text-stone-600',
                            ].join(' ')}
                          >
                            <span>{segment.label}</span>
                            <span>{segment.density.toFixed(1)}%</span>
                          </div>
                          <div
                            className={[
                              'h-3 overflow-hidden rounded-none',
                              segment.isSelected ? 'bg-white/15' : segment.isHighlighted ? 'bg-stone-200' : 'bg-stone-100',
                            ].join(' ')}
                          >
                            <div
                              className={[
                                'h-full rounded-none transition-all',
                                segment.isSelected
                                  ? 'bg-gradient-to-r from-[#f2f2ee] via-[#d6d3d1] to-[#a8a29e]'
                                  : segment.isHighlighted
                                    ? 'bg-gradient-to-r from-[#e7e5e4] via-[#a8a29e] to-[#57534e]'
                                    : 'bg-gradient-to-r from-[#f0ede7] via-[#d6d3d1] to-[#78716c]',
                              ].join(' ')}
                              style={{ width: `${Math.min(segment.density, 100)}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3">
                  {filteredAdviceGroups.length ? (
                    filteredAdviceGroups.map((group) => (
                      <div key={`advice-group-${group.key}`} className="theme-soft-card px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-stone-900">{group.title}</p>
                          <span className={['rounded-none border px-3 py-1 text-xs font-bold', getIssueGroupTone(group.key)].join(' ')}>
                            {group.items.length}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {group.items.map((range) => (
                            <button
                              key={`range-advice-${group.key}-${range.start}-${range.end}`}
                              type="button"
                              onClick={() => jumpToTime(range.start, range.startIndex)}
                              className="rounded-none border theme-card-border bg-white px-4 py-4 text-left transition hover:bg-stone-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-stone-900">{range.title}</p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    {text.video.rangeAction} {cvdTypes.find((item) => item.key === range.dominantType)?.names[language]}
                                  </p>
                                </div>
                                <span className="rounded-none bg-[#F7F7F4] px-3 py-1 text-xs font-bold text-stone-700">
                                  {range.maxScore.toFixed(1)}
                                </span>
                              </div>
                              <div className="mt-3 grid gap-2">
                                {range.actions.map((action, index) => (
                                  <div key={`range-action-${group.key}-${range.start}-${index}`} className="rounded-none bg-[#fcfaf8] px-3 py-3 text-sm leading-7 text-stone-600">
                                    {action}
                                  </div>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-none border border-dashed theme-card-border px-4 py-3 text-sm text-stone-500">
                      {language === 'zh' ? '当前筛选条件下没有命中的高风险区间。' : 'No high-risk ranges match the current filter.'}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="rounded-none border theme-card-border bg-[#F7F7F4] p-4">
              <p className="text-sm font-semibold text-stone-900">{text.video.suggestions}</p>
              <div className="mt-3 grid gap-3">
                {recommendation.suggestions.map((suggestion, index) => (
                  <div key={`suggestion-${index}`} className="rounded-none bg-white px-4 py-4 text-sm leading-7 text-stone-600">
                    {suggestion}
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <div className="mt-5 rounded-none border border-dashed theme-card-border bg-[#F7F7F4] p-5 text-sm leading-7 text-stone-500">
            {text.video.noAnalysis}
          </div>
        )}
      </section>

      <canvas ref={originalCanvasRef} className="hidden" />
    </div>
  );
}
