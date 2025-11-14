// File: supabase/functions/run_scheduled_jobs/index.ts

import { createClient } from 'supabase-js';
import { serve } from 'std/server';

const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

serve(async (req) => {
    const today = new Date();
    
    // --- A. दैनिक लेवल अपग्रेड और टूर अपडेट (Daily Job) ---

    // यहाँ उन सभी यूजर्स की एक लिस्ट प्राप्त करें जिनकी आपको जाँच करनी है
    // और प्रत्येक यूजर के लिए SQL Function 'check_level_upgrade' को कॉल करें।
    
    const { data: activeUsers, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true);

    if (activeUsers) {
        for (const user of activeUsers) {
            await supabase.rpc('check_level_upgrade', { user_id_in: user.id });
        }
        console.log(`Processed level checks for ${activeUsers.length} users.`);
    }

    // --- B. मासिक पैसिव इनकम वितरण (Monthly Job) ---
    // यह केवल महीने की 1 तारीख को चलना चाहिए
    if (today.getDate() === 1) {
        // पिछले महीने की पहली तारीख
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        
        const { error: passiveError } = await supabase.rpc('distribute_monthly_passive', {
            target_month: lastMonth.toISOString().split('T')[0]
        });

        if (passiveError) {
            console.error('Passive distribution SQL error:', passiveError);
        } else {
            console.log('Monthly passive income distributed successfully.');
        }
    }

    return new Response(JSON.stringify({ message: 'Scheduled jobs completed.' }), { status: 200 });
});
