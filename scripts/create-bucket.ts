import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  console.log('Checking existing buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    process.exit(1);
  }

  const exists = buckets.some(b => b.name === 'products');
  if (exists) {
    console.log('Bucket "products" already exists. Ensuring it is public...');
    const { data, error } = await supabase.storage.updateBucket('products', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
       console.error('Error updating bucket:', error);
       process.exit(1);
    }
    console.log('Bucket "products" is ready and public!');
    process.exit(0);
  }

  console.log('Creating "products" bucket...');
  const { data, error } = await supabase.storage.createBucket('products', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    fileSizeLimit: 10485760, // 10MB
  });

  if (error) {
    console.error('Failed to create bucket:', error);
    process.exit(1);
  }

  console.log('✅ Bucket "products" created successfully and set to public!');
}

createBucket();
