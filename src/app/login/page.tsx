'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type Step = 'info' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const setSession = useSessionStore((s) => s.setSession)

  const [step, setStep] = useState<Step>('info')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async () => {
    setError('')
    const cleanPhone = phone.replace(/-/g, '')
    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) return setError('올바른 전화번호를 입력해주세요.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep('otp')
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    if (!otp || otp.length !== 6) return setError('인증번호 6자리를 입력해주세요.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/-/g, ''), code: otp, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSession(data.name, data.phone)
      router.push('/build')
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">정스위치</h1>
          <p className="mt-2 text-gray-500 text-sm">맞춤형 스위치 주문 서비스</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === 'info' ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-900">주문자 정보 입력</h2>
              <Input
                label="이름"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <Input
                label="전화번호"
                placeholder="01012345678"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleSendOtp}
                loading={loading}
                fullWidth
                size="lg"
                className="mt-2"
              >
                인증번호 받기
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">인증번호 입력</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-800">{phone}</span>으로 발송된<br />
                  6자리 인증번호를 입력해주세요.
                </p>
              </div>
              <Input
                label="인증번호"
                placeholder="123456"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleVerifyOtp}
                loading={loading}
                fullWidth
                size="lg"
                className="mt-2"
              >
                확인
              </Button>
              <button
                onClick={() => { setStep('info'); setOtp(''); setError('') }}
                className="text-sm text-gray-500 underline text-center"
              >
                번호 다시 입력
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          본 서비스는 폐쇄형 발주 전용 서비스입니다.
        </p>
      </div>
    </div>
  )
}
