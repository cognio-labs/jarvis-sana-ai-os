import type { NextApiRequest, NextApiResponse } from 'next';

import logger from '@utils/logger';
import { loadDesktopHelperConfig } from '../../../server/desktopHelper/desktopHelperConfig';
import { openWindowsApp } from '../../../server/desktopHelper/openWindowsApp';

type Body = {
  app?: unknown;
  confirmed?: unknown;
};

function isLoopbackAddress(address?: string | null) {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '::ffff:127.0.0.1' ||
    normalized.startsWith('::ffff:127.')
  );
}

function coerceBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const cfg = loadDesktopHelperConfig();
  const loopback = isLoopbackAddress(req.socket.remoteAddress);

  if (!loopback) {
    logger.warn('Blocked desktop open-app request from non-loopback address', {
      remoteAddress: req.socket.remoteAddress,
    });
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  if (!cfg.enabled) {
    return res.status(403).json({
      ok: false,
      error: 'desktop_helper_disabled',
      hint: 'Create desktop-helper.config.json and set enabled=true (or set JARVIS_DESKTOP_HELPER_ENABLED=1).',
    });
  }

  if (process.platform !== 'win32') {
    return res.status(400).json({ ok: false, error: 'unsupported_platform', platform: process.platform });
  }

  const body = (req.body ?? {}) as Body;
  const rawApp = typeof body.app === 'string' ? body.app : '';
  const app = rawApp.trim().toLowerCase();

  if (!app) {
    return res.status(400).json({ ok: false, error: 'missing_app' });
  }

  const entry = cfg.allowedApps[app];
  if (!entry) {
    return res.status(404).json({
      ok: false,
      error: 'app_not_allowed',
      app,
      allowedApps: Object.keys(cfg.allowedApps).sort(),
    });
  }

  const confirmed = coerceBoolean(body.confirmed);
  if (cfg.requireConfirmation && !confirmed) {
    return res.status(428).json({
      ok: false,
      error: 'confirmation_required',
      app,
      prompt: `Allow Jarvis to open "${app}" on this computer?`,
    });
  }

  const result = openWindowsApp(entry);
  if (result.ok === false) {
    logger.error('Failed to open allowed app', { app, error: result.error, detail: result.detail });
    return res.status(500).json({ ok: false, error: result.error, detail: result.detail });
  }

  logger.info('Opened app via desktop helper', { app });
  return res.status(200).json({ ok: true, app });
}
