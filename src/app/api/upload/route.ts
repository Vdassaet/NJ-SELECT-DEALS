import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates actual binary magic bytes / file signatures.
 * Never trusts client-supplied Content-Type or file extensions.
 */
function detectImageFormat(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (buffer.length < 12) {
    return { valid: false, ext: '', mime: '' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: 'png', mime: 'image/png' };
  }

  // WEBP: 'RIFF'....'WEBP'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, ext: 'webp', mime: 'image/webp' };
  }

  return { valid: false, ext: '', mime: '' };
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    // 1. Authorization: Only verified store administrators can upload files
    const adminUser = await requireAdmin();

    // 2. Rate Limiting: 10 uploads per minute
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'file_upload',
      limit: 10,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Upload rate limit reached. Please wait a minute.' },
        { status: 429 }
      );
    }

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 3. Strict File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 5 MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Cryptographic Magic Bytes / Signature Verification
    const format = detectImageFormat(buffer);
    if (!format.valid) {
      return NextResponse.json(
        { error: 'Invalid file format. Only verified JPEG, PNG, and WEBP images are permitted.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Storage provider configuration is missing.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 5. Server-Side Random Filename Generation (prevents path traversal & overwrites)
    const randomHex = crypto.randomBytes(16).toString('hex');
    const filename = `prod-${Date.now()}-${randomHex}.${format.ext}`;

    // 6. Upload strictly to 'products' bucket with verified server-determined MIME type
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filename, buffer, {
        contentType: format.mime,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError);
      return NextResponse.json({ error: 'Failed to save uploaded image.' }, { status: 500 });
    }

    // 7. Get the public URL
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filename);

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPLOAD_FILE', filename, mime: format.mime, size: file.size },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Administrator access required to upload files.' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to process file upload.');
  }
}
