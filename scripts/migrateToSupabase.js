import { createClient } from '@supabase/supabase-js';
import { MOCK_PROJECTS } from '../src/utils/mockData.js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log(`Starting migration of ${MOCK_PROJECTS.length} projects...`);

    const formattedProjects = MOCK_PROJECTS.map(p => {
        // Handle date format (YYYY/MM/DD -> YYYY-MM-DD)
        let supportDate = null;
        if (p.support_date) {
            supportDate = p.support_date.replace(/\//g, '-');
        }

        return {
            unit_id: p.id,
            name: p.name,
            phone_number: p.phone,
            line_type: p.line_type,
            maintenance_month: p.maintenance_month,
            status: p.status || '未対応',
            support_date: supportDate,
            master_update_done: !!p.master_update_done,
            notes: `Address: ${p.address || ''}\nLocker: ${p.locker_type || ''}`
        };
    });

    // Chunk size for bulk insert
    const CHUNK_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < formattedProjects.length; i += CHUNK_SIZE) {
        const chunk = formattedProjects.slice(i, i + CHUNK_SIZE);

        console.log(`Sending chunk ${i / CHUNK_SIZE + 1} (${chunk.length} items)...`);
        const { data, error } = await supabase
            .from('projects')
            .insert(chunk);

        if (error) {
            console.error(`Error migrating chunk starting at ${i}:`);
            console.error(JSON.stringify(error, null, 2));
            errorCount += chunk.length;
        } else {
            successCount += chunk.length;
            console.log(`Progress: ${successCount}/${formattedProjects.length} projects migrated.`);
        }
    }

    console.log('\nMigration complete!');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

migrate();
