import { ALIMTALK_CONFIG } from "@/config/alimtalk";

type SendQuoteAlimtalkInput = {
  to: string
  quoteUrl: string
}

type SendShippingAlimtalkInput = {
  to: string
  trackingCompany: string
  trackingNumber: string
  quoteUrl: string
}

const API_URL = process.env.BIZGO_API_URL
const API_KEY = process.env.BIZGO_API_KEY
const ALIMTALK_SENDER_KEY = process.env.ALIMTALK_SENDER_KEY

export async function sendQuoteAlimtalk(input: SendQuoteAlimtalkInput): Promise<boolean> {
  if (!API_URL || !API_KEY || !ALIMTALK_SENDER_KEY) {
    console.error('[Alimtalk Skip] Missing env:', {
      hasApiUrl: Boolean(API_URL),
      hasApiKey: Boolean(API_KEY),
      hasSenderKey: Boolean(ALIMTALK_SENDER_KEY),
    })
    console.log('[Alimtalk Skip] to:', input.to, 'url:', input.quoteUrl)
    return false
  }

  // 템플릿 버튼이 `https://#{견적서링크}` 형태일 때는 치환값에서 스킴을 제거해야
  // 최종 URL이 `https://도메인/...` 으로 정확히 맞춰집니다.
  const quoteUrlForTemplate = input.quoteUrl.replace(/^https?:\/\//, '')
  const templateTextForSend = ALIMTALK_CONFIG.templateText
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .normalize('NFC')

  const alimtalkPayload =
    ALIMTALK_CONFIG.sendType === 'template'
      ? {
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: ALIMTALK_CONFIG.templateCode,
          sendType: 'template',
        }
      : {
          msgType: ALIMTALK_CONFIG.msgType,
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: ALIMTALK_CONFIG.templateCode,
          text: templateTextForSend,
          button: [
            {
              type: 'WL',
              name: ALIMTALK_CONFIG.button.name,
              urlMobile: ALIMTALK_CONFIG.button.urlMobile,
              ...(ALIMTALK_CONFIG.button.urlPc
                ? { urlPc: ALIMTALK_CONFIG.button.urlPc }
                : {}),
            },
          ],
        }

  const payload = {
    messageFlow: [
      {
        alimtalk: alimtalkPayload,
      },
    ],
    destinations: [
      {
        to: input.to,
        replaceWords: {
          견적서링크: quoteUrlForTemplate,
        },
      },
    ],
  }

  try {
    console.log(
      '[Alimtalk Send] to:',
      input.to,
      'template:',
      ALIMTALK_CONFIG.templateCode,
      'sendType:',
      ALIMTALK_CONFIG.sendType,
      'msgType:',
      ALIMTALK_CONFIG.msgType,
    )
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Alimtalk payload text:', JSON.stringify(templateTextForSend))
      console.error('Alimtalk send failed:', res.status, body)
      return false
    }

    console.log('[Alimtalk Sent] success')
    return true
  } catch (e) {
    console.error('Alimtalk send exception:', e)
    return false
  }
}

export async function sendOrderNotifyAlimtalk(phones: string[]): Promise<void> {
  if (!API_URL || !API_KEY || !ALIMTALK_SENDER_KEY || phones.length === 0) return

  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: 'ORDERJUNG',
          sendType: 'template',
        },
      },
    ],
    destinations: phones.map((phone) => ({ to: phone })),
  }

  try {
    console.log('[Alimtalk Send] order notify to:', phones)
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Order notify alimtalk failed:', res.status, body)
    } else {
      console.log('[Alimtalk Sent] order notify success')
    }
  } catch (e) {
    console.error('Order notify alimtalk exception:', e)
  }
}

export async function sendFanOrderNotifyAlimtalk(phones: string[]): Promise<void> {
  if (!API_URL || !API_KEY || !ALIMTALK_SENDER_KEY || phones.length === 0) return

  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: 'ORDERLUCCIAIR',
          sendType: 'template',
        },
      },
    ],
    destinations: phones.map((phone) => ({ to: phone })),
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: API_KEY },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Fan order notify alimtalk failed:', res.status, body)
    } else {
      console.log('[Alimtalk Sent] fan order notify success')
    }
  } catch (e) {
    console.error('Fan order notify alimtalk exception:', e)
  }
}

export async function sendShippingAlimtalk(input: SendShippingAlimtalkInput): Promise<boolean> {
  if (!API_URL || !API_KEY || !ALIMTALK_SENDER_KEY) {
    console.error('[Alimtalk Skip] Missing env for shipping alimtalk')
    console.log('[Alimtalk Skip] to:', input.to, 'url:', input.quoteUrl)
    return false
  }

  // 기존 견적서 알림톡과 동일: 템플릿 버튼 URL이 https://#{배송조회링크} 형태이므로
  // replaceWords 값에서 https:// 스킴 제거
  const urlForTemplate = input.quoteUrl.replace(/^https?:\/\//, '')

  const payload = {
    messageFlow: [
      {
        alimtalk: {
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: 'SHIPJUNG',
          sendType: 'template',
        },
      },
    ],
    destinations: [
      {
        to: input.to,
        replaceWords: {
          배송조회링크: urlForTemplate,
        },
      },
    ],
  }

  try {
    console.log('[Alimtalk Send] shipping to:', input.to, 'url:', input.quoteUrl)
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Shipping alimtalk failed:', res.status, body)
      return false
    }

    console.log('[Alimtalk Sent] shipping success')
    return true
  } catch (e) {
    console.error('Shipping alimtalk exception:', e)
    return false
  }
}
