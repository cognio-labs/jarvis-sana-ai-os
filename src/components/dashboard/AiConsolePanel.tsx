import HoloPanel from './HoloPanel';

export default function AiConsolePanel({
  lines,
  live = true,
}: {
  lines: string[];
  live?: boolean;
}) {
  return (
    <HoloPanel
      title="AI Console"
      right={
        <span className="inline-flex items-center gap-2">
          {live ? 'LIVE' : 'PAUSED'}
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-300' : 'bg-slate-600'} shadow-[0_0_16px_rgba(124,255,178,0.7)]`} />
        </span>
      }
      className="h-full"
    >
      <div className="min-h-52 rounded-xl border border-white/10 bg-black/45 p-4 font-mono text-[11px] leading-6 text-slate-200">
        {lines.map((line) => (
          <div key={line} className="flex gap-2">
            <span className="text-cyan-300">&gt;</span>
            <span>{line}</span>
          </div>
        ))}
        <div className="mt-2 text-emerald-200">
          <span className="text-cyan-300">&gt;</span> _
        </div>
      </div>
    </HoloPanel>
  );
}

