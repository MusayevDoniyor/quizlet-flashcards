'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  Repeat,
  History,
  ArrowRight,
  Award,
} from 'lucide-react';
import { Deck, QuizQuestion } from '@/types';
import { soundFx } from '@/lib/sounds';
import { speakWord } from '@/lib/speech';
import { fireConfetti } from '@/lib/confetti';

interface QuizTabProps {
  deck: Deck;
  soundEnabled: boolean;
  onRecordHistory: (data: {
    deckId: string;
    deckTitle: string;
    activityType: 'quiz';
    score: string;
    accuracy: number;
  }) => Promise<void>;
  onGoToHistory: () => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'sparkle') => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  deck,
  soundEnabled,
  onRecordHistory,
  onGoToHistory,
  onShowToast,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<{ question: string; correct: string; chosen: string }[]>([]);

  // Generate quiz questions from current deck
  const generateQuiz = useCallback(() => {
    if (!deck.data || deck.data.length < 4) return;

    // Pick 15 questions or all if less than 15
    const pool = [...deck.data].sort(() => Math.random() - 0.5);
    const selectedTerms = pool.slice(0, Math.min(15, pool.length));

    const generated: QuizQuestion[] = selectedTerms.map((item) => {
      // Pick 3 distractors
      const distractors = deck.data
        .filter((d) => d.word !== item.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => d.word);

      const options = [...distractors, item.word].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(item.word);

      return {
        word: item.word,
        definition: item.definition,
        synonyms: item.synonyms || [],
        options,
        correctIndex,
        selectedIndex: null,
      };
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setIsCompleted(false);
    setWrongAnswers([]);
  }, [deck]);

  useEffect(() => {
    generateQuiz();
  }, [generateQuiz]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = useCallback((idx: number) => {
    if (isAnswerSubmitted || !currentQ) return;
    setSelectedOption(idx);
    setIsAnswerSubmitted(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      soundFx.playSuccess(soundEnabled);
    } else {
      soundFx.playError(soundEnabled);
      setWrongAnswers((prev) => [
        ...prev,
        {
          question: currentQ.definition,
          correct: currentQ.word,
          chosen: currentQ.options[idx],
        },
      ]);
    }
  }, [isAnswerSubmitted, currentQ, soundEnabled]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz Finished
      setIsCompleted(true);
      const accuracy = Math.round((score / questions.length) * 100);

      if (accuracy >= 80) {
        soundFx.playVictory(soundEnabled);
        fireConfetti();
        onShowToast(`Great job! Score: ${score}/${questions.length} (${accuracy}%)`, 'sparkle');
      } else {
        onShowToast(`Quiz finished! Score: ${score}/${questions.length} (${accuracy}%)`, 'info');
      }

      onRecordHistory({
        deckId: deck.id,
        deckTitle: deck.title,
        activityType: 'quiz',
        score: `${score}/${questions.length}`,
        accuracy,
      });
    }
  }, [currentIndex, questions.length, score, soundEnabled, onShowToast, onRecordHistory, deck]);

  // Retake Only Missed Questions Handler
  const retakeMissedQuestions = useCallback(() => {
    if (wrongAnswers.length === 0) return;
    const missedWords = wrongAnswers.map((w) => w.correct);
    const missedItems = deck.data.filter((item) => missedWords.includes(item.word));

    const generated: QuizQuestion[] = missedItems.map((item) => {
      const distractors = deck.data
        .filter((d) => d.word !== item.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => d.word);

      const options = [...distractors, item.word].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(item.word);

      return {
        word: item.word,
        definition: item.definition,
        synonyms: item.synonyms || [],
        options,
        correctIndex,
        selectedIndex: null,
      };
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setIsCompleted(false);
    setWrongAnswers([]);
    onShowToast(`Retaking ${missedItems.length} missed question(s)! 💪`, 'info');
  }, [wrongAnswers, deck.data, onShowToast]);

  // Keyboard Shortcuts for Quiz
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isCompleted || !currentQ) return;

      const key = e.key.toUpperCase();
      if (!isAnswerSubmitted) {
        if (key === 'A' || key === '1') handleSelectOption(0);
        else if (key === 'B' || key === '2') handleSelectOption(1);
        else if (key === 'C' || key === '3') handleSelectOption(2);
        else if (key === 'D' || key === '4') handleSelectOption(3);
      } else {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, currentQ, isAnswerSubmitted, handleSelectOption, handleNext]);

  if (!currentQ && !isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 my-6 shadow-xs max-w-xl mx-auto">
        <HelpCircle className="w-12 h-12 text-indigo-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Insufficient Terms for Quiz</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-2">
          This deck has only {deck.data.length} term{deck.data.length === 1 ? '' : 's'}. Quiz mode requires at least 4 terms to generate multiple-choice distractors.
        </p>
      </div>
    );
  }

  // Quiz Completion Screen
  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100);
    const passed = accuracy >= 70;

    return (
      <div className="max-w-xl mx-auto my-6 p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl text-center animate-in zoom-in-95 duration-200">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
            passed
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-amber-500/20'
          }`}
        >
          {passed ? <Award className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          {passed ? 'Quiz Mastered! 🌟' : 'Quiz Completed!'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {passed ? 'Outstanding recall! You clearly know these terms.' : 'Good practice session. Review your missed terms below.'}
        </p>

        {/* Score & Accuracy KPI */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Score
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {score} / {questions.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Accuracy
            </span>
            <div className={`text-2xl font-black mt-1 ${passed ? 'text-emerald-500' : 'text-amber-500'}`}>
              {accuracy}%
            </div>
          </div>
        </div>

        {/* Missed Questions List */}
        {wrongAnswers.length > 0 && (
          <div className="text-left mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Missed Terms to Review ({wrongAnswers.length}):
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {wrongAnswers.map((w, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-xs"
                >
                  <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">&ldquo;{w.question}&rdquo;</p>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Correct: {w.correct}</span>
                    <span className="text-rose-500 dark:text-rose-400 line-through">✗ You: {w.chosen}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {wrongAnswers.length > 0 && (
            <button
              type="button"
              onClick={retakeMissedQuestions}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all animate-pulse"
            >
              <Repeat className="w-4 h-4" />
              Retake {wrongAnswers.length} Missed Question{wrongAnswers.length === 1 ? '' : 's'}
            </button>
          )}
          <button
            type="button"
            onClick={generateQuiz}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Repeat className="w-4 h-4" />
            Retake Full Quiz
          </button>
          <button
            type="button"
            onClick={onGoToHistory}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
          >
            <History className="w-4 h-4" />
            View Results History
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
      {/* Quiz Progress & Stats */}
      <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
            Score: {score}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card (Dark mode styled properly with .quiz-question-box) */}
      <div className="p-6 sm:p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
            Definition & Meaning
          </span>
          <button
            type="button"
            onClick={() => speakWord(currentQ.definition)}
            title="Listen to definition"
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed my-2">
          &ldquo;{currentQ.definition}&rdquo;
        </p>

        {currentQ.synonyms && currentQ.synonyms.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400">
            <span className="font-bold">Synonyms clue:</span>
            {currentQ.synonyms.map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQ.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          let btnClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500';

          if (isAnswerSubmitted) {
            if (idx === currentQ.correctIndex) {
              btnClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20';
            } else if (idx === selectedOption) {
              btnClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20';
            } else {
              btnClass = 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswerSubmitted}
              onClick={() => handleSelectOption(idx)}
              className={`flex items-center gap-3 p-4 rounded-2xl border font-bold text-base transition-all text-left shadow-xs ${btnClass}`}
            >
              <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                {letter}
              </span>
              <span className="truncate flex-1">{option}</span>
              {isAnswerSubmitted && idx === currentQ.correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              {isAnswerSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Next Question Button (visible after submitting) */}
      {isAnswerSubmitted && (
        <div className="flex justify-end mt-2 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
          >
            <span>{currentIndex === questions.length - 1 ? 'View Final Results' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Keyboard Shortcut Hint Footer */}
      <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-semibold pt-1">
        Keys: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">A, B, C, D</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">1, 2, 3, 4</kbd> to answer • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Enter / Space</kbd> to advance
      </div>
    </div>
  );
};
