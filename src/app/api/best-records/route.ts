import { NextRequest, NextResponse } from 'next/server';
import { getBestRecords, saveBestRecord } from '@/lib/db';

export async function GET() {
  try {
    const records = await getBestRecords();
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deckId, seconds } = body;

    if (!deckId || typeof seconds !== 'number' || seconds <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid deckId and positive seconds are required' },
        { status: 400 }
      );
    }

    await saveBestRecord(deckId, seconds);
    const updated = await getBestRecords();
    return NextResponse.json({ success: true, bestSeconds: updated[deckId] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
