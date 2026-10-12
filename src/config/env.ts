import dotenv from 'dotenv'
dotenv.config()

export const env = {
    PORT: process.env.PORT || 4000,
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
}
