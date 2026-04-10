'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function AdminSettingsPage() {
  const [showPrice, setShowPrice] = useState(true)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        setShowPrice(d.show_price === 'true')
        setTelegramEnabled(d.telegram_enabled === 'true')
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        show_price: String(showPrice),
        telegram_enabled: String(telegramEnabled),
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <ToggleRow
          label="고객에게 가격 표시"
          description="활성화하면 고객 화면에 모듈/프레임 가격이 표시됩니다."
          checked={showPrice}
          onChange={setShowPrice}
        />
        <ToggleRow
          label="텔레그램 알림"
          description="새 주문 접수 시 텔레그램 봇으로 알림을 보냅니다."
          checked={telegramEnabled}
          onChange={setTelegramEnabled}
        />
      </div>

      <div className="mt-4">
        <Button onClick={handleSave} loading={saving} size="lg">
          {saved ? '✓ 저장됨' : '설정 저장'}
        </Button>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">환경변수 확인</p>
        <div className="space-y-1 text-xs text-amber-700">
          <p>TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — 텔레그램 알림 연동 시 필요</p>
          <p>SMS_API_URL, SMS_API_KEY, SMS_SENDER — SMS 인증 발송 시 필요</p>
          <p>ADMIN_PASSWORD — 관리자 로그인 비밀번호</p>
          <p>.env.local.example 파일을 참고하여 .env.local에 설정하세요.</p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
