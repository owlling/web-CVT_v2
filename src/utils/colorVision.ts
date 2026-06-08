import type { CvdType } from '@/data/appData';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VideoFrameImpact {
  time: number;
  dominantType: Exclude<CvdType, 'normal'>;
  dominantScore: number;
  scores: Record<Exclude<CvdType, 'normal'>, number>;
}

export interface VideoTypeImpactSummary {
  type: Exclude<CvdType, 'normal'>;
  averageScore: number;
  peakScore: number;
  level: ImpactLevel;
}

export interface VideoImpactAnalysis {
  duration: number;
  sampleCount: number;
  overallScore: number;
  dominantType: Exclude<CvdType, 'normal'>;
  summaries: VideoTypeImpactSummary[];
  timeline: VideoFrameImpact[];
  frames: VideoFrameImpact[];
}

const videoAnalysisTypes: Exclude<CvdType, 'normal'>[] = [
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'protanomaly',
  'deuteranomaly',
  'tritanomaly',
];

export const colorBlindMatrix: Record<Exclude<CvdType, 'normal'>, number[]> = {
  protanopia: [0.56667, 0.43333, 0, 0.55833, 0.44167, 0, 0, 0.24167, 0.75833],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.43333, 0.56667, 0, 0.475, 0.525],
  protanomaly: [0.80667, 0.19333, 0, 0.325, 0.675, 0, 0, 0.14167, 0.85833],
  deuteranomaly: [0.775, 0.225, 0, 0.275, 0.725, 0, 0, 0.19167, 0.80833],
  tritanomaly: [0.95833, 0.04167, 0, 0, 0.75833, 0.24167, 0, 0.21667, 0.78333],
};

export function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function classifyImpactScore(score: number): ImpactLevel {
  if (score >= 75) {
    return 'critical';
  }
  if (score >= 55) {
    return 'high';
  }
  if (score >= 30) {
    return 'medium';
  }
  return 'low';
}

export function normalizeHex(value: string): string {
  const clean = value.replace(/[^0-9a-f]/gi, '').slice(0, 6).padStart(6, '0');
  return `#${clean.toLowerCase()}`;
}

export function isValidHex(value: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(value);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function applyMatrix(r: number, g: number, b: number, type: CvdType) {
  if (type === 'normal') {
    return { r, g, b };
  }

  const matrix = colorBlindMatrix[type];
  return {
    r: clamp(matrix[0] * r + matrix[1] * g + matrix[2] * b),
    g: clamp(matrix[3] * r + matrix[4] * g + matrix[5] * b),
    b: clamp(matrix[6] * r + matrix[7] * g + matrix[8] * b),
  };
}

export function simulateHex(hex: string, type: CvdType): string {
  const { r, g, b } = hexToRgb(hex);
  const simulated = applyMatrix(r, g, b, type);
  return rgbToHex(simulated.r, simulated.g, simulated.b);
}

export function simulateImageData(imageData: ImageData, type: CvdType): ImageData {
  if (type === 'normal') {
    return imageData;
  }

  const data = new Uint8ClampedArray(imageData.data);
  const matrix = colorBlindMatrix[type];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = clamp(matrix[0] * r + matrix[1] * g + matrix[2] * b);
    data[i + 1] = clamp(matrix[3] * r + matrix[4] * g + matrix[5] * b);
    data[i + 2] = clamp(matrix[6] * r + matrix[7] * g + matrix[8] * b);
  }

  return new ImageData(data, imageData.width, imageData.height);
}

export function getContainedSize(width: number, height: number, limit = 560): { width: number; height: number } {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const ratio = Math.min(limit / safeWidth, limit / safeHeight, 1);
  return {
    width: Math.round(safeWidth * ratio),
    height: Math.round(safeHeight * ratio),
  };
}

export async function drawComparisonCanvases(
  imageSrc: string,
  originalCanvas: HTMLCanvasElement,
  simulatedCanvas: HTMLCanvasElement,
  type: CvdType,
): Promise<{ width: number; height: number }> {
  const image = await loadImage(imageSrc);
  const { width: renderWidth, height: renderHeight } = getContainedSize(image.width, image.height);

  originalCanvas.width = renderWidth;
  originalCanvas.height = renderHeight;
  simulatedCanvas.width = renderWidth;
  simulatedCanvas.height = renderHeight;

  const originalContext = originalCanvas.getContext('2d');
  const simulatedContext = simulatedCanvas.getContext('2d');
  if (!originalContext || !simulatedContext) {
    throw new Error('Canvas context is not available');
  }

  originalContext.clearRect(0, 0, renderWidth, renderHeight);
  simulatedContext.clearRect(0, 0, renderWidth, renderHeight);
  originalContext.drawImage(image, 0, 0, renderWidth, renderHeight);

  const imageData = originalContext.getImageData(0, 0, renderWidth, renderHeight);
  const simulated = simulateImageData(imageData, type);
  simulatedContext.putImageData(simulated, 0, 0);

  return { width: renderWidth, height: renderHeight };
}

