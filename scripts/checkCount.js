import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Project count in Supabase:', count);
    }
}

check();
