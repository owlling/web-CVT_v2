export interface ContrastResult {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

export function getLuminance(r: number, g: number, b: number): number {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

export function getContrastRatio(colorA: { r: number; g: number; b: number }, colorB: { r: number; g: number; b: number }): number {
  const luminanceA = getLuminance(colorA.r, colorA.g, colorA.b);
  const luminanceB = getLuminance(colorB.r, colorB.g, colorB.b);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateContrast(colorA: { r: number; g: number; b: number }, colorB: { r: number; g: number; b: number }): ContrastResult {
  const ratio = getContrastRatio(colorA, colorB);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

