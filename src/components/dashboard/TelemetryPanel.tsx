import { useMemo } from 'react';

import HoloPanel from './HoloPanel';

function WorldMap() {
  return (
    <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-black/45">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(125,245,255,0.16),transparent_58%),radial-gradient(circle_at_72%_58%,rgba(255,79,216,0.1),transparent_60%)]" />
      <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),transparent)]">
        <svg viewBox="0 0 800 320" className="h-full w-full">
          <defs>
            <linearGradient id="mapGrad" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(125,245,255,0.75)" />
              <stop offset="1" stopColor="rgba(255,79,216,0.55)" />
            </linearGradient>
          </defs>
          <path
            d="M78 188l38-20 33 12 52-18 40 18 52-28 52 10 54-30 56 20 48-30 46 18 66-30 46 14 56-24 50 18 44-16 64 24 34-14 32 10v26l-32 12-34-14-64 24-44-16-50 18-56-24-46 14-66-30-46 18-48-30-56 20-54-30-52 10-52-28-40 18-52-18-33 12-38-20Z"
            fill="url(#mapGrad)"
            opacity="0.55"
          />
          <path
            d="M84 194l32-16 35 10 50-18 42 18 50-26 54 10 52-30 56 20 50-30 44 18 66-30 48 14 54-24 52 18 42-16 64 24 32-14 34 10"
            fill="none"
            stroke="rgba(125,245,255,0.55)"
            strokeWidth="2"
            opacity="0.7"
          />
        </svg>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(125,245,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(125,245,255,0.06)_1px,transparent_1px)] bg-[length:44px_44px] opacity-40" />
      <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/90">
        Live feed
      </div>
    </div>
  );
}

export default function TelemetryPanel() {
  const logs = useMemo(
    () => [
      { label: 'System online', time: '10:41 PM' },
      { label: 'Voice system', time: '10:41 PM' },
      { label: 'AI core', time: '10:41 PM' },
      { label: 'Memory sync', time: '10:41 PM' },
      { label: 'Agents online', time: '10:41 PM' },
    ],
    []
  );

  return (
    <HoloPanel className="h-full">
      <div className="grid gap-4 lg:grid-cols-2">
        <WorldMap />
        <div className="rounded-xl border border-white/10 bg-black/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/90">System logs</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Live</div>
          </div>
          <div className="mt-4 grid gap-3">
            {logs.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-300/70 shadow-[0_0_14px_rgba(125,245,255,0.5)]" />
                  <span>{item.label}</span>
                </div>
                <span className="font-mono text-xs text-slate-500">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HoloPanel>
  );
}

