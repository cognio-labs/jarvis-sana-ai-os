import HoloPanel from './HoloPanel';

export type Metric = {
  label: string;
  value: string;
  tone?: 'cyan' | 'emerald' | 'amber';
};

const toneClasses: Record<NonNullable<Metric['tone']>, string> = {
  cyan: 'text-cyan-200',
  emerald: 'text-emerald-200',
  amber: 'text-amber-200',
};

export default function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <HoloPanel className="h-full">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 transition duration-300 hover:border-cyan-300/25 hover:bg-black/45"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">{metric.label}</div>
            <div className={`mt-2 font-mono text-lg ${toneClasses[metric.tone ?? 'cyan']}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    </HoloPanel>
  );
}

