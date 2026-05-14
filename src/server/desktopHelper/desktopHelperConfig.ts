import fs from 'fs';
import path from 'path';

export type DesktopHelperAllowedApp = {
  command: string;
  args?: string[];
};

export type DesktopHelperConfig = {
  enabled: boolean;
  requireConfirmation: boolean;
  allowedApps: Record<string, DesktopHelperAllowedApp>;
};

const CONFIG_PATH = path.join(process.cwd(), 'desktop-helper.config.json');

const DEFAULT_CONFIG: DesktopHelperConfig = {
  enabled:
    process.env.JARVIS_DESKTOP_HELPER_ENABLED === '1' ||
    process.env.JARVIS_DESKTOP_HELPER_ENABLED === 'true' ||
    process.env.NODE_ENV !== 'production',
  requireConfirmation: true,
  allowedApps: {
    notepad: { command: 'notepad.exe' },
    calculator: { command: 'calc.exe' },
  },
};

function coerceBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return fallback;
}

function normalizeAllowedApps(value: unknown): Record<string, DesktopHelperAllowedApp> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const out: Record<string, DesktopHelperAllowedApp> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (!key || typeof key !== 'string') continue;
    if (!entry || typeof entry !== 'object') continue;
    const maybe = entry as Partial<DesktopHelperAllowedApp>;
    if (typeof maybe.command !== 'string' || !maybe.command.trim()) continue;

    out[key.toLowerCase().trim()] = {
      command: maybe.command.trim(),
      args: Array.isArray(maybe.args) ? maybe.args.filter((a) => typeof a === 'string') : undefined,
    };
  }

  return out;
}

export function loadDesktopHelperConfig(): DesktopHelperConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopHelperConfig>;

    const allowedApps = normalizeAllowedApps(parsed.allowedApps);
    const mergedAllowedApps =
      Object.keys(allowedApps).length > 0 ? allowedApps : DEFAULT_CONFIG.allowedApps;

    return {
      enabled: coerceBoolean(parsed.enabled, DEFAULT_CONFIG.enabled),
      requireConfirmation: coerceBoolean(parsed.requireConfirmation, DEFAULT_CONFIG.requireConfirmation),
      allowedApps: mergedAllowedApps,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

