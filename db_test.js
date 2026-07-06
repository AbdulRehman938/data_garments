import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbajwugufurgjubndhwl.supabase.co';
const supabaseKey = 'sb_publishable_gDfPz17YLtukMFiMQA9hYg_2wkAZ6KE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data: catData, error: catErr } = await supabase.from('categories').select('*').limit(1);
    console.log("Categories sample row:", catData?.[0] || catErr);
    
    const { data: prodData, error: prodErr } = await supabase.from('products').select('*').limit(1);
    console.log("Products sample row:", prodData?.[0] || prodErr);
  } catch (e) {
    console.error(e);
  }
}

test();
