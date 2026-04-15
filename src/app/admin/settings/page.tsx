'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'

export default function AdminSettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    framesUpdated: number
    partsUpserted: number
    modulesUpdated?: number
    boxesUpdated?: number
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
          <p className="text-sm font-semibold text-gray-900 mb-1">BOM 가격 일괄 업데이트</p>
          <p className="text-xs text-gray-400">
            picking_bom_map.csv에 가격 컬럼을 추가한 파일을 업로드하세요.
            <br />
            상품명+색상이 같은 행의 가격을 합산해 모듈 가격을 업데이트합니다.
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
          {status === 'loading' ? '처리 중...' : '가격 업데이트'}
        </button>

        {status === 'done' && result && (
          <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm flex flex-col gap-1">
            <p className="font-semibold text-green-700">✓ 업데이트 완료</p>
            <p className="text-xs text-green-600">프레임 색상: {result.framesUpdated}건</p>
            {typeof result.boxesUpdated === 'number' && (
              <p className="text-xs text-green-600">매립박스: {result.boxesUpdated}건</p>
            )}
            <p className="text-xs text-green-600">부품(module_parts): {result.partsUpserted}건</p>
            {typeof result.modulesUpdated === 'number' && (
              <p className="text-xs text-green-600">모듈 합산가격: {result.modulesUpdated}건</p>
            )}
            {result.notFound.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-orange-600 font-medium mb-1">매칭 실패 ({result.notFound.length}건)</p>
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
