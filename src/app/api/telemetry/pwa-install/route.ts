import { NextResponse } from 'next/server';

import logger from 'lib/logger';

type TelemetryPayload = {
  event: 'accepted' | 'dismissed';
  platform?: string;
  timestamp?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as TelemetryPayload | null;

  if (!payload || (payload.event !== 'accepted' && payload.event !== 'dismissed')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  logger.info('PWA install telemetry', {
    event: payload.event,
    platform: payload.platform ?? 'unknown',
    timestamp: payload.timestamp ?? Date.now(),
  });

  return NextResponse.json({ ok: true });
}
