import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Float, Text, MeshDistortMaterial, MeshWobbleMaterial, Sphere } from '@react-three/drei';

export type AssistantMode = 'standby' | 'listening' | 'speaking' | 'waking';

export type VoiceStatus = {
  mode: AssistantMode;
  transcript: string;
  isWakewordListening: boolean;
  isMicCapturing: boolean;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type BrowserWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const welcomeLine = 'Welcome back Aryan Boss.';
const particleCount = 800;
const VOICE_DEBUG_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_VOICE_DEBUG === '1' ||
  process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true';

// --- SHADERS ---

const faceVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDist;
  uniform float uTime;
  uniform float uPulse;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    // Add some organic movement
    vec3 pos = position;
    float dist = length(pos);
    vDist = dist;
    
    pos.x += sin(pos.y * 5.0 + uTime) * 0.02 * uPulse;
    pos.y += cos(pos.x * 5.0 + uTime) * 0.02 * uPulse;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const faceFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDist;

  void main() {
    // Fresnel effect for edge glow
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    
    // Scanlines
    float scanline = sin(vPosition.y * 60.0 - uTime * 10.0) * 0.5 + 0.5;
    scanline = pow(scanline, 10.0) * 0.2;
    
    // Grid/Dots pattern
    float grid = sin(vPosition.x * 40.0) * sin(vPosition.y * 40.0) * sin(vPosition.z * 40.0);
    grid = step(0.95, grid);
    
    // Combine colors
    vec3 finalColor = uColor;
    float alpha = (fresnel * 0.8 + scanline + grid * 0.5) * uIntensity;
    
    // Add some "neural" noise
    float noise = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
    alpha += noise * 0.05 * uIntensity;

    gl_FragColor = vec4(finalColor * (1.2 + fresnel * 2.0), alpha);
  }
`;

// --- COMPONENTS ---

function HUDRings({ mode }: { mode: AssistantMode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    
    // Rotate rings at different speeds
    groupRef.current.children.forEach((child, i) => {
      child.rotation.z = t * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      child.rotation.x = Math.sin(t * 0.5) * 0.1;
      child.rotation.y = Math.cos(t * 0.3) * 0.1;
    });
  });

  return (
    <group ref={groupRef}>
      {/* Outer Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.22, 64]} />
        <meshBasicMaterial color="#7df5ff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Middle Segmented Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.85, 64, 1, 0, Math.PI * 1.5]} />
        <meshBasicMaterial color="#3bdcff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner Rotating Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.52, 32]} />
        <meshBasicMaterial color="#bafcff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Crosshair Dots */}
      {[0, 90, 180, 270].map((angle) => (
        <mesh 
          key={angle}
          position={[
            Math.cos((angle * Math.PI) / 180) * 2.4,
            Math.sin((angle * Math.PI) / 180) * 2.4,
            0
          ]}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#7df5ff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField({ mode }: { mode: AssistantMode }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.5 + Math.random() * 1.5;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      col[i * 3] = 0.49; // 125/255
      col[i * 3 + 1] = 0.96; // 245/255
      col[i * 3 + 2] = 1.0; // 255/255
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.1;
    ref.current.rotation.z = t * 0.05;
    
    const scale = mode === 'speaking' ? 1.2 : mode === 'listening' ? 1.1 : 1.0;
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, scale, 0.1));
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.015} 
        vertexColors 
        transparent 
        opacity={0.4} 
        blending={THREE.AdditiveBlending} 
        sizeAttenuation 
      />
    </points>
  );
}

function NeuralFace({ mode, speechPulse }: { mode: AssistantMode; speechPulse: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0.8 },
    uPulse: { value: 0 },
    uColor: { value: new THREE.Color('#7df5ff') }
  }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    
    // Intensity based on mode
    let targetIntensity = 0.8;
    if (mode === 'speaking') targetIntensity = 1.2 + speechPulse * 0.5;
    if (mode === 'listening') targetIntensity = 1.0 + Math.sin(t * 4) * 0.1;
    if (mode === 'standby') targetIntensity = 0.6;
    
    uniforms.uIntensity.value = THREE.MathUtils.lerp(uniforms.uIntensity.value, targetIntensity, 0.1);
    uniforms.uPulse.value = THREE.MathUtils.lerp(uniforms.uPulse.value, mode === 'speaking' ? 1 : 0, 0.1);

    if (groupRef.current) {
      // Subtle floating and breathing
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.05;
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1;
      groupRef.current.rotation.x = Math.cos(t * 0.3) * 0.05;
    }

    if (mouthRef.current && mode === 'speaking') {
      const open = 0.05 + speechPulse * 0.4;
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, open, 0.3);
    } else if (mouthRef.current) {
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, 0.05, 0.1);
    }

    // Blinking
    if (eyesRef.current) {
      const blink = Math.sin(t * 3) > 0.98 ? 0.1 : 1.0;
      eyesRef.current.scale.y = THREE.MathUtils.lerp(eyesRef.current.scale.y, blink, 0.4);
    }
  });

  return (
    <group ref={groupRef}>
      {/* The "Head" - Egg shape with holographic shader */}
      <mesh ref={headRef} scale={[1, 1.3, 0.9]}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial 
          vertexShader={faceVertexShader}
          fragmentShader={faceFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Eyes */}
      <group ref={eyesRef} position={[0, 0.3, 0.8]}>
        <mesh position={[-0.3, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#bafcff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.3, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#bafcff" transparent opacity={0.8} />
        </mesh>
        {/* Glow behind eyes */}
        <pointLight color="#7df5ff" intensity={0.5} distance={2} />
      </group>

      {/* Mouth / Audio Reactive Line */}
      <group ref={mouthRef} position={[0, -0.4, 0.85]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.01, 16, 32]} />
          <meshBasicMaterial color="#7df5ff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Neural Lines (Internal Structure) */}
      <group scale={[0.9, 1.2, 0.8]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#7df5ff" wireframe transparent opacity={0.15} />
        </mesh>
      </group>
    </group>
  );
}

function HologramScene({ mode, speechPulse }: { mode: AssistantMode; speechPulse: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 35 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['transparent']} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#7df5ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff4fd8" />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <NeuralFace mode={mode} speechPulse={speechPulse} />
        <HUDRings mode={mode} />
      </Float>
      
      <ParticleField mode={mode} />
      
      {/* Bloom-like effect using a large faint sphere */}
      <mesh scale={[10, 10, 10]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0a121e" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </Canvas>
  );
}

export default function HolographicAssistant({
  onVoiceStatusChange,
}: {
  onVoiceStatusChange?: (status: VoiceStatus) => void;
}) {
  const [mode, setMode] = useState<AssistantMode>('standby');
  const [transcript, setTranscript] = useState('Say "Hey Saniya"');
  const [speechPulse, setSpeechPulse] = useState(0);
  const [isWakewordListening, setIsWakewordListening] = useState(false);
  const [isMicCapturing, setIsMicCapturing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const hasGreetedRef = useRef(false);
  const recognitionStateRef = useRef<'idle' | 'starting' | 'active'>('idle');
  const allowAutoRestartRef = useRef(true);
  const startAttemptInFlightRef = useRef(false);

  const devLog = useCallback((...args: unknown[]) => {
    if (!VOICE_DEBUG_ENABLED) return;
    // eslint-disable-next-line no-console -- Requested: runtime voice activation debug logs.
    console.log(...args);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    // Simulate lip sync pulse
    let pulseInterval: number | null = null;
    utterance.onstart = () => {
      setMode('speaking');
      setTranscript(text);
      pulseInterval = window.setInterval(() => {
        setSpeechPulse(Math.random() * 0.8 + 0.2);
      }, 100);
    };

    utterance.onend = () => {
      if (pulseInterval) window.clearInterval(pulseInterval);
      setSpeechPulse(0);
      setMode('listening');
      setTranscript('Listening...');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const activateAssistant = useCallback(() => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    devLog('[voice] assistant activated');
    setMode('waking');
    setTranscript('System initializing...');
    
    setTimeout(() => {
      speak(welcomeLine);
    }, 1000);
  }, [devLog, speak]);

  useEffect(() => {
    const browserWindow = window as BrowserWindow;
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setTranscript('Speech recognition unavailable');
      devLog('[voice] blocked: SpeechRecognition unsupported');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    devLog('[voice] SpeechRecognition supported');

    const scheduleRestart = () => {
      if (!allowAutoRestartRef.current) return;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = window.setTimeout(() => {
        if (!recognitionRef.current) return;
        if (recognitionStateRef.current !== 'idle') return;
        try {
          recognitionStateRef.current = 'starting';
          recognition.start();
        } catch {
          recognitionStateRef.current = 'idle';
        }
      }, 500);
    };

    const ensureMicPermission = async () => {
      if (!window.isSecureContext) {
        devLog('[voice] blocked: insecure context');
        return false;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        devLog('[voice] blocked: navigator.mediaDevices.getUserMedia unavailable');
        return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        devLog('[voice] microphone started (getUserMedia granted)');
        return true;
      } catch (error) {
        devLog('[voice] microphone blocked (getUserMedia error)', error);
        return false;
      }
    };

    const startWakewordListener = async (source: 'auto' | 'gesture') => {
      if (startAttemptInFlightRef.current) return;
      if (recognitionStateRef.current !== 'idle') return;

      startAttemptInFlightRef.current = true;
      try {
        const micOk = await ensureMicPermission();
        if (!micOk) {
          allowAutoRestartRef.current = false;
          setIsWakewordListening(false);
          setIsMicCapturing(false);
          if (source === 'auto') {
            setTranscript(window.isSecureContext ? 'Click anywhere to enable microphone' : 'Voice requires HTTPS or localhost');
            devLog('[voice] wakeword listener pending user gesture');
          }
          return;
        }

        try {
          recognitionStateRef.current = 'starting';
          recognition.start();
          devLog('[voice] speech recognition active');
        } catch (error) {
          recognitionStateRef.current = 'idle';
          allowAutoRestartRef.current = false;
          setIsWakewordListening(false);
          setTranscript('Click anywhere to enable microphone');
          devLog('[voice] speech recognition failed to start', error);
        }
      } finally {
        startAttemptInFlightRef.current = false;
      }
    };

    recognition.onresult = (event) => {
      const latest = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!latest) return;

      setTranscript(latest);

      if (/hey\s+saniya/i.test(latest) && !hasGreetedRef.current) {
        devLog('[voice] wakeword detected', latest);
        activateAssistant();
      }
    };

    recognition.onend = () => {
      recognitionStateRef.current = 'idle';
      setIsWakewordListening(false);
      setIsMicCapturing(false);
      scheduleRestart();
    };

    recognition.onstart = () => {
      recognitionStateRef.current = 'active';
      allowAutoRestartRef.current = true;
      setIsWakewordListening(true);
      setMode((prev) => (prev === 'standby' ? 'listening' : prev));
      devLog('[voice] speech recognition started');
    };

    recognition.onaudiostart = () => {
      setIsMicCapturing(true);
      devLog('[voice] microphone started (speech recognition audiostart)');
    };

    recognition.onaudioend = () => {
      setIsMicCapturing(false);
      devLog('[voice] microphone stopped (speech recognition audioend)');
    };

    recognition.onerror = (event) => {
      recognitionStateRef.current = 'idle';
      setIsWakewordListening(false);
      setIsMicCapturing(false);

      devLog('[voice] speech recognition error', event.error, event.message);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        allowAutoRestartRef.current = false;
        setTranscript('Click anywhere to enable microphone');
      } else if (event.error === 'audio-capture') {
        allowAutoRestartRef.current = false;
        setTranscript('No microphone detected');
      } else if (event.error === 'network') {
        setTranscript('Speech recognition network error');
      } else if (event.error === 'language-not-supported') {
        allowAutoRestartRef.current = false;
        setTranscript('Speech recognition language not supported');
      }
    };

    const clickToEnable = () => startWakewordListener('gesture').catch(() => {});
    window.addEventListener('click', clickToEnable);
    window.addEventListener('pointerdown', clickToEnable);
    window.addEventListener('keydown', clickToEnable);
    startWakewordListener('auto').catch(() => {});

    return () => {
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      window.removeEventListener('click', clickToEnable);
      window.removeEventListener('pointerdown', clickToEnable);
      window.removeEventListener('keydown', clickToEnable);
      recognition.onend = null;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onaudiostart = null;
      recognition.onaudioend = null;
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [activateAssistant, devLog]);

  useEffect(() => {
    if (!onVoiceStatusChange) return;
    onVoiceStatusChange({ mode, transcript, isWakewordListening, isMicCapturing });
  }, [isMicCapturing, isWakewordListening, mode, onVoiceStatusChange, transcript]);

  return (
    <div className={`hologram-shell mode-${mode}`}>
      <motion.div
        className="hologram-stage"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: mode === 'standby' ? 0.6 : 1,
          scale: mode === 'waking' ? [1, 1.1, 1] : 1
        }}
        transition={{ duration: 0.8 }}
      >
        <HologramScene mode={mode} speechPulse={speechPulse} />
        
        {/* Decorative HUD overlays */}
        <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 rounded-full scale-110 animate-pulse" />
        <div className="absolute inset-0 pointer-events-none border border-cyan-500/5 rounded-full scale-125 rotate-45" />
      </motion.div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="font-mono text-xs uppercase tracking-widest text-cyan-400/80"
          >
            {mode.toUpperCase()} MODE
          </motion.p>
        </AnimatePresence>
        
        <div className="glass-panel px-6 py-3 rounded-full border border-white/5 bg-black/40 min-w-[300px] text-center">
          <p className="text-sm text-slate-300 font-light italic">
            {transcript}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-center gap-5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isMicCapturing ? 'bg-emerald-300 shadow-[0_0_16px_rgba(124,255,178,0.9)]' : 'bg-slate-700'
              }`}
            />
            MIC {isMicCapturing ? 'ON' : 'OFF'}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isWakewordListening ? 'bg-cyan-300 shadow-[0_0_16px_rgba(125,245,255,0.9)]' : 'bg-slate-700'
              }`}
            />
            LISTEN {isWakewordListening ? 'ACTIVE' : 'IDLE'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hologram-shell {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .hologram-stage {
          width: 500px;
          height: 500px;
          position: relative;
          filter: drop-shadow(0 0 30px rgba(125, 245, 255, 0.2));
        }
        .mode-speaking .hologram-stage {
          filter: drop-shadow(0 0 50px rgba(125, 245, 255, 0.4));
        }
      `}</style>
    </div>
  );
}
