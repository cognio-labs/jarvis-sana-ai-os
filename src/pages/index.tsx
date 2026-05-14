import Head from 'next/head';
import dynamic from 'next/dynamic';

const HolographicAssistant = dynamic(() => import('../components/HolographicAssistant'), {
  ssr: false,
});

const systems = [
  { name: 'Assistant Core', state: 'Listening', metric: '98%', tone: 'text-cyan-200' },
  { name: 'Voice Matrix', state: 'Armed', metric: 'Hot mic', tone: 'text-emerald-200' },
  { name: 'Agent Runtime', state: 'Online', metric: '5 retries', tone: 'text-amber-200' },
  { name: 'Socket Relay', state: 'Standby', metric: 'Live API', tone: 'text-fuchsia-200' },
];

const consoleLines = [
  '[boot] JARVIS SANA interface mounted',
  '[voice] wakeword listener awaiting activation',
  '[audio] synthesis bus calibrated',
  '[agent] OpenRouter, Ollama, LangChain routes available',
  '[memory] vector bridge initialized',
];

const waveBars = Array.from({ length: 28 }, (_, index) => index);

export default function HomePage() {
  return (
    <>
      <Head>
        <title>JARVIS SANA AI OS</title>
        <meta name="description" content="Futuristic JARVIS SANA AI OS dashboard" />
      </Head>

      <main className="min-h-screen overflow-hidden px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
        <div className="startup-sweep mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col gap-5">
          <header className="glass-panel holo-edge flex flex-col gap-5 rounded-lg px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-cyan-200">
                Cognio Labs Neural Console
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-white sm:text-6xl">
                JARVIS SANA AI OS
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Voice-first command center for local runtime, agent orchestration,
                memory, audio synthesis, and live AI operations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:w-72">
              <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3">
                <div className="text-emerald-200">RUNTIME</div>
                <div className="mt-2 text-lg text-white">ONLINE</div>
              </div>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-300/10 p-3">
                <div className="text-cyan-200">PORT</div>
                <div className="mt-2 text-lg text-white">ACTIVE</div>
              </div>
            </div>
          </header>

          <section className="grid flex-1 gap-5 lg:grid-cols-[0.92fr_1.2fr_0.88fr]">
            <aside className="panel-rise glass-panel rounded-lg p-5" style={{ animationDelay: '90ms' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-200">
                  Voice Activation
                </h2>
                <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(124,255,178,0.9)]" />
              </div>

              <div className="mt-8 flex items-end justify-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-3 py-8">
                {waveBars.map((bar) => (
                  <span
                    key={bar}
                    className="wave-bar block h-16 w-1.5 rounded-full bg-gradient-to-t from-cyan-300 via-emerald-200 to-fuchsia-300"
                    style={{ animationDelay: `${bar * 42}ms` }}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                {['Wakeword scanner', 'Clap detection', 'Speech synthesis'].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="text-sm text-slate-300">{item}</span>
                    <span className="font-mono text-xs text-emerald-200">READY</span>
                  </div>
                ))}
              </div>
            </aside>

            <section className="panel-rise glass-panel holo-edge relative flex min-h-[34rem] flex-col items-center justify-center rounded-lg p-6" style={{ animationDelay: '180ms' }}>
              <div className="absolute left-5 top-5 font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                Holographic Assistant Core
              </div>

              <HolographicAssistant />
            </section>

            <aside className="panel-rise glass-panel rounded-lg p-5" style={{ animationDelay: '270ms' }}>
              <h2 className="font-mono text-sm uppercase tracking-[0.24em] text-fuchsia-200">
                AI Console
              </h2>

              <div className="mt-5 min-h-72 rounded-lg border border-white/10 bg-black/35 p-4 font-mono text-xs leading-6 text-slate-300">
                {consoleLines.map((line) => (
                  <p key={line}>
                    <span className="text-cyan-300">&gt;</span> {line}
                  </p>
                ))}
                <div className="mt-4 flex items-center gap-2 text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(124,255,178,0.9)]" />
                  Awaiting operator input
                </div>
              </div>

              <button className="cyber-button mt-5 w-full rounded-md px-4 py-3 font-mono text-sm uppercase tracking-[0.18em] text-cyan-100">
                Initialize Session
              </button>
            </aside>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {systems.map((system, index) => (
              <article
                key={system.name}
                className="panel-rise glass-panel rounded-lg p-5"
                style={{ animationDelay: `${360 + index * 70}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-slate-300">{system.name}</h3>
                  <span className={`font-mono text-xs ${system.tone}`}>{system.state}</span>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <p className="text-3xl font-semibold text-white">{system.metric}</p>
                  <div className="h-10 w-20 rounded-md border border-cyan-300/20 bg-[linear-gradient(90deg,rgba(125,245,255,0.1),rgba(255,79,216,0.16),rgba(255,209,102,0.12))]" />
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
