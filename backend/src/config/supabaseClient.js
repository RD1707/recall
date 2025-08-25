const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Confirme que esta linha usa SUPABASE_SERVICE_ROLE_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("INICIALIZANDO CLIENTE SUPABASE. A CHAVE ESTÁ DEFINIDA?", !!supabaseKey);navigator

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;