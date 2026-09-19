import { VocabItem, SrsRating } from '@/types';

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * @param card Current vocabulary item state
 * @param rating User rating (1: Again, 2: Hard, 3: Good, 4: Easy)
 */
export function calculateSm2(
  card: VocabItem,
  rating: SrsRating
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string;
} {
  let easeFactor = card.easeFactor ?? 2.5;
  let repetitions = card.repetitions ?? 0;
  let intervalDays = card.intervalDays ?? 0;

  if (rating === 1) {
    // Again (Forgot / Mistake) - reset sequence
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 2) {
    // Hard (Remembered with difficulty)
    repetitions += 1;
    intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 3) {
    // Good (Normal recall)
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
  } else if (rating === 4) {
    // Easy (Instant, effortless recall)
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 2;
    } else if (repetitions === 2) {
      intervalDays = 5;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * 1.3));
    }
    easeFactor = parseFloat((easeFactor + 0.15).toFixed(2));
  }

  const nextDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    nextReviewAt: nextDate.toISOString(),
    lastReviewedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a card is currently due for review
 */
export function isCardDue(card: VocabItem): boolean {
  if (!card.nextReviewAt) return true; // Brand new card is immediately due
  return new Date(card.nextReviewAt) <= new Date();
}

/**
 * Categorizes a card's mastery stage
 */
export function getCardStage(card: VocabItem): 'New' | 'Learning' | 'Reviewing' | 'Mastered' {
  const reps = card.repetitions ?? 0;
  const interval = card.intervalDays ?? 0;
  if (reps === 0 && interval === 0) return 'New';
  if (reps < 2) return 'Learning';
  if (interval < 14) return 'Reviewing';
  return 'Mastered';
}

/**
 * Formats relative due time or interval for display (e.g. "Tomorrow", "In 3 days", "Due now")
 */
export function formatReviewInterval(card: VocabItem): string {
  if (!card.nextReviewAt) return 'Due now';
  const diffHours = (new Date(card.nextReviewAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 0) return 'Due now';
  if (diffHours <= 24) return 'Tomorrow';
  const days = Math.ceil(diffHours / 24);
  return `In ${days} days`;
}
