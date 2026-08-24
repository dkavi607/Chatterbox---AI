import React, { useState } from 'react';
import { Sliders, RefreshCw, VolumeX, Volume2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface AudioSettingsPanelProps {
  temperature: number;
  setTemperature: (v: number) => void;
  topP: number;
  setTopP: (v: number) => void;
  repetitionPenalty: number;
  setRepetitionPenalty: (v: number) => void;
  sampleRate: number;
  setSampleRate: (v: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  playbackPitch: number;
  setPlaybackPitch: (v: number) => void;
}

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({
  temperature,
  setTemperature,
  topP,
  setTopP,
  repetitionPenalty,
  setRepetitionPenalty,
  sampleRate,
  setSampleRate,
  playbackSpeed,
  setPlaybackSpeed,
  playbackPitch,
  setPlaybackPitch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const resetToDefaults = () => {
    setTemperature(0.8);
    setTopP(0.7);
    setRepetitionPenalty(2.0);
    setSampleRate(24000);
    setPlaybackSpeed(1.0);
    setPlaybackPitch(1.0);
  };

  const getTemperatureLabel = (val: number) => {
    if (val < 0.4) return 'Monotone / Precise';
    if (val <= 0.9) return 'Balanced / Natural';
    if (val <= 1.4) return 'Expressive / Dynamic';
    return 'Hyper-expressive / High Variance';
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header toggle */}
      <button
        id="audio-settings-toggle"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Voice Settings & Audio Parameters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Temp: {temperature.toFixed(2)} · {sampleRate / 1000}kHz
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded panel body */}
      {isExpanded && (
        <div className="p-5 space-y-5 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Temperature / Expressiveness */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Temperature (Prosody Variance)
                </span>
                <span className="font-bold text-indigo-600 font-mono">{temperature.toFixed(2)}</span>
              </div>
              <input
                id="temperature-slider"
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                {getTemperatureLabel(temperature)}
              </p>
            </div>

            {/* Sample Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">Audio Sample Rate</span>
                <span className="font-bold text-indigo-600 font-mono">{sampleRate} Hz</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '16 kHz', val: 16000 },
                  { label: '24 kHz (Master)', val: 24000 },
                  { label: '48 kHz', val: 48000 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSampleRate(item.val)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                      sampleRate === item.val
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top-P Sampling */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">Top-P (Nucleus Sampling)</span>
                <span className="font-bold text-indigo-600 font-mono">{topP.toFixed(2)}</span>
              </div>
              <input
                id="top-p-slider"
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Probability threshold cutoff during token generation
              </p>
            </div>

            {/* Repetition Penalty */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">Repetition Penalty</span>
                <span className="font-bold text-indigo-600 font-mono">{repetitionPenalty.toFixed(2)}</span>
              </div>
              <input
                id="repetition-penalty-slider"
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={repetitionPenalty}
                onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Prevents repeated syllables and loop artifacts
              </p>
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-end border-t border-slate-100">
            <button
              id="reset-parameters-button"
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset parameters to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
