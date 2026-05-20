const { createClient } = require('@supabase/supabase-js');
const { config } = require('../config');

let client = null;

function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return null;
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

function isSupabaseEnabled() {
  return Boolean(getSupabase());
}

module.exports = { getSupabase, isSupabaseEnabled };
