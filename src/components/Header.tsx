'use client';

import React from 'react';
import { Volume2, VolumeX, Sun, Moon, Cloud, Sparkles, BookOpen } from 'lucide-react';
import { CustomDeckDropdown } from '@/components/CustomDeckDropdown';
import { Deck, DbStatusResponse } from '@/types';

interface HeaderProps {
  decks: Deck[];
  currentDeckId: string;
  onSelectDeck: (id: string) => void;
  onOpenAddModal: () => void;
  onDeleteDeck: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  dbStatus: DbStatusResponse | null;
  onOpenDbModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  decks,
  currentDeckId,
  onSelectDeck,
  onOpenAddModal,
  onDeleteDeck,
  soundEnabled,
  onToggleSound,
  isDark,
  onToggleDark,
  dbStatus,
  onOpenDbModal,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col gap-3">
        {/* Top bar: Brand & Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25">
              <Sparkles className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                LexiLearn
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
                Professional Flashcard & Active Recall Platform
              </p>
            </div>
          </div>

          {/* Controls: Cloud Sync, Sound, Theme */}
          <div className="flex items-center gap-2">
            {/* Cloud Sync Status Button */}
            <button
              type="button"
              onClick={onOpenDbModal}
              title={dbStatus?.connected ? 'Cloud sync active: All progress saved' : 'Offline mode: Saved locally'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Cloud className="w-3.5 h-3.5 text-indigo-500" />
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus?.connected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px]">
                {dbStatus?.connected ? 'Cloud Synced' : 'Offline Mode'}
              </span>
            </button>

            {/* Sound FX Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              title={soundEnabled ? 'Sound FX ON' : 'Sound FX MUTED'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Dark theme' : 'Light theme'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom bar: Vocabulary Deck Selector */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Vocabulary Set:</span>
          </div>

          <CustomDeckDropdown
            decks={decks}
            currentDeckId={currentDeckId}
            onSelectDeck={onSelectDeck}
            onOpenAddModal={onOpenAddModal}
            onDeleteDeck={onDeleteDeck}
          />
        </div>
      </div>
    </header>
  );
};
