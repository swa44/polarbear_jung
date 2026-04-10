import { Order } from '@/types'
import { formatPhone, formatPrice, ORDER_STATUS_LABEL } from './utils'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (e) {
    console.error('Telegram send failed:', e)
  }
}

export async function notifyNewOrder(order: Order): Promise<void> {
  const itemLines = order.order_items
    ?.map((item) => {
      const modules = item.modules.map((m) => m.module_name).join(', ')
      return `  • ${item.gang_count}구 [${item.frame_color_name}] - ${modules}${item.embedded_box_name ? ` + ${item.embedded_box_name}` : ''} × ${item.quantity}개`
    })
    .join('\n')

  const text = `
🛎 <b>새 주문이 접수되었습니다!</b>

📋 주문번호: <code>${order.order_number}</code>
👤 고객명: ${order.customer_name}
📱 연락처: ${formatPhone(order.customer_phone)}
📦 배송지: ${order.shipping_address}${order.shipping_detail ? ` ${order.shipping_detail}` : ''}

<b>[주문 내역]</b>
${itemLines}

💰 합계: ${formatPrice(order.total_price)}

🕐 접수시각: ${new Date(order.created_at).toLocaleString('ko-KR')}
  `.trim()

  await sendTelegramMessage(text)
}

export async function notifyShipped(order: Order): Promise<void> {
  const text = `
📦 <b>발송 처리 완료</b>

📋 주문번호: <code>${order.order_number}</code>
👤 고객명: ${order.customer_name}
🚚 송장번호: <code>${order.tracking_number}</code>
  `.trim()

  await sendTelegramMessage(text)
}
