#!/usr/bin/env node
/**
 * Seed admin profile in Supabase with bcrypt password.
 * Usage: ADMIN_PASSWORD=Admin@1234 node scripts/seed-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key);
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await sb
    .from('profiles')
    .upsert(
      { name: 'Admin', email, password_hash: hash, role: 'admin' },
      { onConflict: 'email' }
    )
    .select();

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log('Admin seeded:', email, data);
}

main();
