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
      <div className="grid gap-4 md:flex md:items-center md:justify-between md:gap-0 md:divide-x md:divide-cyan-300/15">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex-1 px-2 md:px-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">{metric.label}</div>
            <div className={`mt-2 font-mono text-lg ${toneClasses[metric.tone ?? 'cyan']}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    </HoloPanel>
  );
}
