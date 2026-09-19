'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Star, Volume2, Download, Copy, Check, ArrowUpDown, X } from 'lucide-react';
import { Deck } from '@/types';
import { speakWord } from '@/lib/speech';
import { soundFx } from '@/lib/sounds';
import { getCardStage, formatReviewInterval } from '@/lib/srs';

interface DictionaryTabProps {
  deck: Deck;
  soundEnabled: boolean;
  onToggleStar: (word: string) => Promise<void>;
  onShowToast: (text: string, type?: 'success' | 'info' | 'sparkle') => void;
}

export const DictionaryTab: React.FC<DictionaryTabProps> = ({
  deck,
  soundEnabled,
  onToggleStar,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [copied, setCopied] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
        return;
      }
      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTerms = useMemo(() => {
    let list = [...deck.data];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.word.toLowerCase().includes(q) ||
          item.definition.toLowerCase().includes(q) ||
          (item.synonyms && item.synonyms.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Starred filter
    if (filterStarred) {
      list = list.filter((item) => item.isStarred);
    }

    // Sorting
    if (sortOrder === 'asc') {
      list.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortOrder === 'desc') {
      list.sort((a, b) => b.word.localeCompare(a.word));
    }

    return list;
  }, [deck.data, searchQuery, filterStarred, sortOrder]);

  const handleSpeak = (word: string) => {
    setSpeakingWord(word);
    speakWord(
      word,
      () => setSpeakingWord(word),
      () => setSpeakingWord(null)
    );
  };

  const handleExportJson = () => {
    soundFx.playClick(soundEnabled);
    const exportData = deck.data.map(({ word, definition, synonyms }) => ({
      word,
      synonyms,
      definition,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title.toLowerCase().replace(/\s+/g, '-')}-vocab.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('JSON deck file downloaded! 📥', 'success');
  };

  const handleCopyAll = () => {
    soundFx.playClick(soundEnabled);
    const textLines = deck.data
      .map(
        (item) =>
          `${item.word}: ${item.definition}${
            item.synonyms?.length ? ` (Synonyms: ${item.synonyms.join(', ')})` : ''
          }`
      )
      .join('\n\n');

    navigator.clipboard.writeText(textLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('All vocabulary copied to clipboard! 📋', 'success');
  };

  const totalStarred = deck.data.filter((item) => item.isStarred).length;

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
      {/* Top Controls: Search, Star Filter, Sort, Export, Copy */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* Search Bar (dark mode styled properly, transparent input) */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search across ${deck.data.length} terms, definitions, synonyms... (Press /)`}
            className="w-full pl-10 pr-12 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
          {!searchQuery ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-[10px] font-mono font-bold">/</kbd>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter and Tool buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Starred filter button */}
          <button
            type="button"
            onClick={() => setFilterStarred(!filterStarred)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-colors ${
              filterStarred
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Starred ({totalStarred})</span>
          </button>

          {/* Sort Order Selector */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl font-bold text-xs border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="default">Default Order</option>
              <option value="asc">A to Z</option>
              <option value="desc">Z to A</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            title="Download JSON deck"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Copy All */}
          <button
            type="button"
            onClick={handleCopyAll}
            title="Copy all vocabulary text"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Counter bar */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>Showing {filteredTerms.length} of {deck.data.length} terms</span>
      </div>

      {/* Vocabulary Cards List */}
      {filteredTerms.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Matching Words Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or toggling filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTerms.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
            >
              {/* Header: Word & Audio/Star tools */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                    {item.word}
                  </h3>
                  {item.synonyms && item.synonyms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {item.synonyms.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSpeak(item.word)}
                    title="Pronounce word"
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Volume2 className={`w-4 h-4 ${speakingWord === item.word ? 'text-indigo-600 animate-pulse' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStar(item.word)}
                    title={item.isStarred ? 'Unstar term' : 'Star term'}
                    className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        item.isStarred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Definition */}
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.definition}
              </p>

              {/* SRS Stage & Interval indicator */}
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    getCardStage(item) === 'Mastered'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : getCardStage(item) === 'Reviewing'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : getCardStage(item) === 'Learning'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                  }`}
                >
                  {getCardStage(item)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  • {formatReviewInterval(item)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
