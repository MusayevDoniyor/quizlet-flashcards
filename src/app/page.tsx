'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { NavTabs, TabType } from '@/components/NavTabs';
import { FlashcardTab } from '@/components/Flashcards/FlashcardTab';
import { QuizTab } from '@/components/Quiz/QuizTab';
import { MatchTab } from '@/components/Match/MatchTab';
import { DictionaryTab } from '@/components/Dictionary/DictionaryTab';
import { HistoryTab } from '@/components/History/HistoryTab';
import { AddSetModal } from '@/components/AddSetModal';
import { DbStatusModal } from '@/components/DbStatusModal';
import { Toast, ToastMessage } from '@/components/Toast';
import { PRESET_DECKS } from '@/data/presets';
import { Deck, HistoryItem, DbStatusResponse, SrsRating } from '@/types';
import { isCardDue, calculateSm2 } from '@/lib/srs';

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>(PRESET_DECKS);
  const [currentDeckId, setCurrentDeckId] = useState<string>('preset-thinking-change');
  const [activeTab, setActiveTab] = useState<TabType>('flashcards');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bestRecords, setBestRecords] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper
  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' | 'sparkle' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize theme from localStorage / system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('quizlet_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedSound = localStorage.getItem('quizlet_sound_fx');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }

    const savedDeckId = localStorage.getItem('quizlet_current_deck');
    if (savedDeckId) {
      setCurrentDeckId(savedDeckId);
    }

    // Hydrate preset decks with local storage stars and SRS
    setDecks((prev) =>
      prev.map((d) => {
        let localStarred: string[] = [];
        let localSrs: Record<string, any> = {};
        try {
          const raw = localStorage.getItem(`quizlet_starred_${d.id}`);
          if (raw) localStarred = JSON.parse(raw);
          const rawSrs = localStorage.getItem(`quizlet_srs_${d.id}`);
          if (rawSrs) localSrs = JSON.parse(rawSrs);
        } catch {}
        const data = d.data.map((item) => {
          const srs = localSrs[item.word.toLowerCase()];
          return {
            ...item,
            ...(srs || {}),
            isStarred: Boolean(item.isStarred || localStarred.includes(item.word)),
          };
        });
        return { ...d, data };
      })
    );
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('quizlet_theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
      showToast('Dark mode enabled 🌙', 'info');
    } else {
      document.documentElement.classList.remove('dark');
      showToast('Light mode enabled ☀️', 'info');
    }
  };

  // Sound toggle
  const toggleSound = () => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    localStorage.setItem('quizlet_sound_fx', String(nextSound));
    showToast(nextSound ? 'Sound effects enabled 🔊' : 'Sound effects muted 🔇', 'info');
  };

  // Fetch DB Status
  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch DB status:', err);
    }
  }, []);

  // Fetch Decks
  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch('/api/decks');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.decks) && json.decks.length > 0) {
          const enriched = json.decks.map((d: Deck) => {
            let localStarred: string[] = [];
            let localSrs: Record<string, any> = {};
            try {
              const raw = localStorage.getItem(`quizlet_starred_${d.id}`);
              if (raw) localStarred = JSON.parse(raw);
              const rawSrs = localStorage.getItem(`quizlet_srs_${d.id}`);
              if (rawSrs) localSrs = JSON.parse(rawSrs);
            } catch {}
            const data = d.data.map((item) => {
              const srs = localSrs[item.word.toLowerCase()];
              return {
                ...item,
                ...(srs || {}),
                isStarred: Boolean(item.isStarred || localStarred.includes(item.word)),
              };
            });
            return { ...d, data };
          });
          setDecks(enriched);
          // Check if current deck still exists
          if (!json.decks.some((d: Deck) => d.id === currentDeckId)) {
            setCurrentDeckId(json.decks[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch decks from API, using presets:', err);
    }
  }, [currentDeckId]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.history)) {
          if (json.history.length > 0) {
            setHistory(json.history);
            try {
              localStorage.setItem('quizlet_activity_history', JSON.stringify(json.history));
            } catch {}
          } else {
            try {
              const localRaw = localStorage.getItem('quizlet_activity_history');
              if (localRaw) setHistory(JSON.parse(localRaw));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch history from API:', err);
      try {
        const localRaw = localStorage.getItem('quizlet_activity_history');
        if (localRaw) setHistory(JSON.parse(localRaw));
      } catch {}
    }
  }, []);

  // Fetch Best Records
  const fetchBestRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/best-records');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.records) {
          setBestRecords(json.records);
        }
      }
    } catch (err) {
      console.warn('Could not fetch best records:', err);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchDbStatus();
    fetchDecks();
    fetchHistory();
    fetchBestRecords();
  }, [fetchDbStatus, fetchDecks, fetchHistory, fetchBestRecords]);

  // Handle deck switch
  const handleSelectDeck = (id: string) => {
    setCurrentDeckId(id);
    localStorage.setItem('quizlet_current_deck', id);
    const selected = decks.find((d) => d.id === id);
    if (selected) {
      showToast(`Deck "${selected.title}" loaded!`, 'info');
    }
  };

  // Add new deck
  const handleAddDeck = async (title: string, data: any[]) => {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, data }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save deck');
    }

    showToast(`New deck "${json.deck.title}" created! 🎉`, 'sparkle');
    await fetchDecks();
    setCurrentDeckId(json.deck.id);
    localStorage.setItem('quizlet_current_deck', json.deck.id);
  };

  // Delete deck
  const handleDeleteDeck = async (id: string) => {
    const target = decks.find((d) => d.id === id);
    if (!target) return;

    if (window.confirm(`Are you sure you want to delete the deck "${target.title}"?`)) {
      try {
        const res = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          showToast(`Deck "${target.title}" deleted`, 'info');
          await fetchDecks();
          setCurrentDeckId('preset-thinking-change');
          localStorage.setItem('quizlet_current_deck', 'preset-thinking-change');
        } else {
          showToast(json.error || 'Failed to delete deck', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error deleting deck', 'error');
      }
    }
  };

  // Toggle star on a word in current deck
  const handleToggleStar = async (word: string) => {
    // Optimistic UI update
    setDecks((prevDecks) =>
      prevDecks.map((d) => {
        if (d.id !== currentDeckId) return d;
        const updatedData = d.data.map((item) =>
          item.word === word ? { ...item, isStarred: !item.isStarred } : item
        );
        return { ...d, data: updatedData };
      })
    );

    // Mirror to localStorage for offline fallback
    try {
      const localKey = `quizlet_starred_${currentDeckId}`;
      const raw = localStorage.getItem(localKey);
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (list.includes(word)) {
        list = list.filter((w) => w !== word);
      } else {
        list.push(word);
      }
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch {}

    try {
      const res = await fetch(`/api/decks/${currentDeckId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.isStarred ? `Starred "${word}" ⭐` : `Removed star from "${word}"`,
          'info'
        );
      }
    } catch (err) {
      console.warn('Error saving starred word to DB:', err);
    }
  };

  // Record history
  const handleRecordHistory = async (record: {
    deckId: string;
    deckTitle: string;
    activityType: 'flashcards' | 'quiz' | 'match';
    score: string;
    accuracy: number;
    timeSpentSec?: number;
  }) => {
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.item) {
          setHistory((prev) => [json.item, ...prev]);
        }
      }
    } catch (err) {
      console.warn('Error recording history:', err);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]);
        showToast('Activity history cleared 🗑️', 'info');
      }
    } catch (err) {
      console.warn('Error clearing history:', err);
    }
  };

  // Save best match record
  const handleSaveBestRecord = async (deckId: string, seconds: number) => {
    try {
      const res = await fetch('/api/best-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, seconds }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBestRecords((prev) => ({ ...prev, [deckId]: seconds }));
        }
      }
    } catch (err) {
      console.warn('Error saving best record:', err);
    }
  };

  // SuperMemo SM-2 Spaced Repetition Review Handler
  const handleSrsReview = async (word: string, rating: SrsRating) => {
    // 1. Optimistically update local decks state
    setDecks((prevDecks) =>
      prevDecks.map((d) => {
        if (d.id !== currentDeckId) return d;
        return {
          ...d,
          data: d.data.map((c) => {
            if (c.word.toLowerCase() === word.toLowerCase()) {
              const sm2 = calculateSm2(c, rating);
              return { ...c, ...sm2 };
            }
            return c;
          }),
        };
      })
    );

    // 2. Offline-first localStorage cache
    try {
      const localSrsKey = `quizlet_srs_${currentDeckId}`;
      const raw = localStorage.getItem(localSrsKey);
      const existing = raw ? JSON.parse(raw) : {};
      const targetCard = currentDeck.data.find(
        (c) => c.word.toLowerCase() === word.toLowerCase()
      );
      if (targetCard) {
        existing[word.toLowerCase()] = calculateSm2(targetCard, rating);
        localStorage.setItem(localSrsKey, JSON.stringify(existing));
      }
    } catch (err) {
      console.warn('Failed to cache SRS review in localStorage:', err);
    }

    // 3. Sync to Neon DB / API backend
    try {
      await fetch('/api/srs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: currentDeckId,
          word,
          rating,
        }),
      });
    } catch (err) {
      console.warn('Error syncing SRS review to API:', err);
    }
  };

  const currentDeck = decks.find((d) => d.id === currentDeckId) || decks[0] || PRESET_DECKS[0];

  const dueCardsCount = useMemo(() => {
    return currentDeck.data.filter((c) => isCardDue(c)).length;
  }, [currentDeck]);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200 bg-slate-50 dark:bg-[#0b0f19]">
      {/* Header */}
      <Header
        decks={decks}
        currentDeckId={currentDeck.id}
        onSelectDeck={handleSelectDeck}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onDeleteDeck={handleDeleteDeck}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        isDark={isDark}
        onToggleDark={toggleTheme}
        dbStatus={dbStatus}
        onOpenDbModal={() => setIsDbModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <NavTabs activeTab={activeTab} onChangeTab={setActiveTab} dueCount={dueCardsCount} />

        {/* Tab Views */}
        <div className="flex-1 w-full">
          {activeTab === 'flashcards' && (
            <FlashcardTab
              deck={currentDeck}
              soundEnabled={soundEnabled}
              onToggleStar={handleToggleStar}
              onReviewCard={handleSrsReview}
              onRecordHistory={handleRecordHistory}
              onGoToQuiz={() => setActiveTab('quiz')}
              onGoToHistory={() => setActiveTab('history')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizTab
              deck={currentDeck}
              soundEnabled={soundEnabled}
              onRecordHistory={handleRecordHistory}
              onGoToHistory={() => setActiveTab('history')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'match' && (
            <MatchTab
              deck={currentDeck}
              soundEnabled={soundEnabled}
              bestRecords={bestRecords}
              onRecordHistory={handleRecordHistory}
              onSaveBestRecord={handleSaveBestRecord}
              onGoToHistory={() => setActiveTab('history')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'dictionary' && (
            <DictionaryTab
              deck={currentDeck}
              soundEnabled={soundEnabled}
              onToggleStar={handleToggleStar}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              history={history}
              onClearHistory={handleClearHistory}
              bestRecords={bestRecords}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <AddSetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDeck={handleAddDeck}
      />

      <DbStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        dbStatus={dbStatus}
        onRefreshStatus={fetchDbStatus}
      />

      {/* Floating Toast Notification */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
