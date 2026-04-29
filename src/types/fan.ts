export interface FanOrderItem {
  id: string
  order_id: string
  fan_id: string
  fan_name: string
  color: string
  unit_price: number
  quantity: number
  total_price: number
  created_at: string
}

export interface FanOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  recipient_name: string | null
  recipient_phone: string | null
  shipping_address: string
  shipping_detail: string | null
  status: string
  total_price: number
  quote_token: string | null
  quote_expires_at: string | null
  quoted_at: string | null
  shipping_submitted_at: string | null
  paid_at: string | null
  shipped_at: string | null
  cancelled_at: string | null
  tracking_company: string | null
  tracking_number: string | null
  admin_memo: string | null
  created_at: string
  updated_at: string
  fan_order_items?: FanOrderItem[]
}
