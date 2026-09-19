'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Trash2,
  Trophy,
  Target,
  Layers,
  CheckSquare,
  LayoutGrid,
  Calendar,
  Clock,
} from 'lucide-react';
import { HistoryItem } from '@/types';

interface HistoryTabProps {
  history: HistoryItem[];
  onClearHistory: () => Promise<void>;
  bestRecords: Record<string, number>;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onClearHistory,
  bestRecords,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'flashcards' | 'quiz' | 'match'>('all');

  // KPI Calculations
  const stats = useMemo(() => {
    const totalSessions = history.length;

    // Average Quiz Accuracy
    const quizSessions = history.filter((h) => h.activityType === 'quiz');
    const avgAccuracy =
      quizSessions.length > 0
        ? Math.round(
            quizSessions.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) /
              quizSessions.length
          )
        : 0;

    // Best Match Time across all decks
    const times = Object.values(bestRecords).filter((t) => typeof t === 'number' && t > 0);
    const overallBest = times.length > 0 ? Math.min(...times) : null;

    const formatRecord = (sec: number | null) => {
      if (!sec) return '--:--.-';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const tenths = Math.floor((sec % 1) * 10);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
    };

    return {
      totalSessions,
      avgAccuracy,
      bestMatchTimeStr: formatRecord(overallBest),
      quizCount: quizSessions.length,
      matchCount: history.filter((h) => h.activityType === 'match').length,
      flashcardCount: history.filter((h) => h.activityType === 'flashcards').length,
    };
  }, [history, bestRecords]);

  const filteredHistory = useMemo(() => {
    if (filterType === 'all') return history;
    return history.filter((h) => h.activityType === filterType);
  }, [history, filterType]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your entire activity history?')) {
      onClearHistory();
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-5">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Sessions
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.totalSessions}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Avg Quiz Score
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.avgAccuracy > 0 ? `${stats.avgAccuracy}%` : 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Fastest Match
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {stats.bestMatchTimeStr}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Flashcard Runs
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.flashcardCount}
          </div>
        </div>
      </div>

      {/* Filter and Clear Header */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'flashcards', 'quiz', 'match'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History Log List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Activity History Yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Complete a flashcard review, take a quiz, or beat the match game to see your timeline and accuracy trends recorded here!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item) => {
            const isFlash = item.activityType === 'flashcards';
            const isQuiz = item.activityType === 'quiz';
            const isMatch = item.activityType === 'match';

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex-wrap sm:flex-nowrap"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isFlash
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : isQuiz
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isFlash && <Layers className="w-5 h-5" />}
                    {isQuiz && <CheckSquare className="w-5 h-5" />}
                    {isMatch && <LayoutGrid className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {item.deckTitle}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isFlash
                            ? 'bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : isQuiz
                            ? 'bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100/70 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.activityType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">
                      Result
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {item.score}
                    </span>
                  </div>

                  {item.accuracy !== undefined && item.accuracy > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">
                        Accuracy
                      </span>
                      <span
                        className={`text-sm font-black ${
                          item.accuracy >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.accuracy >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-500 dark:text-rose-400'
                        }`}
                      >
                        {item.accuracy}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
