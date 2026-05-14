import type { ReactNode } from 'react';

export default function HoloPanel({
  title,
  right,
  children,
  className,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-panel holo-edge holo-card holo-noise relative ${className ?? ''}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-4 border-b border-cyan-300/15 px-5 pb-3 pt-4">
          {title ? (
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/90">{title}</div>
          ) : (
            <div />
          )}
          {right ? <div className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-200">{right}</div> : null}
        </header>
      )}
      <div className="px-5 pb-5 pt-4">{children}</div>
    </section>
  );
}
