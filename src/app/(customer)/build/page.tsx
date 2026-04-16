"use client";

import { useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/store/cartStore";
import { FrameColor, EmbeddedBox, CartItem, ModulePart, ModuleOption, ModuleCategory, Module } from "@/types";
import { cn, formatPrice, getFrameColorPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ModuleSelector from "@/components/builder/ModuleSelector";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { getStorefrontData } from "@/lib/storefront-data";

const FRAME_NAMES = new Set(['1구', '2구', '3구', '4구', '5구'])
const IDLE_PREFETCH_LIMIT = 24;

function scheduleIdle(task: () => void) {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    task();
  };

  const w = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout: 1200 });
    return () => {
      cancelled = true;
      w.cancelIdleCallback?.(id);
    };
  }

  const timeoutId = window.setTimeout(run, 250);
  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
  };
}

interface ProductData {
  frame_colors: FrameColor[];
  embedded_boxes: EmbeddedBox[];
  modules: Module[];
}

export default function BuildPage() {
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<ProductData | null>(null);
  const [allParts, setAllParts] = useState<ModulePart[]>([]);
  const [showPrice, setShowPrice] = useState(false);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [gangCount, setGangCount] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<FrameColor | null>(null);
  const [selectedModules, setSelectedModules] = useState<(ModuleOption | null)[]>([null]);
  const [selectedBox, setSelectedBox] = useState<EmbeddedBox | null>(null);
  const [boxQuantity, setBoxQuantity] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Module selector sheet
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number>(0);

  // Color tab
  const [colorTab, setColorTab] = useState<"plastic" | "metal">("plastic");

  const [addedFeedback, setAddedFeedback] = useState(false);
  const [boxSectionOpen, setBoxSectionOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { products: productsData } = await getStorefrontData();
      // ProductData only needs frame_colors and embedded_boxes now
      setProducts({
        frame_colors: productsData.frame_colors,
        embedded_boxes: productsData.embedded_boxes,
        modules: productsData.modules,
      });
      setShowPrice(false);
      if (productsData.frame_colors?.length) {
        setSelectedColor(productsData.frame_colors[0]);
      }
      setLoading(false);

      // module_parts — 모듈 목록 + 커버 이미지 소스
      fetch('/api/module-parts')
        .then((r) => r.json())
        .then(({ parts }) => { if (parts) setAllParts(parts); })
        .catch(() => {});
    }
    load();
  }, []);

  // module_name||color_name → 커버 품목코드
  const coverCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allParts) {
      if (p.part_name.includes('커버')) {
        map[`${p.module_name}||${p.color_name}`] = p.part_code;
      }
    }
    return map;
  }, [allParts]);

  const frameImageByColorGang = useMemo(() => {
    const map: Record<string, string> = {};
    for (const part of allParts) {
      if (!FRAME_NAMES.has(part.module_name)) continue;
      if (!part.image_url) continue;
      map[`${part.module_name}||${part.color_name}`] = part.image_url;
    }
    return map;
  }, [allParts]);

  // 현재 색상의 모듈 목록 (module_parts에서 고유 module_name 추출)
  const availableModules = useMemo<ModuleOption[]>(() => {
    if (!selectedColor) return [];
    const seen = new Set<string>();
    const result: ModuleOption[] = [];
    for (const p of allParts) {
      // 재질 컬럼이 있으면 재질로, 없으면 색상명으로 매칭
      const matches = p.material_type
        ? p.material_type === selectedColor.material_type
        : p.color_name === selectedColor.name;
      if (!matches) continue;
      if (FRAME_NAMES.has(p.module_name)) continue;
      if (seen.has(p.module_name)) continue;
      const totalPrice = allParts
        .filter((mp) => mp.module_name === p.module_name && mp.color_name === p.color_name)
        .reduce((s, mp) => s + mp.price, 0);
      seen.add(p.module_name);
      result.push({ name: p.module_name, category: (p.category as ModuleCategory) ?? '기타류', price: totalPrice });
    }
    return result;
  }, [allParts, selectedColor]);

  const moduleImageByKey = useMemo(() => {
    const map: Record<string, string> = {};
    if (!products) return map;
    const colorNameById = new Map(products.frame_colors.map((c) => [c.id, c.name]));
    for (const mod of products.modules) {
      const colorName = colorNameById.get(mod.frame_color_id);
      if (!colorName || !mod.image_url) continue;
      map[`${mod.name}||${colorName}`] = mod.image_url;
    }
    return map;
  }, [products]);

  useEffect(() => {
    if (!selectedColor) return;

    const cancel = scheduleIdle(() => {
      const urls = new Set<string>();

      // 프레임 미리보기(1~5구)
      for (let n = 1; n <= 5; n += 1) {
        urls.add(
          frameImageByColorGang[`${n}구||${selectedColor.name}`] ||
            `/frames/${selectedColor.name}/${n}구.webp`,
        );
      }

      // 모듈 선택 시트에서 자주 쓰는 상위 모듈 이미지
      for (const mod of availableModules.slice(0, IDLE_PREFETCH_LIMIT)) {
        const coverCode =
          coverCodeMap[`${mod.name}||${selectedColor.name}`] ??
          mod.name.replaceAll("/", ":");
        urls.add(`/modules/${selectedColor.name}/${coverCode}.webp`);
      }

      // 매립박스 토글 오픈 대비
      for (const box of products?.embedded_boxes ?? []) {
        if (box.is_active && box.image_url) urls.add(box.image_url);
      }

      urls.forEach((src) => {
        const img = new window.Image();
        img.src = src;
      });
    });

    return cancel;
  }, [
    availableModules,
    coverCodeMap,
    frameImageByColorGang,
    products?.embedded_boxes,
    selectedColor,
  ]);

  const handleGangCountChange = (count: number) => {
    setGangCount(count);
    setSelectedModules(Array(count).fill(null));
  };

  const openModuleSelector = (slotIndex: number) => {
    setEditingSlot(slotIndex);
    setSelectorOpen(true);
  };

  const handleModuleSelect = (module: ModuleOption) => {
    const newModules = [...selectedModules];
    newModules[editingSlot] = module;
    setSelectedModules(newModules);
    setSelectorOpen(false);
  };

  const allModulesSelected = selectedModules.every((m) => m !== null);
  const canAddToCart = selectedColor !== null && allModulesSelected;
  const selectedBoxTotal =
    selectedBox && boxQuantity > 0 ? selectedBox.price * boxQuantity : 0;
  const comboTotalPrice =
    selectedColor && canAddToCart
      ? (getFrameColorPrice(selectedColor, gangCount) +
          selectedModules.reduce((sum, module) => sum + (module?.price ?? 0), 0)) *
          quantity +
        selectedBoxTotal
      : 0;

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedColor) return;

    const colorName = selectedColor.name;

    // 담기 시점에 이미지 URL 결정 (카트 페이지에서 API 재호출 불필요)
    const imageCodeMap: Record<string, string> = {};
    for (const p of allParts) {
      if (p.part_name.includes('커버') || p.part_name.includes('프레임')) {
        imageCodeMap[`${p.module_name}||${p.color_name}`] = p.part_code;
      }
    }

    const framePartCode = imageCodeMap[`${gangCount}구||${colorName}`] ?? `${gangCount}구`;
    const frameImageUrl = `/modules/${colorName}/${framePartCode}.webp`;

    const cartItem: CartItem = {
      id: uuidv4(),
      item_type: "set",
      gang_count: gangCount,
      frame_color: selectedColor,
      image_url: frameImageUrl,
      modules: selectedModules.map((m, i) => {
        const coverCode = imageCodeMap[`${m!.name}||${colorName}`] ?? m!.name.replaceAll('/', ':');
        const moduleImageUrl = moduleImageByKey[`${m!.name}||${colorName}`] || `/modules/${colorName}/${coverCode}.webp`;
        return {
          slot: i + 1,
          module_id: m!.name,
          module_name: m!.name,
          module_price: m!.price,
          image_url: moduleImageUrl,
        };
      }),
      embedded_box: selectedBox,
      embedded_box_quantity: selectedBox ? boxQuantity : 0,
      quantity,
    };

    addItem(cartItem);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);

    setSelectedModules(Array(gangCount).fill(null));
    setSelectedBox(null);
    setBoxQuantity(0);
    setQuantity(1);
  };

  const filteredColors =
    products?.frame_colors?.filter(
      (c) => c.material_type === colorTab && c.is_active,
    ) ?? [];

  useEffect(() => {
    if (!products?.frame_colors?.length) return;

    if (colorTab === "metal") {
      const stainless = products.frame_colors.find(
        (c) => c.material_type === "metal" && c.name === "스테인레스스틸" && c.is_active,
      );
      if (stainless) {
        setSelectedColor(stainless);
        setSelectedModules((prev) => Array(prev.length).fill(null));
        return;
      }
    }

    const firstOfTab = products.frame_colors.find(
      (c) => c.material_type === colorTab && c.is_active,
    );
    if (firstOfTab) {
      setSelectedColor(firstOfTab);
      setSelectedModules((prev) => Array(prev.length).fill(null));
    }
  }, [colorTab, products]);

  const activeBoxes = products?.embedded_boxes.filter((box) => box.is_active) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <section className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-900">세트견적 사용방법</p>
        <ol className="mt-2 text-sm text-gray-700 list-decimal list-inside space-y-1">
          <li>색상 → 프레임 구수 → 모듈 순서로 선택해주세요.</li>
          <li>선택 후 수량을 설정하고 견적 바구니에 담아주세요.</li>
          <li>매립박스는 필요시 선택 후 수량을 입력해주세요.</li>
        </ol>
      </section>

      <p className="text-sm text-blue-400 text-center">
        필요한 제품을 모두 담은 뒤,
        <br />
        견적 바구니에서 한 번에 확인해주세요.
      </p>

      {/* Step 1: 색상 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 · 프레임 및 모듈 색상
        </h2>
        <div className="flex gap-2 mb-3">
          {(["plastic", "metal"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setColorTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                colorTab === tab
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {tab === "plastic" ? "듀로플라스틱" : "메탈"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {filteredColors.map((color) => (
            <button
              key={color.id}
              onClick={() => {
                setSelectedColor(color);
                setSelectedModules(Array(gangCount).fill(null));
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                selectedColor?.id === color.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              <Image
                src={color.image_url || `/colors/${color.name}.webp`}
                alt={color.name}
                width={60}
                height={60}
                unoptimized
                loading="lazy"
                className="object-cover w-14 h-14"
              />
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: 프레임 구수 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 2 · 프레임 구수 선택
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleGangCountChange(n)}
              className={cn(
                "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                gangCount === n
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400",
              )}
            >
              {n}구
            </button>
          ))}
        </div>

        <div className="mt-3 bg-white border border-gray-100 rounded-2xl p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            {gangCount}구 프레임 미리보기
          </p>
          <div className="w-full bg-gray-50 border border-gray-200 overflow-hidden">
            <Image
              src={
                frameImageByColorGang[`${gangCount}구||${selectedColor?.name}`] ||
                `/frames/${selectedColor?.name}/${gangCount}구.webp`
              }
              alt={`${selectedColor?.name} ${gangCount}구 프레임`}
              width={1200}
              height={900}
              unoptimized
              loading="eager"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* Step 3: 모듈 선택 (Visual Builder) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 3 · 모듈(인서트+커버) 선택 ({gangCount}구)
        </h2>
        <div className="flex gap-2">
          {Array.from({ length: gangCount }).map((_, i) => {
            const mod = selectedModules[i];
            return (
              <button
                key={i}
                onClick={() => openModuleSelector(i)}
                className={cn(
                  "flex-1 min-h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all",
                  mod
                    ? "border-gray-900 bg-gray-50"
                    : "border-dashed border-gray-300 bg-white hover:border-gray-500",
                )}
              >
                {mod ? (
                  <>
                    <Image
                      src={
                        moduleImageByKey[`${mod.name}||${selectedColor?.name}`] ||
                        `/modules/${selectedColor?.name}/${coverCodeMap[`${mod.name}||${selectedColor?.name}`] ?? mod.name.replaceAll('/', ':')}.webp`
                      }
                      alt={mod.name}
                      width={48}
                      height={48}
                      unoptimized
                      loading="lazy"
                      className="object-cover w-10 h-10"
                    />
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
            );
          })}
        </div>
        {!allModulesSelected && (
          <p className="text-xs text-amber-600 mt-2">
            {selectedModules.filter((m) => m === null).length}개 구의 모듈을
            선택해주세요.
          </p>
        )}
      </section>

      {/* 추가상품: 매립박스 */}
      <section>
        <button
          onClick={() => setBoxSectionOpen((v) => !v)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-700">
            추가상품 · 매립박스
          </span>
          {boxSectionOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {boxSectionOpen && (
          <div className="mt-3">
            <p className="text-gray-400 text-xs mb-3">
              (미사용시 발생하는 사고에 대해 책임지지 않습니다.)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {activeBoxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => {
                    setSelectedBox(box);
                    if (boxQuantity < 1) setBoxQuantity(1);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    selectedBox?.id === box.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300",
                  )}
                >
                  {box.image_url ? (
                    <Image
                      src={box.image_url}
                      alt={box.name}
                      width={48}
                      height={48}
                      className="object-cover w-10 h-10"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100" />
                  )}
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {box.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">매립박스 수량</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!selectedBox) return;
                    setBoxQuantity((q) => Math.max(0, q - 1));
                  }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-gray-900">
                  {boxQuantity}
                </span>
                <button
                  onClick={() => {
                    if (!selectedBox) return;
                    setBoxQuantity((q) => q + 1);
                  }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>
            {selectedBox && boxQuantity > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                추가상품: {selectedBox.name} × {boxQuantity}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 수량 & 담기 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            현재 세트 구성
          </p>
          <p className="text-sm text-gray-700">
            색상:{" "}
            <span className="font-medium text-gray-900">
              {selectedColor?.name ?? "미선택"}
            </span>
          </p>
          <p className="text-sm text-gray-700">
            구수:{" "}
            <span className="font-medium text-gray-900">{gangCount}구</span>
          </p>
          <p className="text-sm text-gray-700">
            모듈:{" "}
            <span className="font-medium text-gray-900">
              {selectedModules.some((m) => m)
                ? selectedModules
                    .filter((m): m is ModuleOption => Boolean(m))
                    .map((m) => m.name)
                    .join(", ")
                : "미선택"}
            </span>
          </p>
          {selectedBox && boxQuantity > 0 && (
            <p className="text-sm text-gray-700">
              매립박스:{" "}
              <span className="font-medium text-gray-900">
                {selectedBox.name} × {boxQuantity}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">수량</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200"
            >
              +
            </button>
          </div>
        </div>

        {showPrice && canAddToCart && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">조합 금액</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(comboTotalPrice)}
            </span>
          </div>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          fullWidth
          size="lg"
          className={cn(addedFeedback && "bg-green-600 hover:bg-green-600")}
        >
          {addedFeedback ? "✓ 견적 바구니에 담겼어요!" : "견적 바구니에 담기"}
        </Button>
      </div>

      {/* Module Selector Sheet */}
      <ModuleSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        modules={availableModules}
        onSelect={handleModuleSelect}
        showPrice={false}
        slotIndex={editingSlot}
        colorName={selectedColor?.name ?? ''}
        coverCodeMap={coverCodeMap}
        moduleImageMap={moduleImageByKey}
      />
    </div>
  );
}
