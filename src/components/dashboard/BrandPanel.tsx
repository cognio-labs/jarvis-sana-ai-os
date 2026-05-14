import Waveform from './Waveform';
import HoloPanel from './HoloPanel';

export default function BrandPanel() {
  return (
    <HoloPanel className="p-0">
      <div className="px-5 pb-5 pt-5">
        <div className="font-mono text-xs uppercase tracking-[0.32em] text-cyan-200/90">Cognio Labs</div>
        <div className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          <span className="bg-[linear-gradient(90deg,rgba(125,245,255,0.95),rgba(255,79,216,0.85),rgba(255,209,102,0.8))] bg-clip-text text-transparent">
            JARVIS SANA
          </span>{' '}
          <span className="text-cyan-100/90">AI OS</span>
        </div>
        <div className="mt-2 text-xs uppercase tracking-[0.28em] text-slate-300/90">Voice-first AI command center</div>
        <div className="mt-5 rounded-lg border border-cyan-300/15 bg-black/30 px-4 py-3">
          <Waveform active density={52} height={18} />
        </div>
      </div>
    </HoloPanel>
  );
}

