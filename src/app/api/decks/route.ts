import { NextRequest, NextResponse } from 'next/server';
import { getAllDecks, createDeck, getStarredWords } from '@/lib/db';

export async function GET() {
  try {
    const decks = await getAllDecks();
    // Attach starred words for each deck
    const enrichedDecks = await Promise.all(
      decks.map(async (d) => {
        const starred = await getStarredWords(d.id);
        const data = d.data.map((item) => ({
          ...item,
          isStarred: starred.includes(item.word),
        }));
        return {
          ...d,
          termsCount: data.length,
          data,
        };
      })
    );

    return NextResponse.json({ success: true, decks: enrichedDecks });
  } catch (error: any) {
    console.error('Failed to fetch decks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, subtitle, data } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Deck title is required' }, { status: 400 });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vocabulary data array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Normalize vocabulary items
    const normalizedData = data
      .filter((item) => item && (item.word || item.term))
      .map((item) => {
        const word = (item.word || item.term || '').trim();
        const definition = (item.definition || item.def || item.meaning || '').trim();
        let synonyms: string[] = [];

        if (Array.isArray(item.synonyms)) {
          synonyms = item.synonyms.map((s: any) => String(s).trim()).filter(Boolean);
        } else if (typeof item.synonyms === 'string') {
          synonyms = item.synonyms.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof item.synonym === 'string') {
          synonyms = item.synonym.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        return {
          word,
          definition: definition || 'No definition provided',
          synonyms,
          isStarred: false,
        };
      });

    if (normalizedData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid vocabulary items found with words and definitions' },
        { status: 400 }
      );
    }

    const created = await createDeck({
      title: title.trim(),
      subtitle: subtitle?.trim() || `${normalizedData.length} terms & definitions`,
      data: normalizedData,
    });

    return NextResponse.json({ success: true, deck: created });
  } catch (error: any) {
    console.error('Failed to create deck:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
