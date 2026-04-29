'use client'

import { use, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ShoppingCart } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { getFanProduct } from '@/lib/fan-products'
import { useFanCartStore } from '@/store/fanCartStore'
import Button from '@/components/ui/Button'

export default function FanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const product = getFanProduct(id)
  const addItem = useFanCartStore((s) => s.addItem)

  const [baseIdx, setBaseIdx] = useState(0)
  const [overlayIdx, setOverlayIdx] = useState<number | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const busy = useRef(false)

  if (!product) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        제품을 찾을 수 없습니다.
      </div>
    )
  }

  const folder = encodeURIComponent(product.mainFolder)
  const hasImages = product.mainImages.length > 0

  const handleColorSelect = (idx: number) => {
    if (idx === selectedIdx || busy.current) return
    busy.current = true
    setSelectedIdx(idx)  // 버튼 즉시 반응

    setOverlayIdx(idx)
    setOverlayVisible(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOverlayVisible(true)
        setTimeout(() => {
          setBaseIdx(idx)
          setOverlayIdx(null)
          setOverlayVisible(false)
          busy.current = false
        }, 700)
      })
    })
  }

  const selectedColor = product.mainImages[selectedIdx] ?? null
  const selectedSrc = selectedColor
    ? `/fan/main/${folder}/${encodeURIComponent(selectedColor.file)}`
    : null

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSrc) return
    addItem({
      id: uuidv4(),
      fan_id: product.id,
      fan_name: product.name,
      color: selectedColor.color,
      image_url: selectedSrc,
      unit_price: selectedColor.price,
      quantity,
    })
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 1500)
    setQuantity(1)
  }

  return (
    <div className="pb-8">
      <div className="px-4 py-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">목록</span>
        </button>
      </div>

      {/* Main image - 크로스페이드 */}
      <div
        className="relative overflow-hidden bg-gray-100 flex items-center justify-center"
        style={{ aspectRatio: '9/11' }}
      >
        {!hasImages ? (
          <span className="text-sm text-gray-400">이미지 준비중</span>
        ) : (
          <>
            <img
              src={`/fan/main/${folder}/${encodeURIComponent(product.mainImages[baseIdx].file)}`}
              alt={`${product.name} ${product.mainImages[baseIdx].color}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {overlayIdx !== null && (
              <img
                src={`/fan/main/${folder}/${encodeURIComponent(product.mainImages[overlayIdx].file)}`}
                alt={`${product.name} ${product.mainImages[overlayIdx].color}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: 'opacity 0.6s ease-in-out',
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="px-4 mt-5 flex flex-col gap-5">
        {/* Name + color */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
          {selectedColor && (
            <p className="text-sm text-gray-500 mt-1">
              색상:{' '}
              <span className="text-gray-900 font-medium">{selectedColor.color}</span>
            </p>
          )}
        </div>

        {/* Color selector */}
        {product.mainImages.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              색상 선택
            </p>
            <div className="flex flex-wrap gap-2">
              {product.mainImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => handleColorSelect(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    selectedIdx === idx
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {img.color}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail images */}
      <div className="mt-6 flex flex-col gap-2">
        {product.detailImages.map((file, idx) => (
          <img
            key={idx}
            src={`/fan/detail/${encodeURIComponent(product.detailFolder)}/${encodeURIComponent(file)}`}
            alt={`${product.name} 상세 ${idx + 1}`}
            className="w-full"
          />
        ))}
      </div>

      {/* Quantity + cart */}
      <div className="px-4 mt-6 flex flex-col gap-4">
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

        <Button
          onClick={handleAddToCart}
          fullWidth
          size="lg"
          className={addedFeedback ? 'bg-green-600 hover:bg-green-600' : ''}
        >
          {addedFeedback ? (
            '✓ 견적 바구니에 담겼어요!'
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              견적 바구니에 담기
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
