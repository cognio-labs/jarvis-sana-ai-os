import { useEffect, useState } from 'react';

import HoloPanel from './HoloPanel';

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function Radar() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border border-cyan-300/30 bg-[radial-gradient(circle_at_center,rgba(125,245,255,0.22),transparent_65%)] shadow-[0_0_26px_rgba(125,245,255,0.18)]" />
      <div className="absolute inset-2 rounded-full border border-cyan-300/20" />
      <div className="absolute inset-0 animate-[holo-ring-drift_8s_linear_infinite] rounded-full border border-fuchsia-300/10" />
      <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(125,245,255,0.8)]" />
    </div>
  );
}

export default function ClockPanel() {
  // Avoid SSR hydration mismatches by rendering a stable placeholder on the server,
  // then initializing the clock on the client after mount.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <HoloPanel className="h-full">
      <div className="flex items-center justify-between gap-5">
        <div>
          <div className="text-3xl font-semibold text-white">{now ? formatTime(now) : '--:--:--'}</div>
          <div className="mt-1 font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
            {now ? formatDate(now) : 'Initializing clock…'}
          </div>
        </div>
        <Radar />
      </div>
    </HoloPanel>
  );
}
