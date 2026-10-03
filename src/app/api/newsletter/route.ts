import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNewsletterWelcomeEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      // If already subscribed, return success to not leak info or just acknowledge
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    await prisma.subscriber.create({
      data: { email },
    });

    await sendNewsletterWelcomeEmail({ to: email });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[NEWSLETTER ERROR]', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
