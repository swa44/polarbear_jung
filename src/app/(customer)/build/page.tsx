'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { FrameColor, Module, EmbeddedBox, ModuleSlotSelection, CartItem } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import Button from '@/components/ui/Button'
import ModuleSelector from '@/components/builder/ModuleSelector'
import { Plus, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'

interface ProductData {
  frame_colors: FrameColor[]
  modules: Module[]
  embedded_boxes: EmbeddedBox[]
}

export default function BuildPage() {
  const addItem = useCartStore((s) => s.addItem)

  const [products, setProducts] = useState<ProductData | null>(null)
  const [showPrice, setShowPrice] = useState(false)
  const [loading, setLoading] = useState(true)

  // Builder state
  const [gangCount, setGangCount] = useState<number>(1)
  const [selectedColor, setSelectedColor] = useState<FrameColor | null>(null)
  const [selectedModules, setSelectedModules] = useState<(Module | null)[]>([null])
  const [selectedBox, setSelectedBox] = useState<EmbeddedBox | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Module selector sheet
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<number>(0)

  // Color tab
  const [colorTab, setColorTab] = useState<'plastic' | 'metal'>('plastic')

  const [addedFeedback, setAddedFeedback] = useState(false)

  useEffect(() => {
    async function load() {
      const [productsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/settings'),
      ])
      const productsData = await productsRes.json()
      const settingsData = await settingsRes.json()

      setProducts(productsData)
      setShowPrice(settingsData.show_price === 'true')
      if (productsData.frame_colors?.length) {
        setSelectedColor(productsData.frame_colors[0])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleGangCountChange = (count: number) => {
    setGangCount(count)
    setSelectedModules(Array(count).fill(null))
  }

  const openModuleSelector = (slotIndex: number) => {
    setEditingSlot(slotIndex)
    setSelectorOpen(true)
  }

  const handleModuleSelect = (module: Module) => {
    const newModules = [...selectedModules]
    newModules[editingSlot] = module
    setSelectedModules(newModules)
    setSelectorOpen(false)
  }

  const allModulesSelected = selectedModules.every((m) => m !== null)
  const canAddToCart = selectedColor !== null && allModulesSelected

  const getItemPrice = () => {
    if (!selectedColor) return 0
    const modulePrice = selectedModules.reduce((s, m) => s + (m?.price ?? 0), 0)
    const boxPrice = selectedBox?.price ?? 0
    return selectedColor.price + modulePrice + boxPrice
  }

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedColor) return

    const cartItem: CartItem = {
      id: uuidv4(),
      gang_count: gangCount,
      frame_color: selectedColor,
      modules: selectedModules.map((m, i) => ({
        slot: i + 1,
        module_id: m!.id,
        module_name: m!.name,
        module_price: m!.price,
      })),
      embedded_box: selectedBox,
      quantity,
    }

    addItem(cartItem)
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 1500)

    // Reset
    setSelectedModules(Array(gangCount).fill(null))
    setSelectedBox(null)
    setQuantity(1)
  }

  const filteredColors = products?.frame_colors.filter(
    (c) => c.material_type === colorTab && c.is_active
  ) || []

  const availableModules = products?.modules.filter((m) => {
    if (!m.is_active) return false
    if (m.max_gang !== null && m.max_gang !== gangCount) return false
    return true
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      {/* Step 1: 구수 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 · 구수 선택
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleGangCountChange(n)}
              className={cn(
                'py-3 rounded-xl border-2 text-sm font-bold transition-all',
                gangCount === n
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              )}
            >
              {n}구
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: 색상 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 2 · 프레임 색상
        </h2>
        <div className="flex gap-2 mb-3">
          {(['plastic', 'metal'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setColorTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                colorTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {tab === 'plastic' ? '듀로플라스틱' : '메탈'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {filteredColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setSelectedColor(color)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                selectedColor?.id === color.id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              {color.image_url ? (
                <Image
                  src={color.image_url}
                  alt={color.name}
                  width={60}
                  height={60}
                  className="rounded-lg object-cover w-14 h-14"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  No img
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {color.name}
              </span>
              {showPrice && color.price > 0 && (
                <span className="text-xs text-gray-500">{formatPrice(color.price)}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Step 3: 모듈 선택 (Visual Builder) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 3 · 모듈 선택 ({gangCount}구)
        </h2>
        <div className="flex gap-2">
          {Array.from({ length: gangCount }).map((_, i) => {
            const mod = selectedModules[i]
            return (
              <button
                key={i}
                onClick={() => openModuleSelector(i)}
                className={cn(
                  'flex-1 min-h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all',
                  mod
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-dashed border-gray-300 bg-white hover:border-gray-500'
                )}
              >
                {mod ? (
                  <>
                    {mod.image_url ? (
                      <Image
                        src={mod.image_url}
                        alt={mod.name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover w-10 h-10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200" />
                    )}
                    <span className="text-xs font-medium text-gray-800 text-center px-1 leading-tight">
                      {mod.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-400">{i + 1}번 구</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
        {!allModulesSelected && (
          <p className="text-xs text-amber-600 mt-2">
            {selectedModules.filter((m) => m === null).length}개 구의 모듈을 선택해주세요.
          </p>
        )}
      </section>

      {/* Step 4: 매립박스 (선택) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 4 · 매립박스 <span className="text-gray-400 normal-case font-normal">(선택사항)</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedBox(null)}
            className={cn(
              'p-3 rounded-xl border-2 text-sm font-medium transition-all',
              selectedBox === null
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            )}
          >
            선택 안함
          </button>
          {products?.embedded_boxes.filter((b) => b.is_active).map((box) => (
            <button
              key={box.id}
              onClick={() => setSelectedBox(box)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                selectedBox?.id === box.id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              {box.image_url ? (
                <Image
                  src={box.image_url}
                  alt={box.name}
                  width={48}
                  height={48}
                  className="rounded-lg object-cover w-10 h-10"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100" />
              )}
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {box.name}
              </span>
              {showPrice && box.price > 0 && (
                <span className="text-xs text-gray-500">{formatPrice(box.price)}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 수량 & 담기 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">수량</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-gray-900">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200"
            >
              +
            </button>
          </div>
        </div>

        {showPrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">예상 금액</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(getItemPrice() * quantity)}
            </span>
          </div>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          fullWidth
          size="lg"
          className={cn(addedFeedback && 'bg-green-600 hover:bg-green-600')}
        >
          {addedFeedback ? '✓ 장바구니에 담겼어요!' : '장바구니에 담기'}
        </Button>
      </div>

      {/* Module Selector Sheet */}
      <ModuleSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        modules={availableModules}
        onSelect={handleModuleSelect}
        showPrice={showPrice}
        slotIndex={editingSlot}
      />
    </div>
  )
}
