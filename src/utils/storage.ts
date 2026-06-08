export function readNumber(key: string, fallback = 0): number {
  try {
    const value = window.localStorage.getItem(key);
    return value ? Number.parseInt(value, 10) || fallback : fallback;
  } catch {
    return fallback;
  }
}

export function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

