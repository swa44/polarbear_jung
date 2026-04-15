'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { FrameColor, Module, EmbeddedBox, MaterialType, ModuleCategory, ModulePart } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import Button from '@/components/ui/Button'
import { Plus, Pencil, Trash2, Eye, EyeOff, ImageOff } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ProductData {
  frame_colors: FrameColor[]
  modules: Module[]
  embedded_boxes: EmbeddedBox[]
  module_parts: ModulePart[]
}

type ActiveTab = 'frame_colors' | 'embedded_boxes'

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'frame_colors', label: '프레임 색상 / 모듈' },
  { key: 'embedded_boxes', label: '매립박스' },
]

export default function AdminProductsPage() {
  const [data, setData] = useState<ProductData | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('frame_colors')
  const [loading, setLoading] = useState(true)
  const [colorMaterialTab, setColorMaterialTab] = useState<'plastic' | 'metal'>('plastic')
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null)

  // Form states
  const [showColorForm, setShowColorForm] = useState(false)
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [showBoxForm, setShowBoxForm] = useState(false)
  const [editingColor, setEditingColor] = useState<FrameColor | null>(null)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [editingBox, setEditingBox] = useState<EmbeddedBox | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [moduleCsvUploading, setModuleCsvUploading] = useState(false)
  const [moduleCsvMessage, setModuleCsvMessage] = useState<string | null>(null)
  const [moduleCsvError, setModuleCsvError] = useState<string | null>(null)
  const moduleCsvInputRef = useRef<HTMLInputElement | null>(null)
  const [showFramePartForm, setShowFramePartForm] = useState(false)
  const [editingFramePart, setEditingFramePart] = useState<ModulePart | null>(null)

  const FRAME_NAMES = new Set(['1구', '2구', '3구', '4구', '5구'])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const res = await fetch('/api/admin/products')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  const handleToggleActive = async (table: string, item: any) => {
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id: item.id, data: { is_active: !item.is_active } }),
    })
    loadData()
  }

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    })
    loadData()
  }

  const handleImageUpload = async (table: string, id: string, file: File) => {
    setUploadingId(id)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${table}/${id}.${ext}`
    const { data: uploadData, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
      const bustUrl = `${urlData.publicUrl}?v=${Date.now()}`
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, data: { image_url: bustUrl } }),
      })
      loadData()
    }
    setUploadingId(null)
  }

  const handleImageRemove = async (table: string, id: string) => {
    setUploadingId(id)
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, data: { image_url: null } }),
    })
    await loadData()
    setUploadingId(null)
  }

  const handleSaveColor = async (formData: any) => {
    setSaving(true)
    if (editingColor?.id) {
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'frame_colors', id: editingColor.id, data: formData }),
      })
    } else {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'frame_colors', data: formData }),
      })
    }
    setSaving(false)
    setShowColorForm(false)
    setEditingColor(null)
    loadData()
  }

  const handleSaveModule = async (formData: any) => {
    if (!selectedColorId) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/products', {
        method: editingModule?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingModule?.id
            ? { table: 'modules', id: editingModule.id, data: formData }
            : { table: 'modules', data: { ...formData, frame_color_id: selectedColorId } }
        ),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`)
      setShowModuleForm(false)
      setEditingModule(null)
      loadData()
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadModuleCsvTemplate = () => {
    const csv = [
      'name,category,price,max_gang,sort_order,is_active',
      '1구 스위치,스위치류,1200,1,1,true',
      '2구 콘센트,콘센트류,2500,,2,true',
      '기타 모듈,기타류,900,,3,false',
    ].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modules_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleModuleCsvUpload = async (file: File) => {
    if (!selectedColorId) return

    setModuleCsvUploading(true)
    setModuleCsvMessage(null)
    setModuleCsvError(null)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('frame_color_id', selectedColorId)

      const res = await fetch('/api/admin/products/modules-csv', {
        method: 'POST',
        body,
      })
      const result = await res.json()
      if (!res.ok) {
        const detail = Array.isArray(result.details) ? `\n${result.details.join('\n')}` : ''
        throw new Error((result.error || 'CSV 반영에 실패했습니다.') + detail)
      }

      setModuleCsvMessage(result.message || 'CSV 반영이 완료되었습니다.')
      await loadData()
    } catch (e: any) {
      setModuleCsvError(e.message || 'CSV 업로드에 실패했습니다.')
    } finally {
      setModuleCsvUploading(false)
      if (moduleCsvInputRef.current) moduleCsvInputRef.current.value = ''
    }
  }

  const handleSaveFramePart = async (formData: any) => {
    if (!selectedColor) return
    const payload = { ...formData, color_name: selectedColor.name }

    setSaving(true)
    if (editingFramePart?.id) {
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'module_parts', id: editingFramePart.id, data: payload }),
      })
    } else {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'module_parts', data: { ...payload, is_active: true } }),
      })
    }
    setSaving(false)
    setShowFramePartForm(false)
    setEditingFramePart(null)
    loadData()
  }

  const handleSaveBox = async (formData: any) => {
    setSaving(true)
    if (editingBox?.id) {
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'embedded_boxes', id: editingBox.id, data: formData }),
      })
    } else {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'embedded_boxes', data: formData }),
      })
    }
    setSaving(false)
    setShowBoxForm(false)
    setEditingBox(null)
    loadData()
  }

  const selectedColor = data?.frame_colors.find((c) => c.id === selectedColorId) ?? null
  const filteredColors = data?.frame_colors.filter((c) => c.material_type === colorMaterialTab) ?? []
  const colorModules = data?.modules.filter((m) => m.frame_color_id === selectedColorId) ?? []
  const colorFrameParts = (data?.module_parts ?? [])
    .filter((p) => FRAME_NAMES.has(p.module_name) && selectedColor && p.color_name === selectedColor.name)
    .sort((a, b) => parseInt(a.module_name) - parseInt(b.module_name))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
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

      {/* ── 프레임 색상 / 모듈 탭 ── */}
      {activeTab === 'frame_colors' && (
        <div className="flex flex-col gap-6">
          {/* 프레임 색상 섹션 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">프레임 색상</h2>
              <Button size="sm" onClick={() => { setEditingColor(null); setShowColorForm(true) }}>
                <Plus className="w-4 h-4 mr-1" />색상 추가
              </Button>
            </div>

            {/* Material tabs */}
            <div className="flex gap-2 mb-3">
              {(['plastic', 'metal'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setColorMaterialTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    colorMaterialTab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'plastic' ? '듀로플라스틱' : '메탈'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredColors.map((color) => (
                <div
                  key={color.id}
                  onClick={() => setSelectedColorId(selectedColorId === color.id ? null : color.id)}
                  className={`bg-white rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                    selectedColorId === color.id
                      ? 'border-gray-900 bg-gray-50'
                      : color.is_active
                      ? 'border-gray-100 hover:border-gray-300'
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Image */}
                    <label
                      className="flex-shrink-0 cursor-pointer relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {color.image_url ? (
                        <Image
                          src={color.image_url}
                          alt={color.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          이미지
                        </div>
                      )}
                      {uploadingId === color.id && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('frame_colors', color.id, file)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{color.name}</p>
                      {(color.price_1 ?? color.price) > 0 && (
                        <p className="text-xs text-gray-500">1구 {formatPrice(color.price_1 ?? color.price)}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleImageRemove('frame_colors', color.id)}
                        disabled={!color.image_url}
                        title="이미지 삭제"
                        className="p-1 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ImageOff className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive('frame_colors', color)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        {color.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setEditingColor(color); setShowColorForm(true) }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('frame_colors', color.id)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {selectedColorId === color.id && (
                    <p className="text-xs text-gray-500 mt-2 text-center">▼ 아래에서 모듈 관리</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 프레임 섹션 - 색상 선택 시 표시 */}
          {selectedColor && (
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">
                  <span className="text-gray-500 font-normal">색상: </span>
                  {selectedColor.name}의 프레임
                  <span className="ml-2 text-sm text-gray-400 font-normal">({colorFrameParts.length}개)</span>
                </h2>
                <Button size="sm" onClick={() => { setEditingFramePart(null); setShowFramePartForm(true) }}>
                  <Plus className="w-4 h-4 mr-1" />프레임 추가
                </Button>
              </div>
              {colorFrameParts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  BOM CSV를 업로드하거나 직접 추가하세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {colorFrameParts.map((p) => (
                    <div
                      key={p.id}
                      className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                        p.is_active !== false ? 'border-gray-100' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <label className="flex-shrink-0 cursor-pointer relative">
                        {p.image_url ? (
                          <Image
                            src={p.image_url}
                            alt={`${p.module_name} 프레임`}
                            width={72}
                            height={72}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] text-gray-400 text-center px-1">
                            이미지 없음
                          </div>
                        )}
                        {uploadingId === p.id && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                            <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('module_parts', p.id, file)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{p.module_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.part_code}</p>
                        <p className="text-xs text-gray-500 truncate">{p.part_name}</p>
                        {p.price > 0 && (
                          <p className="text-xs font-medium text-gray-700 mt-1">{formatPrice(p.price)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleImageRemove('module_parts', p.id)}
                          disabled={!p.image_url}
                          className="p-1 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-40 disabled:hover:bg-transparent"
                          title="이미지 삭제"
                        >
                          <ImageOff className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive('module_parts', p)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                          title={p.is_active !== false ? '비노출' : '노출'}
                        >
                          {p.is_active !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => { setEditingFramePart(p); setShowFramePartForm(true) }}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('module_parts', p.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 모듈 섹션 - 색상 선택 시 표시 */}
          {selectedColor && (
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">
                  <span className="text-gray-500 font-normal">색상: </span>
                  {selectedColor.name}의 모듈
                  <span className="ml-2 text-sm text-gray-400 font-normal">({colorModules.length}개)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={handleDownloadModuleCsvTemplate}>
                    템플릿 다운로드
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={moduleCsvUploading}
                    onClick={() => moduleCsvInputRef.current?.click()}
                  >
                    CSV 추가
                  </Button>
                  <Button size="sm" onClick={() => { setEditingModule(null); setShowModuleForm(true) }}>
                    <Plus className="w-4 h-4 mr-1" />모듈 추가
                  </Button>
                </div>
              </div>

              <input
                ref={moduleCsvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleModuleCsvUpload(file)
                }}
              />
              {moduleCsvMessage && (
                <p className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {moduleCsvMessage}
                </p>
              )}
              {moduleCsvError && (
                <pre className="mb-3 whitespace-pre-wrap text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {moduleCsvError}
                </pre>
              )}

              {colorModules.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  이 색상에 등록된 모듈이 없습니다.<br />모듈 추가 버튼으로 추가하세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {colorModules.map((module) => (
                    <div
                      key={module.id}
                      className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${
                        module.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      {/* Image */}
                      <label className="flex-shrink-0 cursor-pointer relative">
                        {module.image_url ? (
                          <Image
                            src={module.image_url}
                            alt={module.name}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 flex items-center justify-center text-xs text-gray-400 text-center px-1">
                            이미지 없음
                          </div>
                        )}
                        {uploadingId === module.id && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('modules', module.id, file)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{module.name}</p>
                        <p className="text-xs text-gray-500">{module.category}</p>
                        {module.price > 0 && (
                          <p className="text-xs text-gray-600 font-medium">{formatPrice(module.price)}</p>
                        )}
                        {module.max_gang && (
                          <p className="text-xs text-amber-600">{module.max_gang}구 전용</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleImageRemove('modules', module.id)}
                          disabled={!module.image_url}
                          title="이미지 삭제"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <ImageOff className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive('modules', module)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          {module.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setEditingModule(module); setShowModuleForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('modules', module.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {!selectedColorId && (
            <p className="text-sm text-gray-400 text-center py-4">
              색상 카드를 클릭하면 해당 색상의 모듈을 관리할 수 있습니다.
            </p>
          )}
        </div>
      )}

      {/* ── 매립박스 탭 ── */}
      {activeTab === 'embedded_boxes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">매립박스</h2>
            <Button size="sm" onClick={() => { setEditingBox(null); setShowBoxForm(true) }}>
              <Plus className="w-4 h-4 mr-1" />추가
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.embedded_boxes ?? []).map((box) => (
              <div
                key={box.id}
                className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${
                  box.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                }`}
              >
                <label className="flex-shrink-0 cursor-pointer relative">
                  {box.image_url ? (
                    <Image
                      src={box.image_url}
                      alt={box.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 flex items-center justify-center text-xs text-gray-400 text-center px-1">
                      이미지 없음
                    </div>
                  )}
                  {uploadingId === box.id && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload('embedded_boxes', box.id, file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{box.name}</p>
                  {box.price > 0 && (
                    <p className="text-xs text-gray-600 font-medium">{formatPrice(box.price)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleImageRemove('embedded_boxes', box.id)}
                    disabled={!box.image_url}
                    title="이미지 삭제"
                    className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ImageOff className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive('embedded_boxes', box)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    {box.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingBox(box); setShowBoxForm(true) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('embedded_boxes', box.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 프레임 색상 폼 모달 ── */}
      {showColorForm && (
        <ColorFormModal
          item={editingColor}
          onSave={handleSaveColor}
          onClose={() => { setShowColorForm(false); setEditingColor(null) }}
          saving={saving}
        />
      )}

      {/* ── 프레임 파트 폼 모달 ── */}
      {showFramePartForm && selectedColor && (
        <FramePartFormModal
          item={editingFramePart}
          colorName={selectedColor.name}
          onSave={handleSaveFramePart}
          onClose={() => { setShowFramePartForm(false); setEditingFramePart(null) }}
          saving={saving}
        />
      )}

      {/* ── 모듈 폼 모달 ── */}
      {showModuleForm && selectedColor && (
        <ModuleFormModal
          item={editingModule}
          colorName={selectedColor.name}
          onSave={handleSaveModule}
          onClose={() => { setShowModuleForm(false); setEditingModule(null); setSaveError(null) }}
          saving={saving}
          error={saveError}
        />
      )}

      {/* ── 매립박스 폼 모달 ── */}
      {showBoxForm && (
        <BoxFormModal
          item={editingBox}
          onSave={handleSaveBox}
          onClose={() => { setShowBoxForm(false); setEditingBox(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

/* ── Color Form Modal ── */
function ColorFormModal({
  item, onSave, onClose, saving,
}: { item: FrameColor | null; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  useLockBodyScroll(true)
  const [form, setForm] = useState({
    name: item?.name || '',
    material_type: item?.material_type || 'plastic',
    sort_order: item?.sort_order ?? 0,
  })
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">프레임 색상 {item ? '수정' : '추가'}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">재질</label>
            <select value={form.material_type}
              onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value as MaterialType }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm">
              <option value="plastic">듀로플라스틱</option>
              <option value="metal">메탈</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">가격은 BOM CSV 업로드 시 자동 반영됩니다.</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onSave({
              name: form.name,
              material_type: form.material_type,
              sort_order: Number(form.sort_order),
            })}
            loading={saving}
            fullWidth
          >
            저장
          </Button>
          <Button onClick={onClose} variant="secondary" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}

/* ── Module Form Modal ── */
function ModuleFormModal({
  item, colorName, onSave, onClose, saving, error,
}: { item: Module | null; colorName: string; onSave: (d: any) => void; onClose: () => void; saving: boolean; error?: string | null }) {
  useLockBodyScroll(true)
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '스위치류',
    price: item?.price ?? 0,
    max_gang: item?.max_gang ?? '',
    sort_order: item?.sort_order ?? 0,
  })
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">모듈 {item ? '수정' : '추가'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">색상: {colorName}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">카테고리</label>
            <select value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ModuleCategory }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm">
              {['스위치류', '콘센트류', '기타류'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">가격 (원)</label>
            <input type="number" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value as any }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">구수 제한 (빈칸 = 제한 없음)</label>
            <input type="number" placeholder="예: 1 (1구 전용)" value={form.max_gang}
              onChange={(e) => setForm((f) => ({ ...f, max_gang: e.target.value as any }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave({ name: form.name, category: form.category, price: Number(form.price), max_gang: form.max_gang ? Number(form.max_gang) : null, sort_order: Number(form.sort_order) })} loading={saving} fullWidth>저장</Button>
          <Button onClick={onClose} variant="secondary" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}

/* ── Frame Part Form Modal ── */
function FramePartFormModal({
  item, colorName, onSave, onClose, saving,
}: { item: ModulePart | null; colorName: string; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  useLockBodyScroll(true)
  const [form, setForm] = useState({
    module_name: item?.module_name || '',
    part_code: item?.part_code || '',
    part_name: item?.part_name || '',
    price: item?.price ?? 0,
  })
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">프레임 {item ? '수정' : '추가'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">색상: {colorName}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">상품명 (BOM 상품명과 일치)</label>
            <input type="text" value={form.module_name} placeholder="예: 1구"
              onChange={(e) => setForm((f) => ({ ...f, module_name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">품목코드</label>
            <input type="text" value={form.part_code}
              onChange={(e) => setForm((f) => ({ ...f, part_code: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">제품명</label>
            <input type="text" value={form.part_name}
              onChange={(e) => setForm((f) => ({ ...f, part_name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">가격 (원)</label>
            <input type="number" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value as any }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onSave({
              module_name: form.module_name,
              part_code: form.part_code,
              part_name: form.part_name,
              price: Number(form.price),
            })}
            loading={saving}
            fullWidth
          >
            저장
          </Button>
          <Button onClick={onClose} variant="secondary" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}

/* ── Box Form Modal ── */
function BoxFormModal({
  item, onSave, onClose, saving,
}: { item: EmbeddedBox | null; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  useLockBodyScroll(true)
  const [form, setForm] = useState({
    name: item?.name || '',
    price: item?.price ?? 0,
    sort_order: item?.sort_order ?? 0,
  })
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">매립박스 {item ? '수정' : '추가'}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">가격 (원)</label>
            <input type="number" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value as any }))}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave({ name: form.name, price: Number(form.price), sort_order: Number(form.sort_order) })} loading={saving} fullWidth>저장</Button>
          <Button onClick={onClose} variant="secondary" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}
