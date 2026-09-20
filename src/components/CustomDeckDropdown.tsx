'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Sparkles, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { Deck } from '@/types';

interface CustomDeckDropdownProps {
  decks: Deck[];
  currentDeckId: string;
  onSelectDeck: (deckId: string) => void;
  onOpenAddModal: () => void;
  onDeleteDeck: (deckId: string) => void;
}

export const CustomDeckDropdown: React.FC<CustomDeckDropdownProps> = ({
  decks,
  currentDeckId,
  onSelectDeck,
  onOpenAddModal,
  onDeleteDeck,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDeck = decks.find((d) => d.id === currentDeckId) || decks[0];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!currentDeck) return null;

  return (
    <div className="flex items-center gap-2.5 flex-1 w-full sm:w-auto min-w-0 max-w-xl" ref={dropdownRef}>
      <div className="relative flex-1 min-w-0">
        {/* Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border font-bold text-sm transition-all duration-200 shadow-sm ${
            isOpen
              ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-4 ring-indigo-500/15'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                currentDeck.isPreset
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {currentDeck.isPreset ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <span className="truncate text-slate-800 dark:text-slate-100">{currentDeck.title}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
              {currentDeck.termsCount || currentDeck.data.length} terms
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-indigo-500' : ''
            }`}
          />
        </button>

        {/* Floating Menu Popover */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-full min-w-full sm:min-w-[320px]"
          >
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>AVAILABLE VOCABULARY DECKS</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-800 font-bold">
                {decks.length} sets
              </span>
            </div>

            <div className="p-1.5 max-h-[290px] overflow-y-auto space-y-1">
              {decks.map((deck) => {
                const isSelected = deck.id === currentDeckId;
                return (
                  <div
                    key={deck.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectDeck(deck.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          deck.isPreset
                            ? 'bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-amber-100/70 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {deck.isPreset ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{deck.title}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                              deck.isPreset
                                ? 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                : 'bg-amber-200/60 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {deck.isPreset ? 'Preset' : 'Custom'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {deck.termsCount || deck.data.length} terms & definitions
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Study Set
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Custom Deck Button */}
      {!currentDeck.isPreset && (
        <button
          type="button"
          onClick={() => onDeleteDeck(currentDeck.id)}
          title="Delete this custom deck"
          className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
          aria-label="Delete set"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
