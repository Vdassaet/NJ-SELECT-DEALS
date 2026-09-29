import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settingsList = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      const lowerKey = s.key.toLowerCase();
      // Block any accidental leak of secrets/tokens
      if (
        !lowerKey.includes('secret') &&
        !lowerKey.includes('token') &&
        !lowerKey.includes('password') &&
        !lowerKey.includes('credential') &&
        !lowerKey.includes('private')
      ) {
        settingsMap[s.key] = s.value;
      }
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch settings');
  }
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    const entries = Object.entries(settings).slice(0, 100);
    const updates = entries.map(([key, value]) => {
      const cleanKey = String(key).slice(0, 100);
      const cleanVal = String(value).slice(0, 5000);
      return prisma.settings.upsert({
        where: { key: cleanKey },
        update: { value: cleanVal },
        create: {
          key: cleanKey,
          value: cleanVal,
        },
      });
    });

    await prisma.$transaction(updates);

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPDATE_SETTINGS', updatedKeys: entries.map((e) => e[0]) },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to update settings');
  }
}
