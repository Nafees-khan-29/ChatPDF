import { NextResponse } from 'next/server';

// Deprecated legacy route; kept as stub to avoid accidental usage.
export async function POST() {
  return NextResponse.json(
    { error: 'This legacy endpoint has been removed. Use /api/chat instead.' },
    { status: 410 }
  );
}
