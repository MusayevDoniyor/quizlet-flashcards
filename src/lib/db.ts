import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { PRESET_DECKS } from '@/data/presets';
import { Deck, HistoryItem, VocabItem, SrsRating } from '@/types';
import { calculateSm2, isCardDue } from '@/lib/srs';

// In-memory fallback stores (used when DATABASE_URL is not provided or offline)
let memoryCustomDecks: Deck[] = [];
const memoryStarred: Record<string, string[]> = {};
let memoryHistory: HistoryItem[] = [];
const memoryBestRecords: Record<string, number> = {};
const memorySrs: Record<string, Record<string, Partial<VocabItem>>> = {};

let schemaInitialized = false;

function getSql(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '' || url.includes('placeholder')) {
    return null;
  }
  try {
    return neon(url);
  } catch (err) {
    console.warn('[DB] Failed to initialize Neon client:', err);
    return null;
  }
}

export async function initDbSchema(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (schemaInitialized) return true;

  try {
    // 1. Custom Decks
    await sql`
      CREATE TABLE IF NOT EXISTS custom_decks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        is_preset BOOLEAN DEFAULT FALSE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Normalized Cards table with Spaced Repetition (SM-2) fields
    await sql`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        word TEXT NOT NULL,
        definition TEXT NOT NULL,
        synonyms JSONB DEFAULT '[]'::jsonb,
        example TEXT,
        ease_factor NUMERIC DEFAULT 2.5,
        interval_days INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        next_review_at TIMESTAMPTZ DEFAULT NOW(),
        last_reviewed_at TIMESTAMPTZ,
        is_starred BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Starred words lookup table
    await sql`
      CREATE TABLE IF NOT EXISTS starred_words (
        deck_id TEXT NOT NULL,
        word TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (deck_id, word)
      );
    `;

    // 4. Activity History
    await sql`
      CREATE TABLE IF NOT EXISTS activity_history (
        id TEXT PRIMARY KEY,
        deck_id TEXT,
        deck_title TEXT,
        activity_type TEXT NOT NULL,
        score TEXT NOT NULL,
        accuracy NUMERIC,
        time_spent_sec INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 5. Fastest match records
    await sql`
      CREATE TABLE IF NOT EXISTS best_records (
        deck_id TEXT PRIMARY KEY,
        seconds NUMERIC NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create performance indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_created ON activity_history(created_at DESC);`;

    schemaInitialized = true;
    console.log('[DB] Neon PostgreSQL schema with normalized cards verified successfully.');
    return true;
  } catch (error) {
    console.error('[DB] Error initializing Neon schema:', error);
    return false;
  }
}

export async function checkDbStatus() {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    return {
      connected: false,
      provider: 'local' as const,
      message: 'No DATABASE_URL configured. Running in Local Memory / Storage mode.',
      tablesReady: false,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const sql = getSql();
    if (!sql) throw new Error('Database client unavailable');
    await initDbSchema();
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name`;
    const hostMatch = url.match(/@([^/:]+)/);
    const host = hostMatch ? hostMatch[1] : 'neon.tech';

    return {
      connected: true,
      provider: 'neon' as const,
      message: `Connected to Neon PostgreSQL (${result[0]?.db_name || 'database'})`,
      tablesReady: true,
      neonHost: host,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      connected: false,
      provider: 'local' as const,
      message: `Failed to connect to Neon PostgreSQL: ${error.message || 'Connection timeout'}`,
      tablesReady: false,
      timestamp: new Date().toISOString(),
    };
  }
}

// ----------------- DECKS & CARDS -----------------
export async function getAllDecks(): Promise<Deck[]> {
  const sql = getSql();
  let customDecks: Deck[] = [];
  const srsMap: Record<string, Record<string, any>> = {};

  if (sql) {
    try {
      await initDbSchema();
      // Fetch custom decks
      const rows = await sql`
        SELECT id, title, subtitle, is_preset as "isPreset", data, created_at
        FROM custom_decks
        ORDER BY created_at DESC
      `;
      customDecks = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle || `${r.data?.length || 0} terms`,
        isPreset: false,
        termsCount: r.data?.length || 0,
        data: r.data || [],
        createdAt: r.created_at,
      }));

      // Fetch SRS state from cards table
      const cardRows = await sql`
        SELECT deck_id, word, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, example, is_starred
        FROM cards
      `;
      cardRows.forEach((c: any) => {
        if (!srsMap[c.deck_id]) srsMap[c.deck_id] = {};
        srsMap[c.deck_id][c.word.toLowerCase()] = {
          easeFactor: Number(c.ease_factor),
          intervalDays: Number(c.interval_days),
          repetitions: Number(c.repetitions),
          nextReviewAt: c.next_review_at ? new Date(c.next_review_at).toISOString() : undefined,
          lastReviewedAt: c.last_reviewed_at ? new Date(c.last_reviewed_at).toISOString() : undefined,
          example: c.example || undefined,
          isStarred: Boolean(c.is_starred),
        };
      });
    } catch (err) {
      console.warn('[DB] Could not fetch decks from Neon, using memory:', err);
      customDecks = memoryCustomDecks;
    }
  } else {
    customDecks = memoryCustomDecks;
  }

  // Combine Presets + Custom decks, enriching each card with its SRS state
  const allDecks = [...PRESET_DECKS, ...customDecks].map((deck) => {
    const deckSrs = sql ? (srsMap[deck.id] || {}) : (memorySrs[deck.id] || {});
    const enrichedCards = deck.data.map((card) => {
      const srs = deckSrs[card.word.toLowerCase()];
      return {
        ...card,
        ...(srs || {}),
        easeFactor: srs?.easeFactor ?? card.easeFactor ?? 2.5,
        intervalDays: srs?.intervalDays ?? card.intervalDays ?? 0,
        repetitions: srs?.repetitions ?? card.repetitions ?? 0,
        nextReviewAt: srs?.nextReviewAt ?? card.nextReviewAt,
        example: srs?.example ?? card.example,
      };
    });

    return {
      ...deck,
      termsCount: enrichedCards.length,
      data: enrichedCards,
    };
  });

  return allDecks;
}

