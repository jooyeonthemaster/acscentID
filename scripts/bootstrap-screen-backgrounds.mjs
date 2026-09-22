import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

nextEnv.loadEnvConfig(process.cwd())
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase URL / service role configuration is required.')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const name = 'screen-background-settings'
const current = await client.storage.getBucket(name)
if (current.data) {
  if (current.data.public) throw new Error('Settings bucket must be private; inspect its configuration before proceeding.')
  console.log('Private screen background settings bucket already exists; existing records were preserved.')
} else {
  if (current.error && !['404', '400'].includes(String(current.error.statusCode))) throw new Error(`Cannot inspect settings bucket: ${current.error.message}`)
  const { error } = await client.storage.createBucket(name, { public: false, fileSizeLimit: 32768, allowedMimeTypes: ['application/json'] })
  if (error) throw new Error(`Cannot create settings bucket: ${error.message}`)
  console.log('Created private screen-background-settings bucket. Only server service-role access is needed; no SQL migration.')
}
