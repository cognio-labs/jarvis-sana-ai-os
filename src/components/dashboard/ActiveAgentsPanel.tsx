import HoloPanel from './HoloPanel';

type Agent = {
  name: string;
  status: 'online' | 'idle';
};

function AgentIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  if (key.includes('openrouter')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2v6" />
        <path d="M12 16v6" />
        <path d="M4.9 4.9 9 9" />
        <path d="M15 15l4.1 4.1" />
        <path d="M2 12h6" />
        <path d="M16 12h6" />
        <path d="M4.9 19.1 9 15" />
        <path d="M15 9l4.1-4.1" />
      </svg>
    );
  }
  if (key.includes('ollama')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 9c0-3 2-5 5-5s5 2 5 5" />
        <path d="M5 11h14v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-7Z" />
        <path d="M9 15h.01" />
        <path d="M15 15h.01" />
      </svg>
    );
  }
  if (key.includes('langchain')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 7h10v10H7z" />
        <path d="M4 12h3" />
        <path d="M17 12h3" />
        <path d="M12 4v3" />
        <path d="M12 17v3" />
      </svg>
    );
  }
  if (key.includes('memory')) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <path d="M7 18v3" />
        <path d="M17 18v3" />
        <path d="M4 7h16v10H4z" />
        <path d="M9 11h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export default function ActiveAgentsPanel({ agents }: { agents: Agent[] }) {
  const onlineCount = agents.filter((agent) => agent.status === 'online').length;

  return (
    <HoloPanel title="Active Agents" right={`${onlineCount} ONLINE`} className="h-full">
      <div className="grid gap-2">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-4 py-3 transition duration-300 hover:border-cyan-300/25 hover:bg-black/45"
          >
            <div className="flex items-center gap-3">
              <AgentIcon name={agent.name} />
              <div>
                <div className="text-sm text-slate-200">{agent.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">runtime</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em]">
              <span
                className={`h-2 w-2 rounded-full ${
                  agent.status === 'online' ? 'bg-emerald-300' : 'bg-slate-600'
                } shadow-[0_0_16px_rgba(124,255,178,0.7)]`}
              />
              <span className={agent.status === 'online' ? 'text-emerald-200' : 'text-slate-500'}>{agent.status}</span>
            </div>
          </div>
        ))}
      </div>
    </HoloPanel>
  );
}

