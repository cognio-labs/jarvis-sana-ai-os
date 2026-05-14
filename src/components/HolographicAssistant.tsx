import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type AssistantMode = 'standby' | 'listening' | 'speaking';

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type BrowserWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const welcomeLine = 'Welcome back Aryan Boss.';
const particleCount = 520;

function HologramMaterial({ mode }: { mode: AssistantMode }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uIntensity.value =
      mode === 'speaking' ? 1.65 : mode === 'listening' ? 1.25 : 0.82;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      uniforms={{
        uTime: { value: 0 },
        uIntensity: { value: 0.85 },
      }}
      vertexShader={`
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          float scan = 0.54 + 0.46 * sin((vPosition.y * 34.0) + (uTime * 7.0));
          float neural = smoothstep(0.12, 0.96, fresnel + scan * 0.22);
          vec3 color = mix(vec3(0.05, 0.55, 1.0), vec3(0.36, 1.0, 0.95), neural);
          float alpha = (0.24 + fresnel * 0.72 + scan * 0.08) * uIntensity;
          gl_FragColor = vec4(color * (1.0 + fresnel * 1.8), alpha);
        }
      `}
    />
  );
}

function NeuralConstellation({ active }: { active: boolean }) {
  const lines = useMemo(() => {
    const points: number[] = [];

    for (let i = 0; i < 64; i += 1) {
      const y = THREE.MathUtils.mapLinear(i, 0, 63, 0.86, -0.9);
      const width = 0.08 + Math.sin(i * 0.72) * 0.03 + (1 - Math.abs(y)) * 0.28;
      const x = Math.sin(i * 2.08) * width;
      const z = 0.43 + Math.cos(i * 0.9) * 0.04;

      if (i > 0) {
        points.push(x, y, z);
        points.push(Math.sin((i - 1) * 2.08) * width * 0.9, THREE.MathUtils.mapLinear(i - 1, 0, 63, 0.86, -0.9), z);
      }
    }

    return new Float32Array(points);
  }, []);

  const ref = useRef<THREE.LineSegments>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }

    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.35) * 0.025;
    const material = ref.current.material as THREE.LineBasicMaterial;
    material.opacity = active ? 0.48 : 0.25;
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[lines, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#7df5ff" transparent opacity={0.34} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

function ParticleField({ mode }: { mode: AssistantMode }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const radius = 1.45 + Math.random() * 1.55;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 3.2;
      data[i * 3] = Math.cos(angle) * radius;
      data[i * 3 + 1] = height;
      data[i * 3 + 2] = Math.sin(angle) * radius * 0.34;
    }

    return data;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }

    const speed = mode === 'speaking' ? 0.28 : mode === 'listening' ? 0.18 : 0.1;
    ref.current.rotation.y = clock.elapsedTime * speed;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={mode === 'speaking' ? '#8ffcff' : '#3bdcff'}
        transparent
        opacity={mode === 'standby' ? 0.42 : 0.72}
        size={0.018}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function HologramFace({ mode, speechPulse }: { mode: AssistantMode; speechPulse: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftLidRef = useRef<THREE.Mesh>(null);
  const rightLidRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const awakeBoost = mode === 'standby' ? 0.55 : 1;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.52) * 0.085 * awakeBoost;
      groupRef.current.rotation.x = Math.sin(time * 0.38) * 0.035;
      groupRef.current.position.y = Math.sin(time * 0.72) * 0.035;
      groupRef.current.scale.setScalar(mode === 'speaking' ? 1.02 : 1);
    }

    if (mouthRef.current) {
      const talking = mode === 'speaking' ? Math.abs(Math.sin(time * 15.5)) * 0.19 + speechPulse * 0.17 : 0.035;
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, talking, 0.28);
    }

    const blink = Math.sin(time * 2.4) > 0.984 ? 0.08 : 1;
    if (leftLidRef.current && rightLidRef.current) {
      leftLidRef.current.scale.y = THREE.MathUtils.lerp(leftLidRef.current.scale.y, blink, 0.35);
      rightLidRef.current.scale.y = THREE.MathUtils.lerp(rightLidRef.current.scale.y, blink, 0.35);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.06, 0]}>
      <mesh scale={[0.74, 1.05, 0.48]}>
        <sphereGeometry args={[1, 96, 96]} />
        <HologramMaterial mode={mode} />
      </mesh>

      <mesh position={[-0.24, 0.2, 0.48]} scale={[0.18, 0.035, 0.012]} ref={leftLidRef}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#bafcff" transparent opacity={0.96} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.24, 0.2, 0.48]} scale={[0.18, 0.035, 0.012]} ref={rightLidRef}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#bafcff" transparent opacity={0.96} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -0.35, 0.52]} scale={[0.28, 0.06, 0.014]} ref={mouthRef}>
        <sphereGeometry args={[1, 48, 16]} />
        <meshBasicMaterial color="#7df5ff" transparent opacity={0.88} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -1.05, 0]} scale={[0.52, 0.7, 0.34]}>
        <sphereGeometry args={[1, 48, 32]} />
        <HologramMaterial mode={mode} />
      </mesh>

      <NeuralConstellation active={mode !== 'standby'} />
    </group>
  );
}

