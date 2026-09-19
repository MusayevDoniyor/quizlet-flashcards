'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Trophy, Repeat, History, Sparkles, LayoutGrid } from 'lucide-react';
import { Deck, MatchTile } from '@/types';
import { soundFx } from '@/lib/sounds';
import { fireConfetti } from '@/lib/confetti';

interface MatchTabProps {
  deck: Deck;
  soundEnabled: boolean;
  bestRecords: Record<string, number>;
  onRecordHistory: (data: {
    deckId: string;
    deckTitle: string;
    activityType: 'match';
    score: string;
    accuracy: number;
    timeSpentSec?: number;
  }) => Promise<void>;
  onSaveBestRecord: (deckId: string, seconds: number) => Promise<void>;
  onGoToHistory: () => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'sparkle') => void;
}

export const MatchTab: React.FC<MatchTabProps> = ({
  deck,
  soundEnabled,
  bestRecords,
  onRecordHistory,
  onSaveBestRecord,
  onGoToHistory,
  onShowToast,
}) => {
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedFirst, setSelectedFirst] = useState<MatchTile | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const bestTime = bestRecords[deck.id];

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  // Initialize a new match game
  const startNewGame = useCallback(() => {
    if (!deck.data || deck.data.length < 3) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setElapsedSec(0);
    setIsTimerRunning(false);
    setIsVictory(false);
    setIsNewRecord(false);
    setSelectedFirst(null);
    setIsEvaluating(false);

    // Pick 6 random terms (or deck length if < 6)
    const pairCount = Math.min(6, deck.data.length);
    const selected = [...deck.data].sort(() => Math.random() - 0.5).slice(0, pairCount);

    const newTiles: MatchTile[] = [];
    selected.forEach((item, idx) => {
      const pairId = `pair-${idx}`;
      newTiles.push({
        id: `word-${idx}`,
        text: item.word,
        type: 'word',
        pairId,
        isMatched: false,
        isSelected: false,
        isWrong: false,
      });
      newTiles.push({
        id: `def-${idx}`,
        text: item.definition,
        type: 'def',
        pairId,
        isMatched: false,
        isSelected: false,
        isWrong: false,
      });
    });

    // Shuffle tiles
    setTiles(newTiles.sort(() => Math.random() - 0.5));
  }, [deck]);

  useEffect(() => {
    startNewGame();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [startNewGame]);

  // Timer runner
  useEffect(() => {
    if (isTimerRunning && !isVictory) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSec((prev) => parseFloat((prev + 0.1).toFixed(1)));
      }, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, isVictory]);

  const handleTileClick = (tile: MatchTile) => {
    if (tile.isMatched || tile.isSelected || isEvaluating || isVictory) return;

    // Start timer on first move
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }

    soundFx.playClick(soundEnabled);

    // Select this tile
    const updated = tiles.map((t) => (t.id === tile.id ? { ...t, isSelected: true } : t));
    setTiles(updated);

    if (!selectedFirst) {
      // First tile selected
      setSelectedFirst(tile);
    } else {
      // Second tile selected -> evaluate
      setIsEvaluating(true);
      const isMatch = selectedFirst.pairId === tile.pairId && selectedFirst.type !== tile.type;

      if (isMatch) {
        // Correct match!
        soundFx.playSuccess(soundEnabled);
        setTimeout(() => {
          setTiles((prev) => {
            const next = prev.map((t) =>
              t.id === selectedFirst.id || t.id === tile.id
                ? { ...t, isMatched: true, isSelected: false }
                : t
            );

            // Check if all matched
            const remaining = next.filter((t) => !t.isMatched);
            if (remaining.length === 0) {
              handleVictory();
            }
            return next;
          });
          setSelectedFirst(null);
          setIsEvaluating(false);
        }, 300);
      } else {
        // Mismatch!
        soundFx.playError(soundEnabled);
        // Show shake/wrong animation
        setTiles((prev) =>
          prev.map((t) =>
            t.id === selectedFirst.id || t.id === tile.id ? { ...t, isWrong: true } : t
          )
        );

        setTimeout(() => {
          setTiles((prev) =>
            prev.map((t) =>
              t.id === selectedFirst.id || t.id === tile.id
                ? { ...t, isSelected: false, isWrong: false }
                : t
            )
          );
          setSelectedFirst(null);
          setIsEvaluating(false);
        }, 650);
      }
    }
  };

  const handleVictory = () => {
    setIsTimerRunning(false);
    setIsVictory(true);
    soundFx.playVictory(soundEnabled);
    fireConfetti();

    const finalSec = elapsedSec;

    if (!bestTime || finalSec < bestTime) {
      setIsNewRecord(true);
      onSaveBestRecord(deck.id, finalSec);
      onShowToast(`New Best Time: ${formatTime(finalSec)}! 🏆`, 'sparkle');
    } else {
      onShowToast(`Completed in ${formatTime(finalSec)}! 🎉`, 'sparkle');
    }

    onRecordHistory({
      deckId: deck.id,
      deckTitle: deck.title,
      activityType: 'match',
      score: formatTime(finalSec),
      accuracy: 100,
      timeSpentSec: Math.round(finalSec),
    });
  };

  if (!deck.data || deck.data.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 my-6 shadow-xs max-w-xl mx-auto">
        <LayoutGrid className="w-12 h-12 text-amber-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Insufficient Terms for Match Game</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-2">
          This deck has only {deck.data.length} term{deck.data.length === 1 ? '' : 's'}. Match Game requires at least 3 terms to generate matching tiles.
        </p>
      </div>
    );
  }

  const remainingPairs = tiles.filter((t) => !t.isMatched && t.type === 'word').length;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
      {/* Top Header: Pairs Remaining, Timer, Best Record, New Game */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Remaining
            </span>
            <span className="text-base font-black text-slate-900 dark:text-slate-100">
              {remainingPairs} pairs
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Time
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                {formatTime(elapsedSec)}
              </span>
            </div>
          </div>

          {bestTime && (
            <>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-amber-500">
                <Trophy className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Best Record
                  </span>
                  <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
                    {formatTime(bestTime)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={startNewGame}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
        >
          <Repeat className="w-3.5 h-3.5" />
          Reset Game
        </button>
      </div>

      {/* Matching Tiles Grid (Dark mode styled properly with .match-tile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 select-none">
        {tiles.map((tile) => {
          let cardStyle =
            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md';

          if (tile.isMatched) {
            cardStyle =
              'opacity-0 pointer-events-none scale-95 transition-all duration-300';
          } else if (tile.isWrong) {
            cardStyle =
              'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 ring-4 ring-rose-500/20 animate-shake';
          } else if (tile.isSelected) {
            cardStyle =
              'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-4 ring-indigo-500/20 scale-[1.02] shadow-lg';
          }

          return (
            <button
              key={tile.id}
              type="button"
              disabled={tile.isMatched || isEvaluating}
              onClick={() => handleTileClick(tile)}
              className={`p-4 rounded-2xl border min-h-[110px] flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs cursor-pointer ${cardStyle}`}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 opacity-70">
                {tile.type === 'word' ? 'Term' : 'Definition'}
              </span>
              <span
                className={`font-extrabold ${
                  tile.type === 'word' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm font-medium leading-snug'
                }`}
              >
                {tile.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Victory Modal */}
      {isVictory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-7 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Victory! All Matched! 🎉
            </h2>

            {isNewRecord && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wider my-3">
                <Sparkles className="w-3.5 h-3.5" />
                New Personal Record!
              </div>
            )}

            <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                Final Clear Time
              </span>
              <div className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {formatTime(elapsedSec)}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={startNewGame}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                <Repeat className="w-4 h-4" />
                Play Again
              </button>
              <button
                type="button"
                onClick={onGoToHistory}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                <History className="w-4 h-4" />
                View History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
