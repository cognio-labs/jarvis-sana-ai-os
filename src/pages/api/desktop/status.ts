import type { NextApiRequest, NextApiResponse } from 'next';

import logger from '@utils/logger';
import { loadDesktopHelperConfig } from '../../../server/desktopHelper/desktopHelperConfig';

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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const cfg = loadDesktopHelperConfig();
  const loopback = isLoopbackAddress(req.socket.remoteAddress);

  if (!loopback) {
    logger.warn('Desktop helper status requested from non-loopback address', {
      remoteAddress: req.socket.remoteAddress,
    });
  }

  return res.status(200).json({
    ok: true,
    platform: process.platform,
    enabled: cfg.enabled && process.platform === 'win32',
    requireConfirmation: cfg.requireConfirmation,
    allowedApps: Object.keys(cfg.allowedApps).sort(),
    loopback,
  });
}

