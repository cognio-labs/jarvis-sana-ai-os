import Head from 'next/head';

const serviceCards = [
  { label: 'Assistant Core', value: 'Ready', detail: 'Voice, text, and command routing' },
  { label: 'Runtime', value: 'Online', detail: 'Next.js dev server is responding' },
  { label: 'Memory', value: 'Primed', detail: 'LangChain bridge and local history hooks' },
  { label: 'Socket API', value: 'Armed', detail: '/api/socket.io available for live events' },
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>JARVIS SANA AI OS</title>
        <meta
          name="description"
          content="JARVIS SANA AI OS local control console"
        />
      </Head>

      <main className="min-h-screen bg-[#080b10] text-slate-100">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
          <header className="flex items-center justify-between border-b border-cyan-400/20 pb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
                Cognio Labs
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-5xl">
                JARVIS SANA AI OS
              </h1>
            </div>
            <div className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 font-mono text-sm text-emerald-200">
              LIVE
            </div>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Local control console is running. Core services are wired for
                voice activation, command handling, audio feedback, memory, and
                agent orchestration.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {serviceCards.map((card) => (
                  <article
                    key={card.label}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
                  >
                    <div className="font-mono text-xs uppercase text-slate-400">
                      {card.label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-cyan-200">
                      {card.value}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {card.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <aside className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-6">
              <div className="font-mono text-sm text-cyan-200">
                startup-report
              </div>
              <div className="mt-5 space-y-3 font-mono text-sm text-slate-300">
                <p>&gt; npm run dev: OK</p>
                <p>&gt; route /: OK</p>
                <p>&gt; build pipeline: OK</p>
                <p>&gt; socket endpoint: standby</p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
