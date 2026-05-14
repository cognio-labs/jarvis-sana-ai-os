import HoloPanel from './HoloPanel';

type Command = {
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const commands: Command[] = [
  {
    label: 'App',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h16v13H4z" />
        <path d="M8 7V5h8v2" />
        <path d="M8 11h8" />
      </svg>
    ),
  },
  {
    label: 'Weather',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.4 1.8A3.5 3.5 0 0 0 7 18Z" />
      </svg>
    ),
  },
  {
    label: 'Music',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M19 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M11 14V5l10-2v9" />
      </svg>
    ),
  },
  {
    label: 'Notes',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6" />
        <path d="M9 14h6" />
      </svg>
    ),
  },
  {
    label: 'Search',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        <path d="M16.5 16.5 21 21" />
      </svg>
    ),
  },
];

export default function QuickCommandsPanel() {
  return (
    <HoloPanel title="Quick Commands" className="h-full">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {commands.map((command) => (
          <button
            key={command.label}
            type="button"
            className="group rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-left transition duration-300 hover:border-cyan-300/25 hover:bg-black/45"
          >
            <div className="flex items-center justify-center">
              <command.icon className="h-6 w-6 text-cyan-200/90 transition duration-300 group-hover:text-cyan-100" />
            </div>
            <div className="mt-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.34em] text-slate-300/90">{command.label}</div>
            </div>
          </button>
        ))}
      </div>
    </HoloPanel>
  );
}
