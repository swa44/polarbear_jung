'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LucciairAdminSettingsPage() {
  const [notifyPhones, setNotifyPhones] = useState<string[]>([])
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.lucciair_notify_phones) {
          setNotifyPhones(
            data.lucciair_notify_phones.split(',').map((p: string) => p.trim()).filter(Boolean)
          )
        }
      })
      .catch(() => {})
  }, [])

  const savePhones = async (phones: string[]) => {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lucciair_notify_phones: phones.join(',') }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAdd = async () => {
    const phone = newPhone.trim().replace(/[^0-9]/g, '')
    if (!phone || notifyPhones.includes(phone)) return
    const next = [...notifyPhones, phone]
    setNotifyPhones(next)
    setNewPhone('')
    await savePhones(next)
  }

  const handleRemove = async (phone: string) => {
    const next = notifyPhones.filter((p) => p !== phone)
    setNotifyPhones(next)
    await savePhones(next)
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">LUCCIAIR 설정</h1>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">주문 알림 번호</p>
          <p className="text-xs text-gray-400 mt-0.5">새 견적 접수 시 알림톡이 발송됩니다.</p>
        </div>

        <div className="flex flex-col gap-2">
          {notifyPhones.map((phone) => (
            <div key={phone} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-sm text-gray-700">{phone}</span>
              <button onClick={() => handleRemove(phone)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="01012345678"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          <Button onClick={handleAdd} loading={saving} variant="secondary" size="md">추가</Button>
        </div>

        {saved && <p className="text-xs text-green-600">저장되었습니다.</p>}
      </section>
    </div>
  )
}
