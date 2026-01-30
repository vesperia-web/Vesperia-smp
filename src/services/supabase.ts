import { createClient } from '@supabase/supabase-js';

// Configuration from your provided script
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';

export const supabase = createClient(SB_URL, SB_KEY);