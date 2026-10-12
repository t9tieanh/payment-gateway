import { createClient } from '@supabase/supabase-js'
import { env } from '~/config/env'

if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export default supabase
