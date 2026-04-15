type SendQuoteAlimtalkInput = {
  to: string
  quoteUrl: string
}

const API_URL = process.env.BIZGO_API_URL
const API_KEY = process.env.BIZGO_API_KEY
const ALIMTALK_SENDER_KEY = process.env.ALIMTALK_SENDER_KEY
const ALIMTALK_TEMPLATE_CODE = process.env.ALIMTALK_TEMPLATE_CODE ?? 'ESTIMATEJUNG'
const ALIMTALK_SEND_TYPE = process.env.ALIMTALK_SEND_TYPE ?? 'template'
const ALIMTALK_MSG_TYPE = process.env.ALIMTALK_MSG_TYPE ?? 'AI'
const ALIMTALK_TEMPLATE_TEXT =
  process.env.ALIMTALK_TEMPLATE_TEXT ??
  '안녕하세요\n폴라베어🐻‍❄️ 입니다.\n\n요청하신 견적이\n완료되었습니다.\n\n아래의 버튼을 눌러\n견적내용을 확인해주세요.\n\n*해당 메시지는 \n견적을 요청하신 경우에만 발송됩니다.'
const ALIMTALK_BUTTON_NAME = process.env.ALIMTALK_BUTTON_NAME ?? '견적서 확인하기'
const ALIMTALK_BUTTON_URL_MOBILE =
  process.env.ALIMTALK_BUTTON_URL_MOBILE ?? 'https://#{견적서링크}'
const ALIMTALK_BUTTON_URL_PC = process.env.ALIMTALK_BUTTON_URL_PC

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
  const templateTextForSend = ALIMTALK_TEMPLATE_TEXT
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .normalize('NFC')

  const alimtalkPayload =
    ALIMTALK_SEND_TYPE === 'template'
      ? {
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: ALIMTALK_TEMPLATE_CODE,
          sendType: 'template',
        }
      : {
          msgType: ALIMTALK_MSG_TYPE,
          senderKey: ALIMTALK_SENDER_KEY,
          templateCode: ALIMTALK_TEMPLATE_CODE,
          text: templateTextForSend,
          button: [
            {
              type: 'WL',
              name: ALIMTALK_BUTTON_NAME,
              urlMobile: ALIMTALK_BUTTON_URL_MOBILE,
              ...(ALIMTALK_BUTTON_URL_PC ? { urlPc: ALIMTALK_BUTTON_URL_PC } : {}),
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
      ALIMTALK_TEMPLATE_CODE,
      'sendType:',
      ALIMTALK_SEND_TYPE,
      'msgType:',
      ALIMTALK_MSG_TYPE,
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
