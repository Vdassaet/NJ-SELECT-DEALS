import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase no está configurado. Por favor añade NEXT_PUBLIC_SUPABASE_URL y SUPABASE_ANON_KEY a tu archivo .env' 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${uniqueSuffix}-${originalName}`;
    
    // Upload to the 'products' bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError);
      return NextResponse.json({ error: `Error de Supabase: ${uploadError.message}` }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filename);

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
