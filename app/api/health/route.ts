import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbCheck = await prisma.manufacturer.count();
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { status: 'connected', manufacturers: dbCheck },
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