function HologramScene({ mode, speechPulse }: { mode: AssistantMode; speechPulse: number }) {
  return (
    <Canvas camera={{ position: [0, 0.08, 4.5], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 1.5, 2.5]} color="#7df5ff" intensity={mode === 'speaking' ? 3.8 : 2.7} />
      <pointLight position={[-2.2, -0.6, 1.6]} color="#ff4fd8" intensity={mode === 'standby' ? 0.7 : 1.2} />
      <ParticleField mode={mode} />
      <HologramFace mode={mode} speechPulse={speechPulse} />
    </Canvas>
  );
}

export default function HolographicAssistant() {
  const [mode, setMode] = useState<AssistantMode>('standby');
  const [transcript, setTranscript] = useState('Say "Hey Saniya"');
  const [speechPulse, setSpeechPulse] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const hasGreetedRef = useRef(false);

  const speakWelcome = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setMode('listening');
      setTranscript(welcomeLine);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(welcomeLine);
    utterance.rate = 0.92;
    utterance.pitch = 0.82;
    utterance.volume = 1;

    utterance.onstart = () => {
      setMode('speaking');
      setTranscript(welcomeLine);
    };
    utterance.onboundary = () => setSpeechPulse(Math.random() * 0.8 + 0.2);
    utterance.onend = () => {
      setSpeechPulse(0);
      setMode('listening');
      setTranscript('Listening');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const activateAssistant = useCallback(() => {
    hasGreetedRef.current = true;
    setMode('listening');
    setTranscript('Wakeword confirmed');
    window.setTimeout(speakWelcome, 360);
  }, [speakWelcome]);

  useEffect(() => {
    const browserWindow = window as BrowserWindow;
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setTranscript('Speech recognition unavailable');
      return undefined;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const latest = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!latest) {
        return;
      }

      setTranscript(latest);
      setMode((current) => (current === 'speaking' ? current : 'listening'));

      if (/hey\s+saniya/i.test(latest) && !hasGreetedRef.current) {
        activateAssistant();
      }
    };

    recognition.onend = () => {
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }

      restartTimerRef.current = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          setTranscript('Voice scanner standing by');
        }
      }, 900);
    };

    try {
      recognition.start();
    } catch {
      setTranscript('Voice scanner standing by');
    }

    return () => {
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      recognition.onend = null;
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [activateAssistant]);

  return (
    <div className={`hologram-shell hologram-${mode}`}>
      <motion.div
        className="hologram-stage"
        animate={{
          opacity: mode === 'standby' ? 0.78 : 1,
          scale: mode === 'speaking' ? 1.025 : 1,
        }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <HologramScene mode={mode} speechPulse={speechPulse} />
        <div className="hologram-reticle" />
        <div className="hologram-platform" />
      </motion.div>

      <div className="mt-5 w-full max-w-xl text-center">
        <p className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-200">
          {mode === 'speaking' ? 'SANIYA SPEAKING' : mode === 'listening' ? 'SANIYA LISTENING' : 'SANIYA STANDBY'}
        </p>
        <p className="mt-3 min-h-6 text-sm leading-6 text-slate-300">{transcript}</p>
      </div>
    </div>
  );
}
