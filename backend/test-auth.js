require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('profiles').select('*').eq('email','annapurnasewa@gmail.com').maybeSingle().then(({data,error}) => {
  console.log('error:', error);
  console.log('found:', data !== null);
  if(data) {
    bcrypt.compare('surajdai123', data.password_hash).then(v => {
      console.log('password valid:', v);
      console.log('hash in db:', data.password_hash);
    });
  }
});
