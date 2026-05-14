import type { VoiceStatus } from '../HolographicAssistant';

export default function AssistantFaceOverlay({ voice }: { voice: VoiceStatus | null }) {
  const mode = voice?.mode ?? 'standby';
  const speaking = mode === 'speaking';
  const waking = mode === 'waking';
  const listening = mode === 'listening' || !!voice?.isWakewordListening;

  const expressionClass = speaking
    ? 'assistant-expression-speaking'
    : waking
      ? 'assistant-expression-waking'
      : listening
        ? 'assistant-expression-listening'
        : 'assistant-expression-standby';

  return (
    <div className={`assistant-face-overlay ${expressionClass}`} aria-hidden="true">
      {/* Eyes */}
      <div className="assistant-eye assistant-eye-left">
        <div className="assistant-eye-pupil" />
        <div className="assistant-eye-lid" />
      </div>
      <div className="assistant-eye assistant-eye-right">
        <div className="assistant-eye-pupil" />
        <div className="assistant-eye-lid" />
      </div>

      {/* Mouth */}
      <div className="assistant-mouth">
        <div className="assistant-mouth-inner" />
      </div>
    </div>
  );
}

