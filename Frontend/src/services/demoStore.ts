import { demoSeed } from '../data/demoData';
import type { DemoState } from '../types';

const storageKey = 'campus-transit-demo-v1';

function copySeed(): DemoState {
  return structuredClone(demoSeed);
}

export function loadDemoState(): DemoState {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (isDemoState(parsed)) return parsed;
    }
  } catch {
    // A malformed local cache is replaced with the known-good seed below.
  }
  const seed = copySeed();
  saveDemoState(seed);
  return seed;
}

export function saveDemoState(state: DemoState): void {
  localStorage.setItem(storageKey, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('transit-demo-updated'));
}

export function resetDemoState(): DemoState {
  const seed = copySeed();
  saveDemoState(seed);
  return seed;
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isDemoState(value: unknown): value is DemoState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DemoState>;
  return candidate.version === 1 && Array.isArray(candidate.buses) && Array.isArray(candidate.routes)
    && Array.isArray(candidate.drivers) && Array.isArray(candidate.schedules);
}