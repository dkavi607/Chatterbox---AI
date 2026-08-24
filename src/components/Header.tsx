import React from 'react';
import { Key, ExternalLink, Volume2, Cpu } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  isGenerating: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenApiKeyModal, isGenerating }) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
                Chatterbox <span className="text-indigo-600">AI</span>
              </h1>
              <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Cpu className="w-3 h-3" />
                NVIDIA NIM
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              500M T3 + S3Gen Diffusion Decoder · 23 Languages · 24kHz Studio Audio
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              {isGenerating ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              )}
            </span>
            <span className="hidden md:inline">
              {isGenerating ? 'Synthesizing...' : 'API Connected'}
            </span>
          </div>

          {/* API Key Config Button */}
          <button
            id="api-key-config-button"
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
            title="Configure NVIDIA API Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">API Key</span>
          </button>

          {/* NVIDIA Link */}
          <a
            id="nvidia-nim-docs-link"
            href="https://build.nvidia.com/resembleai/chatterbox-multilingual-tts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span className="hidden sm:inline">NVIDIA Catalog</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
};
