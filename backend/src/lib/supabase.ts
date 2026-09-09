import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DIAGNÓSTICO TEMPORAL: borra estas 2 líneas después de confirmar el valor
console.log('SUPABASE_URL crudo:', JSON.stringify(supabaseUrl));
console.log('SUPABASE_KEY longitud:', supabaseKey?.length);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa tu .env)'
  );
}

// Usamos la service role key porque este cliente vive solo en el backend
// (nunca se expone al frontend). Esta key salta Row Level Security,
// así que trátala con el mismo cuidado que una contraseña.
export const supabase = createClient(supabaseUrl, supabaseKey);