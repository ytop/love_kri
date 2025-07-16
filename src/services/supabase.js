import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vyrojgsjtyitolvzwznl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cm9qZ3NqdHlpdG9sdnp3em5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDk3MjQsImV4cCI6MjA2NTQ4NTcyNH0.If2a_TweBbxeH2klxFsCVEOiYil24XBLF5lIpe3fRBo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);