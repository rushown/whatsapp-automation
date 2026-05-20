const { getSupabase } = require('../lib/supabase');

const memoryIntents = [];

async function loadActiveIntents() {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('intents')
      .select('*, intent_examples(utterance, embedding)')
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  }
  return memoryIntents.filter((i) => i.is_active !== false);
}

function setMemoryIntents(intents) {
  memoryIntents.length = 0;
  memoryIntents.push(...intents);
}

module.exports = { loadActiveIntents, setMemoryIntents, memoryIntents };
