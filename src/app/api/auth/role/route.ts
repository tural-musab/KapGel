import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Rol seçimi endpointi devre dışı bırakıldı.' }, { status: 410 });
}
