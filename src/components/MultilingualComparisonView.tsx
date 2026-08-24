import React, { useState } from 'react';
import { Sparkles, Globe2, Play, Loader2, Volume2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { LanguageConfig } from '../types';

interface MultilingualComparisonViewProps {
  onQuickSynthesize: (text: string, language: LanguageConfig) => void;
}

export const MultilingualComparisonView: React.FC<MultilingualComparisonViewProps> = ({
  onQuickSynthesize,
}) => {
  const [inputText, setInputText] = useState('Hello! I can speak twenty-three languages naturally with artificial intelligence.');

  // Top flagship languages for quick multilingual preview
  const featuredLangs = SUPPORTED_LANGUAGES.slice(0, 8);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Instant Polyglot Preview
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Click any flag to test that voice
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {featuredLangs.map((lang) => (
          <button
            key={lang.code}
            id={`polyglot-preview-${lang.code}`}
            type="button"
            onClick={() => onQuickSynthesize(lang.sampleText, lang)}
            className="flex items-center gap-2 p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all text-left group"
          >
            <span className="text-2xl leading-none">{lang.flag}</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 truncate">
                {lang.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {lang.nativeName}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
