export type SrsRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface VocabItem {
  id?: string;
  word: string;
  definition: string;
  synonyms: string[];
  example?: string;
  isStarred?: boolean;
  // Spaced Repetition (SM-2) fields
  easeFactor?: number;
  intervalDays?: number;
  repetitions?: number;
  nextReviewAt?: string;
  lastReviewedAt?: string;
}

export interface Deck {
  id: string;
  title: string;
  subtitle: string;
  isPreset: boolean;
  termsCount: number;
  data: VocabItem[];
  createdAt?: string;
}

export interface HistoryItem {
  id: string;
  deckId: string;
  deckTitle: string;
  activityType: 'flashcards' | 'quiz' | 'match';
  score: string;
  accuracy: number;
  timeSpentSec?: number;
  date: string;
}

export interface DbStatusResponse {
  connected: boolean;
  provider: 'neon' | 'local';
  message: string;
  tablesReady: boolean;
  neonHost?: string;
  timestamp: string;
}

export interface QuizQuestion {
  word: string;
  definition: string;
  synonyms: string[];
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
}

export interface MatchTile {
  id: string;
  text: string;
  type: 'word' | 'def';
  pairId: string;
  isMatched: boolean;
  isSelected: boolean;
  isWrong: boolean;
}
