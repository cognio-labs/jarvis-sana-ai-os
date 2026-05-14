import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

import type { VoiceStatus } from '../components/HolographicAssistant';
import ActiveAgentsPanel from '../components/dashboard/ActiveAgentsPanel';
import AiConsolePanel from '../components/dashboard/AiConsolePanel';
import BrandPanel from '../components/dashboard/BrandPanel';
import ClockPanel from '../components/dashboard/ClockPanel';
import CommandConsolePanel from '../components/dashboard/CommandConsolePanel';
import MetricStrip from '../components/dashboard/MetricStrip';
import QuickCommandsPanel from '../components/dashboard/QuickCommandsPanel';
import SystemHealthPanel from '../components/dashboard/SystemHealthPanel';
import TelemetryPanel from '../components/dashboard/TelemetryPanel';
import VoiceActivationPanel from '../components/dashboard/VoiceActivationPanel';
import Waveform from '../components/dashboard/Waveform';

const HolographicAssistant = dynamic(() => import('../components/HolographicAssistant'), {
  ssr: false,
});

export default function HomePage() {
  const [voice, setVoice] = useState<VoiceStatus | null>(null);

  const handleVoiceStatus = useCallback((status: VoiceStatus) => {
    setVoice(status);
  }, []);

  const metrics = useMemo(
    () => [
      { label: 'System status', value: 'OPTIMAL', tone: 'emerald' as const },
      { label: 'Memory', value: '98%', tone: 'cyan' as const },
      { label: 'CPU', value: '23%', tone: 'cyan' as const },
      { label: 'Network', value: 'ONLINE', tone: 'emerald' as const },
    ],
    []
  );

  const consoleLines = useMemo(
    () => [
      '[BOOT] JARVIS SANA AI OS INITIALIZED',
      '[VOICE] WAKEWORD DETECTOR ARMED',
      '[LISTENING] AWAITING COMMAND...',
      '[AI] PROCESSING PIPELINE READY',
      '[AGENT] ORCHESTRATION ACTIVE',
      '[MEMORY] CONTEXT LOADED',
      '[NETWORK] ALL SYSTEMS ONLINE',
      '[STATUS] READY FOR COMMAND',
    ],
    []
  );

  const agents = useMemo(
    () => [
      { name: 'OPENROUTER AGENT', status: 'online' as const },
      { name: 'OLLAMA AGENT', status: 'online' as const },
      { name: 'LANGCHAIN AGENT', status: 'online' as const },
      { name: 'MEMORY AGENT', status: 'online' as const },
      { name: 'AUTOMATION AGENT', status: 'online' as const },
    ],
    []
  );

  return (
    <>
      <Head>
        <title>JARVIS SANA AI OS</title>
        <meta name="description" content="Futuristic JARVIS SANA AI OS dashboard" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <main className="min-h-screen overflow-hidden px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
        <div className="startup-sweep mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-5">
          {/* Top row */}
          <section className="grid gap-5 lg:grid-cols-[1fr_1.15fr_0.8fr]">
            <BrandPanel />
            <MetricStrip metrics={metrics} />
            <ClockPanel />
          </section>

          {/* Main row */}
          <section className="grid flex-1 gap-5 lg:grid-cols-[0.92fr_1.2fr_0.88fr]">
            <aside className="grid gap-5">
              <VoiceActivationPanel voice={voice} />
              <SystemHealthPanel />
            </aside>

            <section className="glass-panel holo-edge holo-card holo-noise panel-rise relative flex min-h-[34rem] flex-col items-center justify-center rounded-2xl p-6">
              <div className="absolute left-6 top-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                Holographic assistant core
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_14px_rgba(125,245,255,0.7)]" />
              </div>

              <div className="relative w-full">
                <div className="absolute left-1/2 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(125,245,255,0.12),transparent_62%)] blur-2xl" />
                <div className="relative flex items-center justify-center">
                  <HolographicAssistant onVoiceStatusChange={handleVoiceStatus} />
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-sm font-semibold tracking-[0.32em] text-cyan-200/90">JARVIS SANA</div>
                <div className="mt-2 text-xs uppercase tracking-[0.28em] text-slate-400">Welcome back, Aryan Boss.</div>
                <div className="mt-4 rounded-xl border border-cyan-300/15 bg-black/35 px-5 py-4">
                  <Waveform active={voice?.isMicCapturing || voice?.mode === 'speaking'} density={44} height={14} />
                </div>
              </div>
            </section>

            <aside className="grid gap-5">
              <AiConsolePanel lines={consoleLines} live />
              <ActiveAgentsPanel agents={agents} />
            </aside>
          </section>

          {/* Bottom row */}
          <section className="grid gap-5 lg:grid-cols-[0.92fr_1.2fr_0.88fr]">
            <QuickCommandsPanel />
            <CommandConsolePanel voice={voice} />
            <TelemetryPanel />
          </section>
        </div>
      </main>
    </>
  );
}
