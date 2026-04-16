import { ALIMTALK_CONFIG } from "@/config/alimtalk";

type SendQuoteAlimtalkInput = {
  to: string
  quoteUrl: string
}

type SendShippingAlimtalkInput = {
  to: string
  trackingCompany: string
  trackingNumber: string
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

export async function sendShippingAlimtalk(input: SendShippingAlimtalkInput): Promise<boolean> {
  if (!API_URL || !API_KEY || !ALIMTALK_SENDER_KEY) {
    console.error('[Alimtalk Skip] Missing env for shipping alimtalk')
    console.log('[Alimtalk Skip] to:', input.to, 'tracking:', input.trackingCompany, input.trackingNumber)
    return false
  }

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
          택배사: input.trackingCompany,
          송장번호: input.trackingNumber,
        },
      },
    ],
  }

  try {
    console.log('[Alimtalk Send] shipping to:', input.to, 'tracking:', input.trackingCompany, input.trackingNumber)
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
