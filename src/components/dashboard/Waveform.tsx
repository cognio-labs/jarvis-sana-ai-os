import { useMemo } from 'react';

export default function Waveform({
  active,
  density = 48,
  height = 28,
  className,
}: {
  active?: boolean;
  density?: number;
  height?: number;
  className?: string;
}) {
  const bars = useMemo(() => Array.from({ length: density }, (_, index) => index), [density]);

  return (
    <div className={`flex items-center justify-between gap-1 ${className ?? ''}`} aria-hidden="true">
      {bars.map((bar) => (
        <span
          key={bar}
          className={[
            'block w-1 rounded-full bg-gradient-to-t from-cyan-300 via-emerald-200 to-fuchsia-300',
            'opacity-70 shadow-[0_0_18px_rgba(125,245,255,0.12)]',
            active ? 'wave-bar' : '',
          ].join(' ')}
          style={{
            height: `${Math.max(6, Math.round(height * (0.25 + ((bar % 9) / 9) * 0.75)))}px`,
            animationDelay: `${bar * 36}ms`,
          }}
        />
      ))}
    </div>
  );
}

