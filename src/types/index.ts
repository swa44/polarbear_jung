export type MaterialType = 'plastic' | 'metal'

export interface ModulePart {
  id: string
  module_name: string
  color_name: string
  part_code: string
  part_name: string
  price: number
  image_url?: string | null
  category?: string | null
  material_type?: string | null
  is_active?: boolean
}

export type ModuleCategory = '스위치류' | '콘센트류' | '기타류'

export interface ModuleOption {
  name: string
  category: ModuleCategory
  price: number
}
export type OrderStatus =
  | 'quoted'
  | 'shipping_info_submitted'
  | 'waiting_deposit'
  | 'paid'
  | 'shipped'
  | 'cancelled'
  | 'expired'

export interface FrameColor {
  id: string
  name: string
  material_type: MaterialType
  image_url: string | null
  price: number
  price_1: number | null
  price_2: number | null
  price_3: number | null
  price_4: number | null
  price_5: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Module {
  id: string
  frame_color_id: string
  name: string
  category: ModuleCategory
  price: number
  image_url: string | null
  max_gang: number | null // null = no restriction, 1 = 1-gang only
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface EmbeddedBox {
  id: string
  name: string
  price: number
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ModuleSlotSelection {
  slot: number
  module_id: string
  module_name: string
  module_price: number
  image_url?: string | null
}

export interface CartItem {
  id: string // local uuid
  item_type?: 'set' | 'single'
  gang_count: number
  frame_color: FrameColor
  image_url?: string | null  // resolved at add-to-cart time
  modules: ModuleSlotSelection[] // length === gang_count
  embedded_box: EmbeddedBox | null
  embedded_box_quantity?: number
  quantity: number
  single_category?: 'frame' | 'insert' | 'cover' | 'box' | 'part'
  single_name?: string
  single_unit_price?: number
  single_color_name?: string | null
  single_part_code?: string | null
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  recipient_name: string | null
  recipient_phone: string | null
  shipping_address: string
  shipping_detail: string | null
  status: OrderStatus
  total_price: number
  tracking_company: string | null
  tracking_number: string | null
  admin_memo: string | null
  quote_token: string | null
  quote_expires_at: string | null
  quoted_at: string | null
  shipping_submitted_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  shipped_at: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  gang_count: number
  frame_color_id: string | null
  frame_color_name: string
  frame_color_price: number
  modules: ModuleSlotSelection[]
  embedded_box_id: string | null
  embedded_box_name: string | null
  embedded_box_price: number
  quantity: number
  item_price: number
  total_price: number
  created_at: string
}
