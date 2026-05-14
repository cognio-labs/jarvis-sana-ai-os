import type { VoiceStatus } from '../HolographicAssistant';

import HoloPanel from './HoloPanel';
import Waveform from './Waveform';

function StatusDot({ active, tone }: { active: boolean; tone: 'emerald' | 'cyan' }) {
  const toneClass =
    tone === 'emerald'
      ? active
        ? 'bg-emerald-300 shadow-[0_0_18px_rgba(124,255,178,0.85)]'
        : 'bg-slate-700'
      : active
        ? 'bg-cyan-300 shadow-[0_0_18px_rgba(125,245,255,0.8)]'
        : 'bg-slate-700';
  return <span className={`h-2 w-2 rounded-full ${toneClass}`} />;
}

function MicrophoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}

export default function VoiceActivationPanel({ voice }: { voice: VoiceStatus | null }) {
  const listening = !!voice?.isWakewordListening;
  const micOn = !!voice?.isMicCapturing;
  const active = listening || micOn;

  return (
    <HoloPanel title="Voice Activation" right={active ? 'ACTIVE' : 'IDLE'} className="h-full">
      <div className="grid gap-4">
        <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">Wakeword</div>
          <div className="mt-2 text-lg font-semibold text-white">&ldquo;HEY SANIYA&rdquo;</div>
          <div className="mt-4 rounded-lg border border-cyan-300/15 bg-black/35 px-3 py-2">
            <Waveform active={active} density={44} height={16} />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusDot active={listening} tone="cyan" />
              <span className="text-sm text-slate-300">Speech recognition</span>
            </div>
            <span className={`font-mono text-xs ${listening ? 'text-emerald-200' : 'text-slate-500'}`}>
              {listening ? 'READY' : 'IDLE'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusDot active={true} tone="emerald" />
              <span className="text-sm text-slate-300">Clap detection</span>
            </div>
            <span className="font-mono text-xs text-emerald-200">READY</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusDot active={micOn} tone="emerald" />
              <span className="text-sm text-slate-300">Microphone</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <MicrophoneGlyph />
              <span className={micOn ? 'text-emerald-200' : 'text-slate-500'}>{micOn ? 'ACTIVE' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </div>
    </HoloPanel>
  );
}

