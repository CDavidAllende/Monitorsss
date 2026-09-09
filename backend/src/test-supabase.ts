import { supabase } from './lib/supabase';
 
async function main() {
  console.log('Probando insert directo con supabase-js...');
 
  const { data, error } = await supabase
    .from('monitors')
    .insert({
      name: 'Test directo',
      url: 'https://ejemplo.com',
      interval_minutes: 30,
    })
    .select()
    .single();
 
  console.log('data:', data);
  console.log('error:', error);
}
 
main();
 