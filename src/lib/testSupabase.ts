import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase.from('exam_resources').select('*');
  console.log('Supabase test:', { data, error });
}
