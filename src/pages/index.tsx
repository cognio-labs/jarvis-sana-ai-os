import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

import type { VoiceStatus } from '../components/HolographicAssistant';
import ActiveAgentsPanel from '../components/dashboard/ActiveAgentsPanel';
import AiConsolePanel from '../components/dashboard/AiConsolePanel';
import AssistantFaceOverlay from '../components/dashboard/AssistantFaceOverlay';
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
          {/* Top header */}
          <header className="grid gap-5 lg:grid-cols-[1fr_1.5fr_1fr]">
            <BrandPanel />
            <MetricStrip metrics={metrics} />
            <ClockPanel />
          </header>

          {/* Main grid */}
          <section className="grid flex-1 gap-5 lg:grid-cols-[1fr_1.5fr_1fr]">
            <aside className="grid gap-5">
              <VoiceActivationPanel voice={voice} />
              <SystemHealthPanel />
              <QuickCommandsPanel />
            </aside>

            <section className="grid gap-5">
              <div
                className="glass-panel holo-edge holo-card holo-noise panel-rise relative flex min-h-[34rem] flex-1 items-end justify-center overflow-hidden rounded-2xl p-6"
                style={{
                  backgroundImage: 'url(/assistant-portrait.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(3,11,20,0.92)_0%,rgba(3,11,20,0.32)_45%,rgba(3,11,20,0.08)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.12),transparent_55%)]" />

                <div className="absolute left-6 top-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-slate-300/80">
                  Holographic assistant core
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_14px_rgba(125,245,255,0.7)]" />
                </div>

                <div className="absolute inset-0 z-[6]">
                  <AssistantFaceOverlay voice={voice} />
                </div>

                <div className="absolute inset-0 z-[7] flex items-center justify-center">
                  <HolographicAssistant
                    onVoiceStatusChange={handleVoiceStatus}
                    showNeuralFace={false}
                    minimalHud
                  />
                </div>

                <div className="relative z-10 mb-6 text-center">
                  <div className="text-base font-semibold tracking-[0.32em] text-cyan-200/90">WELCOME BACK, ARYAN BOSS.</div>
                  <div className="mt-4 rounded-xl border border-cyan-300/15 bg-black/35 px-5 py-4">
                    <Waveform active={voice?.isMicCapturing || voice?.mode === 'speaking'} density={44} height={14} />
                  </div>
                </div>
              </div>

              <CommandConsolePanel voice={voice} />
            </section>

            <aside className="grid gap-5">
              <AiConsolePanel lines={consoleLines} live />
              <ActiveAgentsPanel agents={agents} />
              <TelemetryPanel />
            </aside>
          </section>

          <footer className="flex items-center justify-center gap-4 pb-1 pt-2">
            {[
              { label: 'Home', icon: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z' },
              { label: 'Metrics', icon: 'M4 19V5m5 14V9m5 10V7m5 12v-6' },
              { label: 'Cube', icon: 'M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5' },
              { label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2-1.5-2-3.5-2.3.7a7.8 7.8 0 0 0-1.7-1l-.3-2.4H9l-.3 2.4a7.8 7.8 0 0 0-1.7 1l-2.3-.7-2 3.5 2 1.5a7.97 7.97 0 0 0-.1 1 7.97 7.97 0 0 0 .1 1l-2 1.5 2 3.5 2.3-.7c.5.4 1.1.7 1.7 1l.3 2.4h6l.3-2.4c.6-.3 1.2-.6 1.7-1l2.3.7 2-3.5-2-1.5Z' },
              { label: 'Shield', icon: 'M12 2 20 6v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z' },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-panel holo-edge holo-card flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-black/35 text-cyan-200/90 shadow-[0_0_22px_rgba(0,243,255,0.08)] transition duration-300 hover:border-cyan-200/40 hover:bg-black/45 hover:text-cyan-100"
                aria-label={item.label}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
            ))}
          </footer>
        </div>
      </main>
    </>
  );
}
