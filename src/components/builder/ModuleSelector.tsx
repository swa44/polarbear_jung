'use client'

import { Module, ModuleCategory } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface ModuleSelectorProps {
  open: boolean
  onClose: () => void
  modules: Module[]
  onSelect: (module: Module) => void
  showPrice: boolean
  slotIndex: number
}

const CATEGORIES: ModuleCategory[] = ['스위치류', '콘센트류', '기타류']

export default function ModuleSelector({
  open,
  onClose,
  modules,
  onSelect,
  showPrice,
  slotIndex,
}: ModuleSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('스위치류')

  const filtered = modules.filter((m) => m.category === activeCategory)

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-white rounded-t-2xl shadow-xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

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
        <div className="px-4 pb-6 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((module) => (
              <button
                key={module.id}
                onClick={() => onSelect(module)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-900 hover:bg-gray-50 transition-all active:scale-95"
              >
                {module.image_url ? (
                  <Image
                    src={module.image_url}
                    alt={module.name}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover w-12 h-12"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400">이미지 없음</span>
                  </div>
                )}
                <span className="text-xs font-medium text-gray-800 text-center leading-tight">
                  {module.name}
                </span>
                {showPrice && module.price > 0 && (
                  <span className="text-xs text-gray-500">{formatPrice(module.price)}</span>
                )}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">선택 가능한 모듈이 없습니다.</p>
          )}
        </div>
      </div>
    </>
  )
}
