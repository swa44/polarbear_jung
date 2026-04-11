"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  FrameColor,
  Module,
  EmbeddedBox,
  ModuleSlotSelection,
  CartItem,
} from "@/types";
import { cn, formatPrice, getFrameColorPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ModuleSelector from "@/components/builder/ModuleSelector";
import { Plus, ChevronDown } from "lucide-react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

interface ProductData {
  frame_colors: FrameColor[];
  modules: Module[];
  embedded_boxes: EmbeddedBox[];
}

export default function BuildPage() {
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<ProductData | null>(null);
  const [showPrice, setShowPrice] = useState(false);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [gangCount, setGangCount] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<FrameColor | null>(null);
  const [selectedModules, setSelectedModules] = useState<(Module | null)[]>([
    null,
  ]);
  const [selectedBox, setSelectedBox] = useState<EmbeddedBox | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Module selector sheet
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number>(0);

  // Color tab
  const [colorTab, setColorTab] = useState<"plastic" | "metal">("plastic");

  const [addedFeedback, setAddedFeedback] = useState(false);
  const [framePreviewFailed, setFramePreviewFailed] = useState(false);
  const [boxListOpen, setBoxListOpen] = useState(false);
  const [boxImagesLoading, setBoxImagesLoading] = useState(false);
  const [boxImagesReady, setBoxImagesReady] = useState(false);

  useEffect(() => {
    async function load() {
      const [productsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/settings"),
      ]);
      const productsData = await productsRes.json();
      const settingsData = await settingsRes.json();

      setProducts(productsData);
      setShowPrice(settingsData.show_price === "true");
      if (productsData.frame_colors?.length) {
        setSelectedColor(productsData.frame_colors[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const imageUrls = [1, 2, 3, 4, 5].map((n) => `/frames/gang-${n}.png`);
    const preloaded = imageUrls.map((src) => {
      const img = new window.Image();
      img.src = src;
      return img;
    });

    return () => {
      preloaded.forEach((img) => {
        img.src = "";
      });
    };
  }, []);

  useEffect(() => {
    if (!products?.frame_colors?.length) return;

    const imageUrls = products.frame_colors
      .filter((color) => color.is_active && Boolean(color.image_url))
      .map((color) => color.image_url!)
      .filter((src, index, arr) => arr.indexOf(src) === index);

    const preloaded = imageUrls.map((src) => {
      const img = new window.Image();
      img.src = src;
      return img;
    });

    return () => {
      preloaded.forEach((img) => {
        img.src = "";
      });
    };
  }, [products]);

  useEffect(() => {
    setFramePreviewFailed(false);
  }, [gangCount]);

  const handleGangCountChange = (count: number) => {
    setGangCount(count);
    setSelectedModules(Array(count).fill(null));
  };

  const openModuleSelector = (slotIndex: number) => {
    setEditingSlot(slotIndex);
    setSelectorOpen(true);
  };

  const handleModuleSelect = (module: Module) => {
    const newModules = [...selectedModules];
    newModules[editingSlot] = module;
    setSelectedModules(newModules);
    setSelectorOpen(false);
  };

  const allModulesSelected = selectedModules.every((m) => m !== null);
  const canAddToCart = selectedColor !== null && allModulesSelected;

  const getItemPrice = () => {
    if (!selectedColor) return 0;
    const framePrice = getFrameColorPrice(selectedColor, gangCount);
    const modulePrice = selectedModules.reduce(
      (s, m) => s + (m?.price ?? 0),
      0,
    );
    const boxPrice = selectedBox?.price ?? 0;
    return framePrice + modulePrice + boxPrice;
  };

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedColor) return;

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
    };

    addItem(cartItem);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);

    // Reset
    setSelectedModules(Array(gangCount).fill(null));
    setSelectedBox(null);
    setQuantity(1);
  };

  const filteredColors =
    products?.frame_colors.filter(
      (c) => c.material_type === colorTab && c.is_active,
    ) || [];

  useEffect(() => {
    if (!products?.frame_colors?.length) return;

    if (colorTab === "metal") {
      const stainless = products.frame_colors.find(
        (c) =>
          c.material_type === "metal" &&
          c.name === "스테인레스스틸" &&
          c.is_active,
      );
      if (stainless) {
        setSelectedColor(stainless);
        setSelectedModules(Array(gangCount).fill(null));
        return;
      }
    }

    const firstOfTab = products.frame_colors.find(
      (c) => c.material_type === colorTab && c.is_active,
    );
    if (firstOfTab) {
      setSelectedColor(firstOfTab);
      setSelectedModules(Array(gangCount).fill(null));
    }
  }, [colorTab, products, gangCount]);

  const availableModules = (products?.modules ?? []).filter((m) => {
    if (!m.is_active) return false;
    if (m.frame_color_id !== selectedColor?.id) return false;
    if (m.max_gang !== null && m.max_gang !== gangCount) return false;
    return true;
  });

  const activeBoxes =
    products?.embedded_boxes.filter((box) => box.is_active) ?? [];

  useEffect(() => {
    if (!boxListOpen) return;

    if (boxImagesReady) {
      setBoxImagesLoading(false);
      return;
    }

    const imageUrls = (products?.embedded_boxes ?? [])
      .filter((box) => box.is_active)
      .map((box) => box.image_url)
      .filter((src): src is string => Boolean(src))
      .filter((src, index, arr) => arr.indexOf(src) === index);

    if (imageUrls.length === 0) {
      setBoxImagesLoading(false);
      setBoxImagesReady(true);
      return;
    }

    let cancelled = false;
    setBoxImagesLoading(true);

    Promise.all(
      imageUrls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (cancelled) return;
      setBoxImagesReady(true);
      setBoxImagesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [boxListOpen, boxImagesReady, products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      {/* Step 1: 프레임 구수 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 · 프레임 구수 선택
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
            {!framePreviewFailed ? (
              <Image
                src={`/frames/gang-${gangCount}.png`}
                alt={`${gangCount}구 프레임`}
                width={1200}
                height={900}
                className="w-full h-auto object-contain"
                onError={() => setFramePreviewFailed(true)}
              />
            ) : selectedColor?.image_url ? (
              <Image
                src={selectedColor.image_url}
                alt={`${selectedColor.name} 프레임`}
                width={1200}
                height={900}
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="flex items-center justify-center text-sm text-gray-400 min-h-40">
                {gangCount}구 프레임 이미지 준비중
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            * 해당 프레임은 색상반영되지않은 프레임 구의 갯수만 보여집니다.
          </p>
        </div>
      </section>

      {/* Step 2: 색상 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 2 · 프레임 색상
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
              {color.image_url ? (
                <Image
                  src={color.image_url}
                  alt={color.name}
                  width={60}
                  height={60}
                  className="object-cover w-14 h-14"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  No img
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {color.name}
              </span>
              {showPrice && getFrameColorPrice(color, gangCount) > 0 && (
                <span className="text-xs text-gray-500">
                  {formatPrice(getFrameColorPrice(color, gangCount))}
                </span>
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
                    {mod.image_url ? (
                      <Image
                        src={mod.image_url}
                        alt={mod.name}
                        width={48}
                        height={48}
                        className="object-cover w-10 h-10"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200" />
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

      {/* Step 4: 매립박스 (선택) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 4 · 매립박스{" "}
          <span className="block text-gray-400 normal-case font-normal">
            (미사용시 발생하는 사고에 대해 책임지지 않습니다.)
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setSelectedBox(null);
              setBoxListOpen(false);
            }}
            className={cn(
              "py-2 rounded-xl border-2 text-sm font-medium transition-all",
              !boxListOpen
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            선택 안함
          </button>
          <button
            onClick={() => setBoxListOpen(true)}
            className={cn(
              "py-2 rounded-xl border-2 text-sm font-medium transition-all",
              boxListOpen
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            선택함
          </button>
        </div>

        {boxListOpen && (
          <div className="mt-2">
            {boxImagesLoading ? (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                  <p className="text-sm">
                    매립박스 이미지를 불러오는 중입니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {activeBoxes.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => setSelectedBox(box)}
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
                    {showPrice && box.price > 0 && (
                      <span className="text-xs text-gray-500">
                        {formatPrice(box.price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
          className={cn(addedFeedback && "bg-green-600 hover:bg-green-600")}
        >
          {addedFeedback ? "✓ 장바구니에 담겼어요!" : "장바구니에 담기"}
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
  );
}
