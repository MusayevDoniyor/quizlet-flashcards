import { NextResponse } from 'next/server';
import { checkDbStatus } from '@/lib/db';

export async function GET() {
  try {
    const status = await checkDbStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        provider: 'local',
        message: error.message || 'Database status check failed',
        tablesReady: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
