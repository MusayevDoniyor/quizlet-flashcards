import { NextRequest, NextResponse } from 'next/server';
import { recordSrsReview } from '@/lib/db';
import { SrsRating } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deckId, word, rating } = body;

    if (!deckId || !word || ![1, 2, 3, 4].includes(Number(rating))) {
      return NextResponse.json(
        { success: false, error: 'deckId, word, and valid rating (1, 2, 3, 4) are required' },
        { status: 400 }
      );
    }

    const result = await recordSrsReview(deckId, word, Number(rating) as SrsRating);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
