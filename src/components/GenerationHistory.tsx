import React from 'react';
import { Play, Download, Trash2, Clock, History, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { TTSGenerationResult } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

interface GenerationHistoryProps {
  history: TTSGenerationResult[];
  onSelectResult: (result: TTSGenerationResult) => void;
  onDeleteResult: (id: string) => void;
  onClearHistory: () => void;
  onLoadIntoEditor: (result: TTSGenerationResult) => void;
  activeResultId?: string;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  onSelectResult,
  onDeleteResult,
  onClearHistory,
  onLoadIntoEditor,
  activeResultId,
}) => {
  const getLanguageFlag = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang ? lang.flag : '🌐';
  };

  const getLanguageName = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang ? lang.name : code;
  };

  const formatDuration = (ms: number) => {
    const s = (ms / 1000).toFixed(1);
    return `${s}s`;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Generation Library ({history.length})
          </h3>
        </div>
        <button
          id="clear-all-history-button"
          type="button"
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Grid of history cards */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {history.map((item) => {
          const isActive = item.id === activeResultId;
          const flag = getLanguageFlag(item.language);
          const langName = getLanguageName(item.language);

          return (
            <div
              key={item.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {/* Left Info & Play */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  id={`history-play-${item.id}`}
                  type="button"
                  onClick={() => onSelectResult(item)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700'
                  }`}
                  title="Play in studio player"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{flag}</span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {langName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDuration(item.durationMs)} • {formatTimestamp(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    "{item.text}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  id={`history-load-${item.id}`}
                  type="button"
                  onClick={() => onLoadIntoEditor(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Load text into editor"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <a
                  id={`history-download-${item.id}`}
                  href={item.audioUrl}
                  download={`chatterbox_${item.language}_${item.id}.wav`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Download WAV"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  id={`history-delete-${item.id}`}
                  type="button"
                  onClick={() => onDeleteResult(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
