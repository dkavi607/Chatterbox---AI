import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Repeat,
  Share2,
  Copy,
  Check,
  Radio,
  FileAudio,
  Sparkles,
} from 'lucide-react';
import { TTSGenerationResult } from '../types';

interface AudioPlayerVisualizerProps {
  currentResult: TTSGenerationResult | null;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  languageFlag?: string;
  languageName?: string;
}

export const AudioPlayerVisualizer: React.FC<AudioPlayerVisualizerProps> = ({
  currentResult,
  playbackSpeed,
  setPlaybackSpeed,
  languageFlag = '🌐',
  languageName = 'Selected Language',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([]);

  // Initialize or re-parse audio when currentResult changes
  useEffect(() => {
    if (!currentResult || !currentResult.audioUrl) return;

    setIsPlaying(false);
    setCurrentTime(0);

    // Generate static simulated waveform bars based on result byte content
    const barCount = 48;
    const amps: number[] = [];
    const seed = currentResult.text.length + currentResult.durationMs;
    for (let i = 0; i < barCount; i++) {
      const v = Math.abs(Math.sin((i + 1) * 0.35 + seed)) * 0.7 + Math.cos((i * 1.5) + seed) * 0.2 + 0.15;
      amps.push(Math.min(1, Math.max(0.12, v)));
    }
    setWaveAmplitudes(amps);

    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [currentResult]);

  // Handle Playback speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Audio setup for Web Audio Analyser
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.warn('Web Audio API initialized in fallback mode', e);
    }
  }, []);

  // Draw animated canvas visualizer
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const analyser = analyserRef.current;
    const progress = duration > 0 ? currentTime / duration : 0;

    if (analyser && isPlaying) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const barCount = 48;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const freqValue = dataArray[dataIndex] || 0;
        const normalized = Math.max(0.1, freqValue / 255);
        const barHeight = normalized * (height * 0.85);

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const isPassed = i / barCount <= progress;

        ctx.fillStyle = isPassed ? '#4f46e5' : '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    } else {
      // Draw static / scrubbed waveform
      const barCount = waveAmplitudes.length || 48;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const amplitude = waveAmplitudes[i] || 0.3;
        const barHeight = amplitude * (height * 0.75);
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;
        const isPassed = i / barCount <= progress;

        ctx.fillStyle = isPassed ? '#6366f1' : '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [isPlaying, currentTime, duration, waveAmplitudes]);

  useEffect(() => {
    drawWaveform();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWaveform]);

  const togglePlay = () => {
    if (!audioRef.current || !currentResult) return;
    setupAudioContext();

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error('Play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || (currentResult?.durationMs ? currentResult.durationMs / 1000 : 0));
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (!isLooping) {
      setCurrentTime(0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().then(() => setIsPlaying(true));
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const downloadWav = () => {
    if (!currentResult) return;
    const a = document.createElement('a');
    a.href = currentResult.audioUrl;
    a.download = `chatterbox_${currentResult.language}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyAudioData = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(currentResult.audioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (!currentResult) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center min-h-[320px] shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
          <FileAudio className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Audio Studio Player
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          Select a language, enter your text, and synthesize studio-grade audio with neural diffusion.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentResult.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        loop={isLooping}
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none">{languageFlag}</span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate uppercase tracking-wider">
              {languageName} Output
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{(currentResult.sampleRate / 1000).toFixed(0)} kHz WAV</span>
              <span>•</span>
              <span>{(currentResult.byteLength / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="copy-audio-base64-button"
            type="button"
            onClick={copyAudioData}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Copy Base64 Data URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            id="download-wav-audio-button"
            type="button"
            onClick={downloadWav}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Download Master WAV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audio</span>
          </button>
        </div>
      </div>

      {/* Waveform Canvas & Interactive Scrubber */}
      <div
        id="waveform-container"
        onClick={handleSeek}
        className="relative h-20 bg-slate-900 rounded-2xl overflow-hidden cursor-pointer group flex items-center justify-center px-4"
        title="Click to seek"
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={80}
          className="w-full h-full block"
        />

        {/* Playhead indicator bar */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 pointer-events-none shadow-sm shadow-indigo-400/50 transition-all"
          style={{
            left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
          }}
        />

        {/* Overlay hover effect */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Timecode ticker */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Play / Replay */}
        <div className="flex items-center gap-3">
          <button
            id="audio-play-pause-button"
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-200 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            id="audio-replay-button"
            type="button"
            onClick={handleReplay}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="audio-loop-toggle-button"
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2.5 rounded-xl transition-colors ${
              isLooping ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Toggle Repeat Loop"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Chips */}
        <div className="flex items-center gap-1">
          {[0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              id={`speed-chip-${speed}x`}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                playbackSpeed === speed
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            id="audio-mute-toggle-button"
            type="button"
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-700"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            id="audio-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-slate-100 accent-indigo-600 rounded-lg cursor-pointer appearance-none"
          />
        </div>
      </div>

      {/* Current Prompt Text snippet */}
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
        <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-1">
          Input Script
        </span>
        <p className="line-clamp-2 italic text-slate-800 leading-relaxed">
          "{currentResult.text}"
        </p>
      </div>
    </div>
  );
};
