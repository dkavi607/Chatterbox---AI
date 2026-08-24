import React from 'react';
import { Sparkles, Trash2, Clipboard, Clock, MessageSquareQuote, Sliders } from 'lucide-react';
import { PRESET_CATEGORIES } from '../data/languages';

interface TextInputStudioProps {
  text: string;
  onChangeText: (newText: string) => void;
  onSynthesize: () => void;
  isGenerating: boolean;
}

export const TextInputStudio: React.FC<TextInputStudioProps> = ({
  text,
  onChangeText,
  onSynthesize,
  isGenerating,
}) => {
  const maxChars = 2000;
  const charCount = text.length;

  // Approximate reading speed: ~15 characters per second
  const estimatedSeconds = Math.max(1, Math.round(charCount / 14));

  const handlePasteClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        onChangeText(clipboardText);
      }
    } catch (e) {
      console.warn('Could not read from clipboard:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && text.trim().length > 0) {
        onSynthesize();
      }
    }
  };

  const insertTag = (tag: string) => {
    onChangeText(text + (text.endsWith(' ') || text.length === 0 ? '' : ' ') + tag);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Input Text & Script
        </label>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Est. ~{estimatedSeconds}s audio
          </span>
          <span className={charCount > maxChars ? 'text-rose-500 font-semibold' : ''}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Editor Box */}
      <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
        <textarea
          id="tts-text-input"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter text to convert to natural speech in any supported language... (or select a preset template below)"
          rows={6}
          maxLength={maxChars}
          className="w-full p-4 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 resize-y min-h-[160px] leading-relaxed"
        />

        {/* Bottom Toolbar inside text area */}
        <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          {/* Quick SSML / Punctuation helpers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mr-1 hidden sm:inline">
              Insert:
            </span>
            <button
              id="insert-pause-button"
              type="button"
              onClick={() => insertTag('... ')}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-mono transition-colors shadow-2xs"
              title="Add a conversational pause"
            >
              Pause (...)
            </button>
            <button
              id="insert-break-button"
              type="button"
              onClick={() => insertTag('[break] ')}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-mono transition-colors shadow-2xs"
              title="Add explicit break tag"
            >
              [break]
            </button>
            <button
              id="insert-emphasis-button"
              type="button"
              onClick={() => insertTag('! ')}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-mono transition-colors shadow-2xs"
              title="Add emphasis"
            >
              Emphasis (!)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              id="paste-clipboard-button"
              type="button"
              onClick={handlePasteClipboard}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
              title="Paste text from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
            {text.length > 0 && (
              <button
                id="clear-text-button"
                type="button"
                onClick={() => onChangeText('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear text"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Category Pills */}
      <div className="mt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-medium text-slate-400 flex-shrink-0 flex items-center gap-1">
            <MessageSquareQuote className="w-3 h-3" />
            Presets:
          </span>
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              id={`preset-btn-${cat.id}`}
              type="button"
              onClick={() => onChangeText(cat.text)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200/80 transition-colors whitespace-nowrap"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
