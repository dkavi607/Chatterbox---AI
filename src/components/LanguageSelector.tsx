import React, { useState, useMemo } from 'react';
import { Search, Globe, ChevronDown, Check, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { LanguageConfig } from '../types';

interface LanguageSelectorProps {
  selectedLanguage: LanguageConfig;
  onSelectLanguage: (lang: LanguageConfig) => void;
  onApplySampleText: (text: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onApplySampleText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<string>('All');

  const regions = ['All', 'Europe', 'Asia Pacific', 'Americas', 'Middle East', 'Nordics', 'Africa'];

  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((lang) => {
      const matchesSearch =
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeRegion === 'All') return matchesSearch;
      if (activeRegion === 'Americas') {
        return matchesSearch && (lang.region === 'North America' || lang.region === 'Latin America');
      }
      if (activeRegion === 'Middle East') {
        return matchesSearch && (lang.region.includes('Middle East') || lang.region.includes('South Asia'));
      }
      return matchesSearch && lang.region.includes(activeRegion);
    });
  }, [searchQuery, activeRegion]);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Target Language ({SUPPORTED_LANGUAGES.length} Available)
      </label>

      {/* Selected Language Display Trigger */}
      <button
        id="language-selector-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-left shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl leading-none">{selectedLanguage.flag}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm truncate">
                {selectedLanguage.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                {selectedLanguage.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {selectedLanguage.nativeName} · {selectedLanguage.description}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Quick Sample Button */}
      <div className="mt-2 flex items-center justify-between">
        <button
          id="load-native-sample-button"
          type="button"
          onClick={() => onApplySampleText(selectedLanguage.sampleText)}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load native {selectedLanguage.nativeName} sample phrase
        </button>
        <span className="text-[11px] text-slate-400">
          Subvoice: {selectedLanguage.subvoice.split('.').slice(-2).join(' ')}
        </span>
      </div>

      {/* Modal / Dropdown Dialog */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 p-3 rounded-2xl bg-white border border-slate-200 shadow-xl max-h-96 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="language-search-input"
              type="text"
              placeholder="Search language, code, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Region Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {regions.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  activeRegion === region
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
            {filteredLanguages.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No languages found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === selectedLanguage.code;
                return (
                  <button
                    key={lang.code}
                    id={`language-option-${lang.code}`}
                    type="button"
                    onClick={() => {
                      onSelectLanguage(lang);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isSelected ? 'bg-indigo-50 text-indigo-950' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl leading-none">{lang.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-800 truncate">
                            {lang.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {lang.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {lang.nativeName}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
