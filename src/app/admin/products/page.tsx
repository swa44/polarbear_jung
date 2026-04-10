'use client'

import { useState, useEffect } from 'react'
import { FrameColor, Module, EmbeddedBox } from '@/types'
import { formatPrice } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ProductData {
  frame_colors: FrameColor[]
  modules: Module[]
  embedded_boxes: EmbeddedBox[]
}

type TableName = 'frame_colors' | 'modules' | 'embedded_boxes'
type ActiveTab = TableName

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'modules', label: '모듈' },
  { key: 'frame_colors', label: '프레임 색상' },
  { key: 'embedded_boxes', label: '매립박스' },
]

export default function AdminProductsPage() {
  const [data, setData] = useState<ProductData | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('modules')
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const res = await fetch('/api/admin/products')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  const handleToggleActive = async (table: TableName, item: any) => {
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id: item.id, data: { is_active: !item.is_active } }),
    })
    loadData()
  }

  const handleDelete = async (table: TableName, id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    })
    loadData()
  }

  const handleImageUpload = async (table: TableName, id: string, file: File) => {
    setUploadingId(id)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${table}/${id}.${ext}`

    const { data: uploadData, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)

      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, data: { image_url: urlData.publicUrl } }),
      })
      loadData()
    }
    setUploadingId(null)
  }

  const handleSave = async (formData: any) => {
    setSaving(true)
    if (editingItem?.id) {
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeTab, id: editingItem.id, data: formData }),
      })
    } else {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: activeTab, data: formData }),
      })
    }
    setSaving(false)
    setShowForm(false)
    setEditingItem(null)
    loadData()
  }

  const currentItems = data ? data[activeTab] : []

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
        <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1.5" />
          추가
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentItems.map((item: any) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${
              item.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
            }`}
          >
            {/* Image */}
            <label className="flex-shrink-0 cursor-pointer relative">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400 text-center leading-tight px-1">
                  이미지 없음
                </div>
              )}
              {uploadingId === item.id && (
                <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(activeTab, item.id, file)
                }}
              />
            </label>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name}</p>
              {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
              {item.material_type && (
                <p className="text-xs text-gray-500">
                  {item.material_type === 'plastic' ? '듀로플라스틱' : '메탈'}
                </p>
              )}
              {item.price !== undefined && (
                <p className="text-xs text-gray-600 font-medium">{formatPrice(item.price)}</p>
              )}
              {item.max_gang && (
                <p className="text-xs text-amber-600">{item.max_gang}구 전용</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleToggleActive(activeTab, item)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                title={item.is_active ? '비활성화' : '활성화'}
              >
                {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setEditingItem(item); setShowForm(true) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(activeTab, item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <ProductFormModal
          table={activeTab}
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

function ProductFormModal({
  table,
  item,
  onSave,
  onClose,
  saving,
}: {
  table: ActiveTab
  item: any
  onSave: (data: any) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    price: item?.price ?? 0,
    category: item?.category || '스위치류',
    material_type: item?.material_type || 'plastic',
    max_gang: item?.max_gang ?? '',
    sort_order: item?.sort_order ?? 0,
  })

  const handleSubmit = () => {
    const data: any = { name: form.name, price: Number(form.price), sort_order: Number(form.sort_order) }
    if (table === 'modules') {
      data.category = form.category
      data.max_gang = form.max_gang ? Number(form.max_gang) : null
    }
    if (table === 'frame_colors') {
      data.material_type = form.material_type
    }
    onSave(data)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">{item ? '수정' : '추가'}</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">가격 (원)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm"
            />
          </div>

          {table === 'modules' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">카테고리</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm"
                >
                  {['스위치류', '콘센트류', '기타류'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">구수 제한 (빈칸 = 제한 없음)</label>
                <input
                  type="number"
                  placeholder="예: 1 (1구 전용)"
                  value={form.max_gang}
                  onChange={(e) => setForm((f) => ({ ...f, max_gang: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm"
                />
              </div>
            </>
          )}

          {table === 'frame_colors' && (
            <div>
              <label className="text-sm font-medium text-gray-700">재질</label>
              <select
                value={form.material_type}
                onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm"
              >
                <option value="plastic">듀로플라스틱</option>
                <option value="metal">메탈</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} loading={saving} fullWidth>저장</Button>
          <Button onClick={onClose} variant="secondary" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}