export async function getDeckById(deckId: string): Promise<Deck | null> {
  const all = await getAllDecks();
  return all.find((d) => d.id === deckId) || null;
}

export async function createDeck(deck: {
  title: string;
  subtitle?: string;
  data: any[];
}): Promise<Deck> {
  const newDeckId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const normalizedCards: VocabItem[] = deck.data.map((item) => ({
    id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    word: item.word,
    definition: item.definition,
    synonyms: item.synonyms || [],
    example: item.example,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    isStarred: false,
  }));

  const newDeck: Deck = {
    id: newDeckId,
    title: deck.title,
    subtitle: deck.subtitle || `${normalizedCards.length} terms & definitions`,
    isPreset: false,
    termsCount: normalizedCards.length,
    data: normalizedCards,
    createdAt: new Date().toISOString(),
  };

  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      await sql`
        INSERT INTO custom_decks (id, title, subtitle, is_preset, data)
        VALUES (${newDeck.id}, ${newDeck.title}, ${newDeck.subtitle}, false, ${JSON.stringify(newDeck.data)})
      `;

      // Also insert into normalized cards table
      for (const card of normalizedCards) {
        await sql`
          INSERT INTO cards (id, deck_id, word, definition, synonyms, example, ease_factor, interval_days, repetitions)
          VALUES (${card.id}, ${newDeck.id}, ${card.word}, ${card.definition}, ${JSON.stringify(card.synonyms)}, ${card.example || null}, 2.5, 0, 0)
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    } catch (err) {
      console.warn('[DB] Failed to save deck to Neon, storing in memory:', err);
      memoryCustomDecks.unshift(newDeck);
    }
  } else {
    memoryCustomDecks.unshift(newDeck);
  }

  return newDeck;
}

export async function deleteDeck(deckId: string): Promise<boolean> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      await sql`DELETE FROM custom_decks WHERE id = ${deckId}`;
      await sql`DELETE FROM cards WHERE deck_id = ${deckId}`;
      await sql`DELETE FROM starred_words WHERE deck_id = ${deckId}`;
      return true;
    } catch (err) {
      console.warn('[DB] Failed to delete deck from Neon:', err);
    }
  }
  memoryCustomDecks = memoryCustomDecks.filter((d) => d.id !== deckId);
  delete memoryStarred[deckId];
  delete memorySrs[deckId];
  return true;
}

// ----------------- SPACED REPETITION (SM-2) -----------------
export async function recordSrsReview(
  deckId: string,
  word: string,
  rating: SrsRating
): Promise<{ card: VocabItem; dueCount: number }> {
  const allDecks = await getAllDecks();
  const deck = allDecks.find((d) => d.id === deckId);
  if (!deck) throw new Error(`Deck ${deckId} not found`);

  const card = deck.data.find((c) => c.word.toLowerCase() === word.toLowerCase());
  if (!card) throw new Error(`Word "${word}" not found in deck`);

  const sm2Result = calculateSm2(card, rating);
  const updatedCard: VocabItem = {
    ...card,
    ...sm2Result,
  };

  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      const cardId = card.id || `${deckId}-${encodeURIComponent(word)}`;
      await sql`
        INSERT INTO cards (id, deck_id, word, definition, synonyms, example, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, is_starred)
        VALUES (
          ${cardId},
          ${deckId},
          ${card.word},
          ${card.definition},
          ${JSON.stringify(card.synonyms || [])},
          ${card.example || null},
          ${sm2Result.easeFactor},
          ${sm2Result.intervalDays},
          ${sm2Result.repetitions},
          ${sm2Result.nextReviewAt},
          ${sm2Result.lastReviewedAt},
          ${Boolean(card.isStarred)}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          ease_factor = EXCLUDED.ease_factor,
          interval_days = EXCLUDED.interval_days,
          repetitions = EXCLUDED.repetitions,
          next_review_at = EXCLUDED.next_review_at,
          last_reviewed_at = EXCLUDED.last_reviewed_at;
      `;
    } catch (err) {
      console.warn('[DB] Failed to record SRS review in Neon, using memory:', err);
    }
  }

  // Update in-memory cache
  if (!memorySrs[deckId]) memorySrs[deckId] = {};
  memorySrs[deckId][word.toLowerCase()] = sm2Result;

  // Calculate remaining due cards
  const updatedDeckCards = deck.data.map((c) =>
    c.word.toLowerCase() === word.toLowerCase() ? updatedCard : c
  );
  const dueCount = updatedDeckCards.filter((c) => isCardDue(c)).length;

  return { card: updatedCard, dueCount };
}

// ----------------- STARRED WORDS -----------------
export async function getStarredWords(deckId: string): Promise<string[]> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      const rows = await sql`
        SELECT word FROM starred_words WHERE deck_id = ${deckId}
      `;
      return rows.map((r: any) => r.word);
    } catch (err) {
      console.warn('[DB] Failed to get starred words from Neon:', err);
    }
  }
  return memoryStarred[deckId] || [];
}

export async function toggleStarredWord(deckId: string, word: string): Promise<{ isStarred: boolean; starredList: string[] }> {
  const sql = getSql();
  let starredList: string[] = [];
  let isStarred = false;

  if (sql) {
    try {
      await initDbSchema();
      const existing = await sql`
        SELECT word FROM starred_words WHERE deck_id = ${deckId} AND word = ${word}
      `;
      if (existing.length > 0) {
        await sql`DELETE FROM starred_words WHERE deck_id = ${deckId} AND word = ${word}`;
        await sql`UPDATE cards SET is_starred = false WHERE deck_id = ${deckId} AND word = ${word}`;
        isStarred = false;
      } else {
        await sql`INSERT INTO starred_words (deck_id, word) VALUES (${deckId}, ${word})`;
        await sql`UPDATE cards SET is_starred = true WHERE deck_id = ${deckId} AND word = ${word}`;
        isStarred = true;
      }
      const updated = await sql`SELECT word FROM starred_words WHERE deck_id = ${deckId}`;
      starredList = updated.map((r: any) => r.word);
      return { isStarred, starredList };
    } catch (err) {
      console.warn('[DB] Failed to toggle star in Neon, falling back to memory:', err);
    }
  }

  if (!memoryStarred[deckId]) memoryStarred[deckId] = [];
  const idx = memoryStarred[deckId].indexOf(word);
  if (idx > -1) {
    memoryStarred[deckId].splice(idx, 1);
    isStarred = false;
  } else {
    memoryStarred[deckId].push(word);
    isStarred = true;
  }
  return { isStarred, starredList: [...memoryStarred[deckId]] };
}

// ----------------- ACTIVITY HISTORY -----------------
export async function getHistory(): Promise<HistoryItem[]> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      const rows = await sql`
        SELECT id, deck_id as "deckId", deck_title as "deckTitle",
               activity_type as "activityType", score, accuracy,
               time_spent_sec as "timeSpentSec", created_at as "date"
        FROM activity_history
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return rows.map((r: any) => ({
        id: r.id,
        deckId: r.deckId,
        deckTitle: r.deckTitle,
        activityType: r.activityType,
        score: r.score,
        accuracy: Number(r.accuracy) || 0,
        timeSpentSec: r.timeSpentSec ? Number(r.timeSpentSec) : undefined,
        date: new Date(r.date).toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] Failed to get history from Neon:', err);
    }
  }
  return [...memoryHistory];
}

export async function addHistory(item: Omit<HistoryItem, 'id' | 'date'>): Promise<HistoryItem> {
  const newItem: HistoryItem = {
    ...item,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString(),
  };

  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      await sql`
        INSERT INTO activity_history (id, deck_id, deck_title, activity_type, score, accuracy, time_spent_sec, created_at)
        VALUES (${newItem.id}, ${newItem.deckId}, ${newItem.deckTitle}, ${newItem.activityType},
                ${newItem.score}, ${newItem.accuracy}, ${newItem.timeSpentSec || null}, NOW())
      `;
    } catch (err) {
      console.warn('[DB] Failed to save history to Neon, storing in memory:', err);
      memoryHistory.unshift(newItem);
    }
  } else {
    memoryHistory.unshift(newItem);
  }

  return newItem;
}

