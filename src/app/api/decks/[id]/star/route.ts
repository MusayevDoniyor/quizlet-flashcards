import { NextRequest, NextResponse } from 'next/server';
import { toggleStarredWord, getStarredWords } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const starred = await getStarredWords(id);
    return NextResponse.json({ success: true, starred });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { word } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid word string is required' },
        { status: 400 }
      );
    }

    const result = await toggleStarredWord(id, word.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