export function drawVideoFrame(
  video: HTMLVideoElement,
  originalCanvas: HTMLCanvasElement,
  simulatedCanvas: HTMLCanvasElement,
  type: CvdType,
): { width: number; height: number } {
  const { width, height } = getContainedSize(video.videoWidth, video.videoHeight);

  originalCanvas.width = width;
  originalCanvas.height = height;
  simulatedCanvas.width = width;
  simulatedCanvas.height = height;

  const originalContext = originalCanvas.getContext('2d');
  const simulatedContext = simulatedCanvas.getContext('2d');
  if (!originalContext || !simulatedContext) {
    throw new Error('Canvas context is not available');
  }

  originalContext.clearRect(0, 0, width, height);
  simulatedContext.clearRect(0, 0, width, height);
  originalContext.drawImage(video, 0, 0, width, height);

  const frame = originalContext.getImageData(0, 0, width, height);
  const simulated = simulateImageData(frame, type);
  simulatedContext.putImageData(simulated, 0, 0);

  return { width, height };
}

export function calculateFrameImpactScore(original: ImageData, simulated: ImageData): number {
  const originalPixels = original.data;
  const simulatedPixels = simulated.data;
  const step = 16;
  let distanceSum = 0;
  let highImpactCount = 0;
  let luminanceShift = 0;
  let samplePixels = 0;

  for (let index = 0; index < originalPixels.length; index += step) {
    const dr = Math.abs(originalPixels[index] - simulatedPixels[index]);
    const dg = Math.abs(originalPixels[index + 1] - simulatedPixels[index + 1]);
    const db = Math.abs(originalPixels[index + 2] - simulatedPixels[index + 2]);
    const colorDistance = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
    const originalLuminance = 0.2126 * originalPixels[index] + 0.7152 * originalPixels[index + 1] + 0.0722 * originalPixels[index + 2];
    const simulatedLuminance = 0.2126 * simulatedPixels[index] + 0.7152 * simulatedPixels[index + 1] + 0.0722 * simulatedPixels[index + 2];

    distanceSum += colorDistance;
    luminanceShift += Math.abs(originalLuminance - simulatedLuminance) / 255;
    if (colorDistance >= 48) {
      highImpactCount += 1;
    }
    samplePixels += 1;
  }

  if (!samplePixels) {
    return 0;
  }

  const averageDistance = distanceSum / samplePixels;
  const highImpactRatio = highImpactCount / samplePixels;
  const averageLuminanceShift = luminanceShift / samplePixels;

  return Math.min(100, averageDistance * 0.95 + highImpactRatio * 42 + averageLuminanceShift * 28);
}

export async function analyzeVideoImpact(videoSrc: string): Promise<VideoImpactAnalysis> {
  const video = await loadVideo(videoSrc);
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const sampleCount = duration > 0 ? Math.min(18, Math.max(6, Math.ceil(duration * 1.5))) : 1;
  const times = duration > 0
    ? Array.from({ length: sampleCount }, (_, index) => {
        if (sampleCount === 1) {
          return 0;
        }
        const rawTime = (duration * index) / (sampleCount - 1);
        return Math.min(rawTime, Math.max(duration - 0.05, 0));
      })
    : [0];

  const { width, height } = getContainedSize(video.videoWidth, video.videoHeight, 240);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context is not available');
  }

  const frameResults: VideoFrameImpact[] = [];

  for (const time of times) {
    await seekVideo(video, time);
    context.clearRect(0, 0, width, height);
    context.drawImage(video, 0, 0, width, height);
    const originalFrame = context.getImageData(0, 0, width, height);

    const scores = Object.fromEntries(
      videoAnalysisTypes.map((type) => {
        const simulatedFrame = simulateImageData(originalFrame, type);
        const score = Number(calculateFrameImpactScore(originalFrame, simulatedFrame).toFixed(1));
        return [type, score];
      }),
    ) as Record<Exclude<CvdType, 'normal'>, number>;

    const dominantEntry = videoAnalysisTypes.reduce(
      (current, type) => (scores[type] > current.score ? { type, score: scores[type] } : current),
      { type: videoAnalysisTypes[0], score: scores[videoAnalysisTypes[0]] },
    );

    frameResults.push({
      time,
      dominantType: dominantEntry.type,
      dominantScore: dominantEntry.score,
      scores,
    });
  }

  const summaries = videoAnalysisTypes
    .map((type) => {
      const typeScores = frameResults.map((frame) => frame.scores[type]);
      const averageScore = typeScores.reduce((sum, value) => sum + value, 0) / Math.max(typeScores.length, 1);
      const peakScore = typeScores.reduce((max, value) => Math.max(max, value), 0);
      return {
        type,
        averageScore: Number(averageScore.toFixed(1)),
        peakScore: Number(peakScore.toFixed(1)),
        level: classifyImpactScore(averageScore),
      };
    })
    .sort((left, right) => right.averageScore - left.averageScore);

  const topSummary = summaries[0];
  const overallScore = Number(
    (frameResults.reduce((sum, frame) => sum + frame.dominantScore, 0) / Math.max(frameResults.length, 1)).toFixed(1),
  );

  return {
    duration,
    sampleCount: frameResults.length,
    overallScore,
    dominantType: topSummary.type,
    summaries,
    timeline: [...frameResults].sort((left, right) => left.time - right.time),
    frames: [...frameResults].sort((left, right) => right.dominantScore - left.dominantScore).slice(0, 8),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const handleLoaded = () => {
      cleanup();
      resolve(video);
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Video failed to load'));
    };

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('error', handleError);
    video.src = src;
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Video failed to seek'));
    };

    const cleanup = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.currentTime = time;
  });
}