export async function clearHistory(): Promise<boolean> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      await sql`DELETE FROM activity_history`;
    } catch (err) {
      console.warn('[DB] Failed to clear history from Neon:', err);
    }
  }
  memoryHistory = [];
  return true;
}

// ----------------- BEST RECORDS -----------------
export async function getBestRecords(): Promise<Record<string, number>> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      const rows = await sql`SELECT deck_id, seconds FROM best_records`;
      const recs: Record<string, number> = {};
      rows.forEach((r: any) => {
        recs[r.deck_id] = Number(r.seconds);
      });
      return recs;
    } catch (err) {
      console.warn('[DB] Failed to get best records from Neon:', err);
    }
  }
  return { ...memoryBestRecords };
}

export async function saveBestRecord(deckId: string, seconds: number): Promise<boolean> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      await sql`
        INSERT INTO best_records (deck_id, seconds, updated_at)
        VALUES (${deckId}, ${seconds}, NOW())
        ON CONFLICT (deck_id)
        DO UPDATE SET seconds = EXCLUDED.seconds, updated_at = NOW()
        WHERE EXCLUDED.seconds < best_records.seconds;
      `;
      return true;
    } catch (err) {
      console.warn('[DB] Failed to save best record to Neon:', err);
    }
  }

  if (!memoryBestRecords[deckId] || seconds < memoryBestRecords[deckId]) {
    memoryBestRecords[deckId] = seconds;
  }
  return true;
}
