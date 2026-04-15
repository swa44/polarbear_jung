'use client'

import { ModuleCategory, ModuleOption } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface ModuleSelectorProps {
  open: boolean
  onClose: () => void
  modules: ModuleOption[]
  onSelect: (module: ModuleOption) => void
  showPrice: boolean
  slotIndex: number
  colorName: string
  coverCodeMap?: Record<string, string>
}

const CATEGORIES: ModuleCategory[] = ['스위치류', '콘센트류', '기타류']

export default function ModuleSelector({
  open,
  onClose,
  modules,
  onSelect,
  showPrice,
  slotIndex,
  colorName,
  coverCodeMap = {},
}: ModuleSelectorProps) {
  useLockBodyScroll(open)
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('스위치류')
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const loadedCategoryKeysRef = useRef<Set<string>>(new Set())

  const filtered = modules.filter((m) => m.category === activeCategory)
  const categoryLoadKey = `${activeCategory}:${colorName}:${filtered.map((m) => m.name).join('|')}`

  useEffect(() => {
    if (!open) return

    const imageUrls = filtered.map((module) => `/modules/${colorName}/${coverCodeMap[`${module.name}||${colorName}`] ?? module.name.replaceAll('/', ':')}.webp`)

    if (imageUrls.length === 0 || loadedCategoryKeysRef.current.has(categoryLoadKey)) {
      setIsCategoryLoading(false)
      return
    }

    let cancelled = false
    setIsCategoryLoading(true)

    Promise.all(
      imageUrls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image()
            img.onload = () => resolve()
            img.onerror = () => resolve()
            img.src = src
          })
      )
    ).then(() => {
      if (cancelled) return
      loadedCategoryKeysRef.current.add(categoryLoadKey)
      setIsCategoryLoading(false)
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryLoadKey])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col" style={{ height: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">
            {slotIndex + 1}번 구 모듈 선택
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Module Grid */}
        <div className="px-4 pb-6 flex-1 overflow-y-auto">
          {isCategoryLoading ? (
            <div className="flex h-full min-h-40 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                <p className="text-sm">모듈 이미지를 불러오는 중입니다.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((module) => (
                <button
                  key={module.name}
                  onClick={() => onSelect(module)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-900 hover:bg-gray-50 transition-all active:scale-95"
                >
                  <Image
                    src={`/modules/${colorName}/${coverCodeMap[`${module.name}||${colorName}`] ?? module.name.replaceAll('/', ':')}.webp`}
                    alt={module.name}
                    width={72}
                    height={72}
                    className="object-cover w-16 h-16"
                  />
                  <span className="text-sm font-medium text-gray-800 text-center leading-tight">
                    {module.name}
                  </span>
                  {showPrice && module.price > 0 && (
                    <span className="text-xs text-gray-500">{formatPrice(module.price)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {!isCategoryLoading && filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">선택 가능한 모듈이 없습니다.</p>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
