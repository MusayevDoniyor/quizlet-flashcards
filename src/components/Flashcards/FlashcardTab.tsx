'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Star,
  Shuffle,
  RotateCw,
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  History,
  Repeat,
  Brain,
  Layers,
} from 'lucide-react';
import { Deck, VocabItem, SrsRating } from '@/types';
import { speakWord } from '@/lib/speech';
import { soundFx } from '@/lib/sounds';
import { fireConfetti } from '@/lib/confetti';
import { isCardDue, getCardStage, formatReviewInterval, calculateSm2 } from '@/lib/srs';

interface FlashcardTabProps {
  deck: Deck;
  soundEnabled: boolean;
  onToggleStar: (word: string) => Promise<void>;
  onReviewCard?: (word: string, rating: SrsRating) => Promise<void>;
  onRecordHistory: (data: {
    deckId: string;
    deckTitle: string;
    activityType: 'flashcards';
    score: string;
    accuracy: number;
    timeSpentSec?: number;
  }) => Promise<void>;
  onGoToQuiz: () => void;
  onGoToHistory: () => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'sparkle' | 'error') => void;
}

export const FlashcardTab: React.FC<FlashcardTabProps> = ({
  deck,
  soundEnabled,
  onToggleStar,
  onReviewCard,
  onRecordHistory,
  onGoToQuiz,
  onGoToHistory,
  onShowToast,
}) => {
  const [studyMode, setStudyMode] = useState<'all' | 'srs'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStarredOnly, setIsStarredOnly] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [shuffledDeck, setShuffledDeck] = useState<VocabItem[]>(deck.data);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number>(0);
  const isSwipingRef = useRef(false);

  // Sync shuffled deck when deck changes
  useEffect(() => {
    setShuffledDeck(deck.data);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  }, [deck]);

  // Due cards count in this deck
  const dueCardsCount = useMemo(() => {
    return deck.data.filter((c) => isCardDue(c)).length;
  }, [deck.data]);

  // Stage counts for deck stats
  const stageCounts = useMemo(() => {
    const counts = { New: 0, Learning: 0, Reviewing: 0, Mastered: 0 };
    deck.data.forEach((card) => {
      const stage = getCardStage(card);
      counts[stage] += 1;
    });
    return counts;
  }, [deck.data]);

  // Filter deck based on study mode and starred filter
  const activeDeck = useMemo(() => {
    let list = shuffledDeck;
    if (studyMode === 'srs') {
      list = list.filter((item) => isCardDue(item));
    }
    if (isStarredOnly) {
      list = list.filter((item) => item.isStarred);
    }
    return list;
  }, [shuffledDeck, studyMode, isStarredOnly]);

  const currentCard: VocabItem | undefined = activeDeck[currentIndex];

  const handleFlip = useCallback(() => {
    soundFx.playCardFlip(soundEnabled);
    setIsFlipped((prev) => !prev);
  }, [soundEnabled]);

  const handleNext = useCallback(() => {
    soundFx.playClick(soundEnabled);
    setIsFlipped(false);
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all cards in current view
      setIsCompleted(true);
      setIsAutoPlaying(false);
      soundFx.playVictory(soundEnabled);
      fireConfetti();
      onShowToast(
        studyMode === 'srs'
          ? 'All due spaced repetition reviews completed! 🧠🎉'
          : 'All flashcards reviewed! 🎉',
        'sparkle'
      );
      onRecordHistory({
        deckId: deck.id,
        deckTitle: deck.title,
        activityType: 'flashcards',
        score: `${activeDeck.length}/${activeDeck.length} terms`,
        accuracy: 100,
      });
    }
  }, [currentIndex, activeDeck.length, soundEnabled, deck, studyMode, onRecordHistory, onShowToast]);

  const handlePrev = useCallback(() => {
    soundFx.playClick(soundEnabled);
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, soundEnabled]);

  // SRS Rating submission
  const handleRateCard = useCallback(
    async (rating: SrsRating) => {
      if (!currentCard) return;

      // Audio feedback according to rating
      if (rating === 1) {
        soundFx.playError(soundEnabled);
      } else if (rating === 2) {
        soundFx.playClick(soundEnabled);
      } else {
        soundFx.playSuccess(soundEnabled);
      }

      // Calculate preview interval
      const preview = calculateSm2(currentCard, rating);
      const daysText = preview.intervalDays === 1 ? 'tomorrow' : `in ${preview.intervalDays} days`;
      onShowToast(
        rating === 1
          ? `Reset "${currentCard.word}" — Review tomorrow`
          : `Rated "${currentCard.word}" — Next review ${daysText}`,
        'info'
      );

      // Invoke server/client updater
      if (onReviewCard) {
        await onReviewCard(currentCard.word, rating);
      }

      // Advance to next card or complete
      if (currentIndex < activeDeck.length - 1) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
        setIsAutoPlaying(false);
        soundFx.playVictory(soundEnabled);
        fireConfetti();
        onShowToast('Spaced repetition session complete! 🧠🎉', 'sparkle');
        onRecordHistory({
          deckId: deck.id,
          deckTitle: deck.title,
          activityType: 'flashcards',
          score: `${activeDeck.length} cards reviewed`,
          accuracy: 100,
        });
      }
    },
    [
      currentCard,
      currentIndex,
      activeDeck.length,
      soundEnabled,
      onReviewCard,
      onShowToast,
      onRecordHistory,
      deck,
    ]
  );

  const handleShuffle = useCallback(() => {
    soundFx.playClick(soundEnabled);
    const shuffled = [...shuffledDeck].sort(() => Math.random() - 0.5);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    onShowToast('Flashcards shuffled! 🔀', 'info');
  }, [shuffledDeck, soundEnabled, onShowToast]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  }, []);

  const handleSpeak = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    setIsSpeaking(true);
    speakWord(
      word,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleStar = useCallback(
    async (e: React.MouseEvent | KeyboardEvent, word: string) => {
      e.stopPropagation();
      soundFx.playClick(soundEnabled);
      await onToggleStar(word);
    },
    [soundEnabled, onToggleStar]
  );

  // Keyboard navigation: Space (Flip), Arrows (Prev/Next), 1-4 (SM-2 ratings when flipped)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isCompleted) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyS' && currentCard) {
        handleStar(e, currentCard.word);
      } else if (e.code === 'KeyR') {
        handleShuffle();
      } else if (isFlipped && ['Digit1', 'Numpad1'].includes(e.code)) {
        e.preventDefault();
        handleRateCard(1);
      } else if (isFlipped && ['Digit2', 'Numpad2'].includes(e.code)) {
        e.preventDefault();
        handleRateCard(2);
      } else if (isFlipped && ['Digit3', 'Numpad3'].includes(e.code)) {
        e.preventDefault();
        handleRateCard(3);
      } else if (isFlipped && ['Digit4', 'Numpad4'].includes(e.code)) {
        e.preventDefault();
        handleRateCard(4);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleFlip,
    handleNext,
    handlePrev,
    handleRateCard,
    currentCard,
    isCompleted,
    isFlipped,
    handleShuffle,
    handleStar,
  ]);

  // Auto-play timer with automated pronunciation
  useEffect(() => {
    if (!isAutoPlaying || isCompleted || !currentCard) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    // Step A: Front Face -> Pronounce word and schedule flip
    if (!isFlipped) {
      const textToSpeak = isSwapped ? currentCard.definition : currentCard.word;
      if (soundEnabled) {
        speakWord(
          textToSpeak,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }

      autoPlayTimerRef.current = setTimeout(() => {
        soundFx.playCardFlip(soundEnabled);
        setIsFlipped(true);
      }, 3200);
    } else {
      // Step B: Back Face -> Wait so user can read definition, then advance
      autoPlayTimerRef.current = setTimeout(() => {
        handleNext();
      }, 3500);
    }

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [
    isAutoPlaying,
    isFlipped,
    currentIndex,
    isCompleted,
    currentCard,
    isSwapped,
    soundEnabled,
    handleNext,
  ]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    isSwipingRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 40) {
      isSwipingRef.current = true;
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleCardClick = () => {
    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }
    handleFlip();
  };

  const totalStarred = deck.data.filter((item) => item.isStarred).length;

  // Render Stage Badge Helper
  const renderStageBadge = (card: VocabItem) => {
    const stage = getCardStage(card);
    const intervalText = formatReviewInterval(card);

    let stageColor =
      'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (stage === 'Learning') {
      stageColor =
        'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    } else if (stage === 'Reviewing') {
      stageColor =
        'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    } else if (stage === 'Mastered') {
      stageColor =
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${stageColor}`}
        >
          {stage}
        </span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
          • {intervalText}
        </span>
      </div>
    );
  };

  // Empty state: All caught up in SRS mode!
  if (studyMode === 'srs' && activeDeck.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
        {/* Top Mode Selector */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setStudyMode('all');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Cards ({deck.data.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyMode('srs');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Spaced Repetition ({dueCardsCount})</span>
            </button>
          </div>
        </div>

        {/* All caught up banner */}
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            All Caught Up for Today! 🧠
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-6 leading-relaxed">
            Every card in <strong className="text-slate-800 dark:text-slate-200">{deck.title}</strong> has been scheduled using the SuperMemo SM-2 algorithm. You have 0 pending reviews due right now!
          </p>

          {/* Retention breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg mb-6">
            <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-sky-600 dark:text-sky-400 tracking-wider">
                New
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {stageCounts.New}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Learning
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {stageCounts.Learning}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Reviewing
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {stageCounts.Reviewing}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60 text-center">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Mastered
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {stageCounts.Mastered}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setStudyMode('all');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Layers className="w-4 h-4" />
              Review All {deck.data.length} Cards Anyway
            </button>
            <button
              type="button"
              onClick={onGoToQuiz}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Practice in Quiz Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state: Starred words empty
  if (activeDeck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 my-6 shadow-xs">
        <Star className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Starred Terms Found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
          You have not starred any words in this deck yet. Star terms by clicking the star icon to review them here.
        </p>
        <button
          type="button"
          onClick={() => setIsStarredOnly(false)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors"
        >
          Show All {deck.data.length} Terms
        </button>
      </div>
    );
  }

  // Completion Screen
  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto my-8 p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          {studyMode === 'srs' ? 'Review Session Complete! 🧠' : 'Deck Complete! 🎉'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          You reviewed <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{activeDeck.length}</strong>{' '}
          {studyMode === 'srs' ? 'due terms' : 'terms'} in <em>{deck.title}</em>.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Terms Reviewed
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {activeDeck.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Starred in Deck
            </span>
            <div className="text-2xl font-black text-amber-500 mt-1">{totalStarred}</div>
          </div>
        </div>

        {/* Stage distribution summary */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-center">
            <span className="text-[9px] font-black uppercase text-sky-600">New</span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              {stageCounts.New}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
            <span className="text-[9px] font-black uppercase text-amber-600">Learn</span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              {stageCounts.Learning}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-center">
            <span className="text-[9px] font-black uppercase text-indigo-600">Review</span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              {stageCounts.Reviewing}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <span className="text-[9px] font-black uppercase text-emerald-600">Master</span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
              {stageCounts.Mastered}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Repeat className="w-4 h-4" />
            Review Again
          </button>
          <button
            type="button"
            onClick={onGoToQuiz}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            Practice in Quiz Mode
          </button>
          <button
            type="button"
            onClick={onGoToHistory}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
          >
            <History className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {/* Top Study Mode Toggle & Deck Info */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex-wrap">
        {/* Segmented Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setStudyMode('all');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
              studyMode === 'all'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All ({deck.data.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStudyMode('srs');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
              studyMode === 'srs'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Due Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                dueCardsCount > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {dueCardsCount}
            </span>
          </button>
        </div>

        {/* Action tools: Starred filter, Swap, Auto-play, Shuffle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Starred filter button */}
          <button
            type="button"
            onClick={() => {
              setIsStarredOnly(!isStarredOnly);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            title={isStarredOnly ? 'Show all cards' : 'Show starred cards only'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors border ${
              isStarredOnly
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isStarredOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Starred ({totalStarred})</span>
          </button>

          {/* Swap Front/Back */}
          <button
            type="button"
            onClick={() => {
              setIsSwapped(!isSwapped);
              setIsFlipped(false);
              onShowToast(
                isSwapped ? 'Front: Term, Back: Definition' : 'Front: Definition, Back: Term',
                'info'
              );
            }}
            title="Swap front and back sides"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
              isSwapped
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swap</span>
          </button>

          {/* Auto Play */}
          <button
            type="button"
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              onShowToast(isAutoPlaying ? 'Auto-play paused' : 'Auto-play active', 'info');
            }}
            title="Auto-play through deck"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
              isAutoPlaying
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAutoPlaying ? 'Pause' : 'Auto'}</span>
          </button>

          {/* Shuffle */}
          <button
            type="button"
            onClick={handleShuffle}
            title="Shuffle card order"
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Card {currentIndex + 1} of {activeDeck.length}</span>
          {studyMode === 'srs' && (
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              SRS Mode
            </span>
          )}
        </div>
        <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / activeDeck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 3D Flashcard */}
      <div
        className="card-scene w-full h-80 sm:h-96 cursor-pointer select-none"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`card-inner relative w-full h-full ${isFlipped ? 'flipped' : ''}`}>
          {/* Front Face */}
          <div className="card-face absolute inset-0 w-full h-full rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-7 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50">
            {/* Top Bar on Front */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                  {isSwapped ? 'Definition' : 'Term'}
                </span>
                {currentCard && renderStageBadge(currentCard)}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) =>
                    handleSpeak(e, isSwapped ? currentCard.definition : currentCard.word)
                  }
                  title="Pronounce word"
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Volume2
                    className={`w-5 h-5 ${
                      isSpeaking ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStar(e, currentCard.word)}
                  title={currentCard.isStarred ? 'Unstar term' : 'Star term'}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${
                      currentCard.isStarred ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Middle Word/Content */}
            <div className="my-auto text-center px-4">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                {isSwapped ? currentCard.definition : currentCard.word}
              </h2>
            </div>

            {/* Bottom Hint */}
            <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              Click card or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Space</kbd> to reveal answer
            </div>
          </div>

          {/* Back Face */}
          <div className="card-face card-face-back absolute inset-0 w-full h-full rounded-3xl border bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800 p-7 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50">
            {/* Top Bar on Back */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
                  {isSwapped ? 'Term' : 'Definition'}
                </span>
                {currentCard && renderStageBadge(currentCard)}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) =>
                    handleSpeak(e, isSwapped ? currentCard.word : currentCard.definition)
                  }
                  title="Pronounce text"
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStar(e, currentCard.word)}
                  title={currentCard.isStarred ? 'Unstar term' : 'Star term'}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${
                      currentCard.isStarred ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Middle Content Back */}
            <div className="my-auto text-center px-4 max-w-lg mx-auto overflow-y-auto max-h-[60%] scrollbar-thin">
              {/* Synonyms Pills */}
              {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                    Synonyms:
                  </span>
                  {currentCard.synonyms.map((syn, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-base sm:text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                {isSwapped ? currentCard.word : currentCard.definition}
              </p>
            </div>

            {/* Bottom Hint */}
            <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              Rate your recall below or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">1 - 4</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* SM-2 Spaced Repetition Rating Buttons (Rendered when card is flipped) */}
      {isFlipped ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Again (1) */}
          <button
            type="button"
            onClick={() => handleRateCard(1)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all group"
          >
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm">Again</span>
              <kbd className="px-1 py-0.2 rounded bg-rose-200/70 dark:bg-rose-900/80 font-mono text-[10px]">
                1
              </kbd>
            </div>
            <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 mt-0.5">
              1 day (Reset)
            </span>
          </button>

          {/* Hard (2) */}
          <button
            type="button"
            onClick={() => handleRateCard(2)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all group"
          >
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm">Hard</span>
              <kbd className="px-1 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/80 font-mono text-[10px]">
                2
              </kbd>
            </div>
            <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 mt-0.5">
              +1-2 days
            </span>
          </button>

          {/* Good (3) */}
          <button
            type="button"
            onClick={() => handleRateCard(3)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all group"
          >
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm">Good</span>
              <kbd className="px-1 py-0.2 rounded bg-emerald-200/70 dark:bg-emerald-900/80 font-mono text-[10px]">
                3
              </kbd>
            </div>
            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 mt-0.5">
              +3-5 days
            </span>
          </button>

          {/* Easy (4) */}
          <button
            type="button"
            onClick={() => handleRateCard(4)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all group"
          >
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm">Easy</span>
              <kbd className="px-1 py-0.2 rounded bg-sky-200/70 dark:bg-sky-900/80 font-mono text-[10px]">
                4
              </kbd>
            </div>
            <span className="text-[10px] font-semibold text-sky-500 dark:text-sky-400 mt-0.5">
              +6+ days
            </span>
          </button>
        </div>
      ) : (
        /* Bottom Standard Navigation Buttons */
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 px-3 sm:px-5 rounded-2xl border font-bold text-xs sm:text-sm transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <button
            type="button"
            onClick={handleFlip}
            className="px-4 sm:px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-xs whitespace-nowrap"
          >
            <span className="hidden sm:inline">Reveal Answer</span>
            <span className="sm:hidden">Reveal</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 px-3 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25"
          >
            <span>{currentIndex === activeDeck.length - 1 ? 'Finish' : 'Next'}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Helper Footer */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-semibold pt-1 flex-wrap">
        <span>Space: Flip</span>
        <span>•</span>
        <span>1 - 4: Rate recall</span>
        <span>•</span>
        <span>← / →: Prev / Next</span>
        <span>•</span>
        <span>S: Star</span>
        <span>•</span>
        <span>R: Shuffle</span>
      </div>
    </div>
  );
};
