import { NextRequest, NextResponse } from 'next/server';
import { getHistory, addHistory, clearHistory } from '@/lib/db';

export async function GET() {
  try {
    const history = await getHistory();
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deckId, deckTitle, activityType, score, accuracy, timeSpentSec } = body;

    if (!deckId || !activityType || score === undefined) {
      return NextResponse.json(
        { success: false, error: 'deckId, activityType, and score are required' },
        { status: 400 }
      );
    }

    const created = await addHistory({
      deckId,
      deckTitle: deckTitle || 'Vocabulary Deck',
      activityType,
      score: String(score),
      accuracy: Number(accuracy) || 0,
      timeSpentSec: timeSpentSec ? Number(timeSpentSec) : undefined,
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearHistory();
    return NextResponse.json({ success: true, message: 'Activity history cleared' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
