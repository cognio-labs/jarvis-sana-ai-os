import { spawn } from 'child_process';

import type { DesktopHelperAllowedApp } from './desktopHelperConfig';

export type OpenWindowsAppResult =
  | { ok: true }
  | { ok: false; error: string; detail?: string };

export function openWindowsApp(entry: DesktopHelperAllowedApp): OpenWindowsAppResult {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'unsupported_platform', detail: process.platform };
  }

  const command = entry.command;
  const args = entry.args ?? [];

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.unref();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: 'spawn_failed', detail: message };
  }
}

