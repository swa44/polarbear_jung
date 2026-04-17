'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'

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
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>

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
