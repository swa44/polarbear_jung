export type MaterialType = 'plastic' | 'metal'
export type ModuleCategory = '스위치류' | '콘센트류' | '기타류'
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'cancelled'

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
}

export interface CartItem {
  id: string // local uuid
  gang_count: number
  frame_color: FrameColor
  modules: ModuleSlotSelection[] // length === gang_count
  embedded_box: EmbeddedBox | null
  quantity: number
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  shipping_address: string
  shipping_detail: string | null
  status: OrderStatus
  total_price: number
  tracking_company: string | null
  tracking_number: string | null
  admin_memo: string | null
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

export interface Settings {
  show_price: boolean
  telegram_enabled: boolean
}
