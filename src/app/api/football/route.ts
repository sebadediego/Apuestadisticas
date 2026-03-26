// src/app/api/football/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // Build params excluding 'endpoint'
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') params.append(key, value);
  });

  const url = `https://${API_HOST}${endpoint}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY,
        'x-apisports-host': API_HOST,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
