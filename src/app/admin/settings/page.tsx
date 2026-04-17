'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    framesUpdated: number
    modulesAdded: number
    boxesUpdated: number
    partsUpserted: number
    notFound: string[]
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 관리자 알림 번호 상태
  const [notifyPhones, setNotifyPhones] = useState<string[]>([])
  const [newPhone, setNewPhone] = useState('')
  const [phonesSaving, setPhonesSaving] = useState(false)
  const [phonesSaved, setPhonesSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.admin_notify_phones) {
          setNotifyPhones(
            data.admin_notify_phones
              .split(',')
              .map((p: string) => p.trim())
              .filter(Boolean)
          )
        }
      })
      .catch(() => {})
  }, [])

  const savePhones = async (phones: string[]) => {
    setPhonesSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notify_phones: phones.join(',') }),
    })
    setPhonesSaving(false)
    setPhonesSaved(true)
    setTimeout(() => setPhonesSaved(false), 2000)
  }

  const handleAddPhone = async () => {
    const phone = newPhone.trim().replace(/[^0-9]/g, '')
    if (!phone || notifyPhones.includes(phone)) return
    const next = [...notifyPhones, phone]
    setNotifyPhones(next)
    setNewPhone('')
    await savePhones(next)
  }

  const handleRemovePhone = async (phone: string) => {
    const next = notifyPhones.filter((p) => p !== phone)
    setNotifyPhones(next)
    await savePhones(next)
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setStatus('loading')
    setResult(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/import-bom-prices', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? '오류가 발생했습니다.')
        setStatus('error')
        return
      }
      setResult(data)
      setStatus('done')
    } catch {
      setErrorMsg('요청에 실패했습니다.')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* 관리자 알림 번호 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">관리자 알림 번호</p>
          <p className="text-xs text-gray-400">
            배송정보 입력 후 입금 대기 상태가 되면 등록된 번호로 카카오 알림톡이 발송됩니다.
          </p>
        </div>

        {notifyPhones.length > 0 && (
          <ul className="flex flex-col gap-2">
            {notifyPhones.map((phone) => (
              <li key={phone} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-sm">
                <span className="font-mono text-gray-800">{phone}</span>
                <button
                  onClick={() => handleRemovePhone(phone)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium ml-3"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="번호 입력 (예: 01012345678)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-900"
          />
          <button
            onClick={handleAddPhone}
            disabled={phonesSaving}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {phonesSaving ? '저장 중...' : phonesSaved ? '저장됨' : '추가'}
          </button>
        </div>
      </div>

      {/* 상품 일괄 가져오기 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">상품 일괄 가져오기 (CSV)</p>
          <p className="text-xs text-gray-400">
            상품명, 색상, 품목코드, 제품명, 단가, 카테고리, 재질 컬럼이 있는 CSV를 업로드하세요.
            <br />
            카테고리에 따라 프레임 / 모듈 / 매립박스로 자동 분류됩니다.
            <br />
            같은 상품명의 여러 행은 낱개 부품으로 처리되며 가격이 합산됩니다.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />

        <button
          onClick={handleImport}
          disabled={status === 'loading'}
          className="py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
        >
          {status === 'loading' ? '처리 중...' : '가져오기'}
        </button>

        {status === 'done' && result && (
          <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm flex flex-col gap-1">
            <p className="font-semibold text-green-700">완료</p>
            <p className="text-xs text-green-600">프레임 색상: {result.framesUpdated}건</p>
            <p className="text-xs text-green-600">모듈: {result.modulesAdded}건</p>
            <p className="text-xs text-green-600">매립박스: {result.boxesUpdated}건</p>
            <p className="text-xs text-green-600">낱개부품(module_parts): {result.partsUpserted}건</p>
            {result.notFound.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-orange-600 font-medium mb-1">
                  처리 실패 ({result.notFound.length}건)
                </p>
                <ul className="text-xs text-orange-500 space-y-0.5">
                  {result.notFound.map((msg, i) => (
                    <li key={i}>· {msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}
      </div>
    </div>
  )
}
