import { createClient } from '@/lib/supabase/server'

export async function checkAdminAuth(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}
