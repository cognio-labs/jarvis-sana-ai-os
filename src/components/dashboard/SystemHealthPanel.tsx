import HoloPanel from './HoloPanel';

function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(rgba(125,245,255,0.95) ${clamped}%, rgba(255,255,255,0.08) 0)`,
          filter: 'drop-shadow(0 0 18px rgba(125,245,255,0.22))',
        }}
      />
      <div className="absolute inset-[6px] rounded-full bg-black/65 backdrop-blur-xl" />
      <div className="relative text-center">
        <div className="text-3xl font-semibold text-white">{clamped}%</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function SystemHealthPanel() {
  return (
    <HoloPanel title="System Health" className="h-full">
      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <Gauge value={98} label="Optimal" />
        <div className="grid gap-3">
          {[
            { label: 'CPU usage', value: '23%' },
            { label: 'RAM usage', value: '6.1 GB' },
            { label: 'Storage', value: '512 GB' },
            { label: 'Temperature', value: '42°C' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">{item.label}</div>
              <div className="text-sm text-cyan-100/90">{item.value}</div>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(124,255,178,0.9)]" />
            All systems operational
          </div>
        </div>
      </div>
    </HoloPanel>
  );
}

