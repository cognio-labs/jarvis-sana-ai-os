import { useCallback, useMemo, useState } from 'react';

import type { VoiceStatus } from '../HolographicAssistant';

import HoloPanel from './HoloPanel';
import Waveform from './Waveform';

function formatPromptLine(text: string) {
  return `C:\\JARVIS> ${text}`;
}

export default function CommandConsolePanel({ voice }: { voice: VoiceStatus | null }) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>(() => [
    formatPromptLine('SYSTEM ONLINE'),
    formatPromptLine('AWAITING YOUR COMMAND...'),
  ]);

  const isListening = !!voice?.isWakewordListening;
  const isSpeaking = voice?.mode === 'speaking';
  const waveformActive = isListening || isSpeaking;

  const helper = useMemo(() => {
    if (!voice) return 'Say "Hey Saniya" or type a command';
    if (voice.mode === 'waking') return 'Assistant waking...';
    if (voice.mode === 'speaking') return 'Assistant speaking...';
    if (voice.isWakewordListening) return 'Listening for wakeword...';
    return 'Say "Hey Saniya" or type a command';
  }, [voice]);

  const submit = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) return;
    setHistory((prev) => [...prev, formatPromptLine(trimmed)]);
    setCommand('');
  }, [command]);

  return (
    <HoloPanel title="Command Console" className="h-full">
      <div className="grid gap-4">
        <div className="rounded-xl border border-white/10 bg-black/45 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">{helper}</div>
            <div className="hidden sm:block">
              <Waveform active={waveformActive} density={26} height={14} />
            </div>
          </div>

          <div className="mt-4 max-h-28 overflow-auto pr-1 font-mono text-[11px] leading-6 text-cyan-100/90">
            {history.slice(-4).map((line) => (
              <div key={line} className="flex gap-2">
                <span className="text-cyan-300">&gt;</span>
                <span>{line}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-cyan-300/15 bg-black/40 px-3 py-2">
            <span className="font-mono text-xs text-cyan-200">C:\JARVIS&gt;</span>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder="Type a command..."
              className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-slate-500"
              aria-label="Command input"
            />
            <button
              type="button"
              onClick={submit}
              className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100 transition duration-300 hover:border-cyan-200/40 hover:bg-cyan-300/15"
            >
              Run
            </button>
          </div>
        </div>
      </div>
    </HoloPanel>
  );
}

