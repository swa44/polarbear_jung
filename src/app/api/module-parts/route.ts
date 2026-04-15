import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('module_parts')
    .select('id, module_name, color_name, part_code, part_name, price, category, material_type')
    .eq('is_active', true)
    .order('module_name')
    .order('part_code')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ parts: data ?? [] })
}
