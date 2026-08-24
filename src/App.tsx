import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TextInputStudio } from './components/TextInputStudio';
import { AudioSettingsPanel } from './components/AudioSettingsPanel';
import { AudioPlayerVisualizer } from './components/AudioPlayerVisualizer';
import { GenerationHistory } from './components/GenerationHistory';
import { MultilingualComparisonView } from './components/MultilingualComparisonView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { LanguageConfig, TTSGenerationResult } from './types';
import { Sparkles, Play, Loader2, AlertCircle, CheckCircle2, Cpu } from 'lucide-react';

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageConfig>(SUPPORTED_LANGUAGES[0]);
  const [text, setText] = useState<string>(SUPPORTED_LANGUAGES[0].sampleText);

  // Model Acoustic Parameters
  const [temperature, setTemperature] = useState<number>(0.8);
  const [topP, setTopP] = useState<number>(0.7);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(2.0);
  const [sampleRate, setSampleRate] = useState<number>(24000);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [playbackPitch, setPlaybackPitch] = useState<number>(1.0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TTSGenerationResult | null>(null);
  const [history, setHistory] = useState<TTSGenerationResult[]>([]);

  // API Key Modal
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');

  // Load history & API Key from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatterbox_tts_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedKey = localStorage.getItem('chatterbox_api_key');
      if (savedKey) {
        setCustomApiKey(savedKey);
      }
    } catch (e) {
      console.warn('Failed to load local history:', e);
    }
  }, []);

  const saveHistoryToStorage = (newHistory: TTSGenerationResult[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('chatterbox_tts_history', JSON.stringify(newHistory.slice(0, 30)));
    } catch (e) {
      console.warn('Failed to persist history:', e);
    }
  };

  const handleSynthesize = async (
    overrideText?: string,
    overrideLang?: LanguageConfig
  ) => {
    const textToSynthesize = (overrideText || text).trim();
    const langToUse = overrideLang || selectedLanguage;

    if (!textToSynthesize) {
      setErrorMsg('Please enter some text to generate speech.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSynthesize,
          language: langToUse.code,
          voice: langToUse.subvoice,
          sampleRate,
          temperature,
          topP,
          repetitionPenalty,
          apiKey: customApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Speech synthesis failed. Please try again.');
      }

      const result: TTSGenerationResult = {
        id: data.id,
        text: data.text,
        language: data.language,
        voice: data.voice,
        audioUrl: data.audioUrl,
        durationMs: data.durationMs,
        sampleRate: data.sampleRate,
        byteLength: data.byteLength,
        createdAt: data.createdAt,
        temperature: data.temperature,
        topP: data.topP,
        repetitionPenalty: data.repetitionPenalty,
      };

      setCurrentResult(result);

      // Prepend to history
      const updatedHistory = [result, ...history.filter((h) => h.id !== result.id)];
      saveHistoryToStorage(updatedHistory);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setErrorMsg(err.message || 'Network error while contacting NVIDIA TTS server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectLanguage = (lang: LanguageConfig) => {
    setSelectedLanguage(lang);
    if (!text || text === selectedLanguage.sampleText) {
      setText(lang.sampleText);
    }
  };

  const handleApplySampleText = (sampleText: string) => {
    setText(sampleText);
  };

  const handleQuickSynthesize = (sampleText: string, lang: LanguageConfig) => {
    setSelectedLanguage(lang);
    setText(sampleText);
    handleSynthesize(sampleText, lang);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistoryToStorage(updated);
    if (currentResult?.id === id) {
      setCurrentResult(updated[0] || null);
    }
  };

  const handleClearHistory = () => {
    saveHistoryToStorage([]);
    setCurrentResult(null);
  };

  const handleLoadIntoEditor = (result: TTSGenerationResult) => {
    setText(result.text);
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === result.language);
    if (lang) {
      setSelectedLanguage(lang);
    }
    if (result.temperature) setTemperature(result.temperature);
    if (result.topP) setTopP(result.topP);
    if (result.repetitionPenalty) setRepetitionPenalty(result.repetitionPenalty);
    if (result.sampleRate) setSampleRate(result.sampleRate);
  };

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    try {
      localStorage.setItem('chatterbox_api_key', key);
    } catch (e) {
      console.warn('Failed to save API key:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Header */}
      <Header
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        isGenerating={isGenerating}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-600 hover:text-rose-900 font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Language Picker, Text Editor, Settings & Synthesis */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Language Selector */}
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={handleSelectLanguage}
              onApplySampleText={handleApplySampleText}
            />

            {/* Text Input Studio */}
            <TextInputStudio
              text={text}
              onChangeText={setText}
              onSynthesize={() => handleSynthesize()}
              isGenerating={isGenerating}
            />

            {/* Model & Acoustic Parameter Sliders */}
            <AudioSettingsPanel
              temperature={temperature}
              setTemperature={setTemperature}
              topP={topP}
              setTopP={setTopP}
              repetitionPenalty={repetitionPenalty}
              setRepetitionPenalty={setRepetitionPenalty}
              sampleRate={sampleRate}
              setSampleRate={setSampleRate}
              playbackSpeed={playbackSpeed}
              setPlaybackSpeed={setPlaybackSpeed}
              playbackPitch={playbackPitch}
              setPlaybackPitch={setPlaybackPitch}
            />

            {/* Primary Action Button */}
            <button
              id="generate-voice-primary-button"
              type="button"
              onClick={() => handleSynthesize()}
              disabled={isGenerating || text.trim().length === 0}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isGenerating || text.trim().length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-md shadow-indigo-100'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Audio via NVIDIA NIM...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate {selectedLanguage.name} Voice (Ctrl+Enter)</span>
                </>
              )}
            </button>

            {/* Polyglot Preview grid */}
            <MultilingualComparisonView onQuickSynthesize={handleQuickSynthesize} />
          </div>

          {/* Right Column: Audio Player Visualizer & History Library */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">
            {/* Audio Visualizer & Player */}
            <AudioPlayerVisualizer
              currentResult={currentResult}
              playbackSpeed={playbackSpeed}
              setPlaybackSpeed={setPlaybackSpeed}
              languageFlag={
                SUPPORTED_LANGUAGES.find((l) => l.code === currentResult?.language)?.flag ||
                selectedLanguage.flag
              }
              languageName={
                SUPPORTED_LANGUAGES.find((l) => l.code === currentResult?.language)?.name ||
                selectedLanguage.name
              }
            />

            {/* Generation History */}
            <GenerationHistory
              history={history}
              onSelectResult={(item) => setCurrentResult(item)}
              onDeleteResult={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
              onLoadIntoEditor={handleLoadIntoEditor}
              activeResultId={currentResult?.id}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Powered by <strong>Resemble AI Chatterbox Multilingual</strong> on <strong>NVIDIA NIM</strong>
          </span>
          <span className="font-mono text-[11px]">
            End-to-End T3 + S3Gen Diffusion Decoder · 24 kHz Studio Output
          </span>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
