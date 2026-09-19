import { NextRequest, NextResponse } from 'next/server';
import { getDeckById, deleteDeck, getStarredWords } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deck = await getDeckById(id);

    if (!deck) {
      return NextResponse.json({ success: false, error: 'Deck not found' }, { status: 404 });
    }

    const starred = await getStarredWords(deck.id);
    const enrichedData = deck.data.map((item) => ({
      ...item,
      isStarred: starred.includes(item.word),
    }));

    return NextResponse.json({
      success: true,
      deck: { ...deck, termsCount: enrichedData.length, data: enrichedData },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deck = await getDeckById(id);

    if (!deck) {
      return NextResponse.json({ success: false, error: 'Deck not found' }, { status: 404 });
    }

    if (deck.isPreset) {
      return NextResponse.json(
        { success: false, error: 'Preset decks cannot be deleted' },
        { status: 403 }
      );
    }

    await deleteDeck(id);
    return NextResponse.json({ success: true, message: `Deck ${id} deleted successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
