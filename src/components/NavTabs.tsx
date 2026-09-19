'use client';

import React from 'react';
import { Layers, CheckSquare, LayoutGrid, Book, History } from 'lucide-react';

export type TabType = 'flashcards' | 'quiz' | 'match' | 'dictionary' | 'history';

interface NavTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  dueCount?: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onChangeTab, dueCount }) => {
  const tabs = [
    { id: 'flashcards' as const, label: 'Flashcards', icon: Layers },
    { id: 'quiz' as const, label: 'Quiz / Learn', icon: CheckSquare },
    { id: 'match' as const, label: 'Match Game', icon: LayoutGrid },
    { id: 'dictionary' as const, label: 'Dictionary', icon: Book },
    { id: 'history' as const, label: 'Results & History', icon: History },
  ];

  return (
    <nav className="w-full flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto scrollbar-none shadow-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex-1 min-w-[120px] ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-slate-200/50 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span>{tab.label}</span>
            {tab.id === 'flashcards' && typeof dueCount === 'number' && dueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                {dueCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
