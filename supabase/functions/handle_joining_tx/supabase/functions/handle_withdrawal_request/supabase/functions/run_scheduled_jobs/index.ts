// File: supabase/functions/handle_withdrawal_request/index.ts

import { createClient } from 'supabase-js';
import { serve } from 'std/server';

const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

serve(async (req) => {
    // RLS को बायपास करने के लिए Service Role Key का उपयोग करें
    const { user_id, amount } = await req.json();

    // 1. यूजर का वर्तमान बैलेंस प्राप्त करें
    // यह SQL फंक्शन द्वारा गणना की जा सकती है: Total Income - Total Paid
    const { data: userProfile, error: balanceError } = await supabase
        .from('users')
        .select('total_income, total_paid, wallet_address')
        .eq('id', user_id)
        .single();
    
    const availableBalance = userProfile.total_income - userProfile.total_paid;
    
    if (amount > availableBalance) {
        return new Response(JSON.stringify({ error: 'Insufficient funds.' }), { status: 400 });
    }

    // 2. विथड्रॉल अनुरोध 'transactions' टेबल में दर्ज करें
    const { error: insertError } = await supabase
        .from('transactions')
        .insert({
            user_id: user_id,
            amount: amount,
            type: 'withdrawal',
            wallet_from: userProfile.wallet_address, // जहाँ एडमिन को भेजना है
            status: 'pending' // Admin panel में दिखेगा
        });

    if (insertError) {
        return new Response(JSON.stringify({ error: 'Could not log withdrawal request.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Withdrawal request submitted successfully.' }), { status: 200 });
});
