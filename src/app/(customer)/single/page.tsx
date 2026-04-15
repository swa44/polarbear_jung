"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorefrontData } from "@/lib/storefront-data";
import {
  FrameColor,
  EmbeddedBox,
  CartItem,
  ModulePart,
  ModuleOption,
  ModuleCategory,
} from "@/types";
import { cn, getFrameColorPrice } from "@/lib/utils";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useCartStore } from "@/store/cartStore";
import { ChevronDown, ChevronUp, X } from "lucide-react";

const GANG_OPTIONS = [1, 2, 3, 4, 5];
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

function PartImageSmall({
  colorName,
  partCode,
}: {
  colorName: string;
  partCode: string;
}) {
  const [stage, setStage] = useState(0);
  const src =
    stage === 0
      ? `/modules_set/${colorName}/${partCode}.webp`
      : `/inserts/${partCode}.webp`;
  if (stage >= 2)
    return <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />;
  return (
    <Image
      key={src}
      src={src}
      alt={partCode}
      width={64}
      height={64}
      unoptimized
      loading="lazy"
      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
      onError={() => setStage((s) => s + 1)}
    />
  );
}

type Selection =
  | { type: "frame"; gang: number }
  | { type: "part"; part: ModulePart }
  | { type: "box"; box: EmbeddedBox }
  | null;

export default function SingleQuotePage() {
  const addItem = useCartStore((s) => s.addItem);

  const [frameColors, setFrameColors] = useState<FrameColor[]>([]);
  const [embeddedBoxes, setEmbeddedBoxes] = useState<EmbeddedBox[]>([]);
  const [allParts, setAllParts] = useState<ModulePart[]>([]);
  const [loading, setLoading] = useState(true);

  // 색상
  const [colorTab, setColorTab] = useState<"plastic" | "metal">("plastic");
  const [selectedColor, setSelectedColor] = useState<FrameColor | null>(null);

  // 아코디언 (모듈만)
  const [moduleOpen, setModuleOpen] = useState(false);

  // 프레임/매립박스 모달
  const [frameModalOpen, setFrameModalOpen] = useState(false);
  const [boxModalOpen, setBoxModalOpen] = useState(false);

  // 모듈 카테고리 탭 + 선택
  const [activeCategory, setActiveCategory] =
    useState<ModuleCategory>("스위치류");
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(
    null,
  );

  // 구성부품 바텀시트
  const [partsSheetOpen, setPartsSheetOpen] = useState(false);

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    const anyOpen = frameModalOpen || boxModalOpen || partsSheetOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [frameModalOpen, boxModalOpen, partsSheetOpen]);

  // 통합 선택 + 수량
  const [selection, setSelection] = useState<Selection>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // 선택 시 카드가 nav 위로 보이도록 스크롤
  const cartCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selection === null || !cartCardRef.current) return;
    const NAV_HEIGHT = 64;
    const PADDING = 12;
    const rect = cartCardRef.current.getBoundingClientRect();
    const bottomLimit = window.innerHeight - NAV_HEIGHT - PADDING;
    if (rect.bottom > bottomLimit) {
      window.scrollBy({ top: rect.bottom - bottomLimit, behavior: "smooth" });
    }
  }, [selection]);

  useEffect(() => {
    const load = async () => {
      const [{ products }, partsRes] = await Promise.all([
        getStorefrontData(),
        fetch("/api/module-parts").then((r) => r.json()),
      ]);
      const colors = products.frame_colors.filter((c) => c.is_active);
      setFrameColors(colors);
      setEmbeddedBoxes(products.embedded_boxes.filter((b) => b.is_active));
      setAllParts(partsRes.parts ?? []);
      const first = colors.find((c) => c.material_type === "plastic");
      if (first) setSelectedColor(first);
      setLoading(false);
    };
    load();
  }, []);

  const filteredColors = useMemo(
    () => frameColors.filter((c) => c.material_type === colorTab),
    [frameColors, colorTab],
  );

  const CATEGORIES: ModuleCategory[] = ["스위치류", "콘센트류", "기타류"];

  // 현재 색상에 해당하는 모듈 목록 (module_parts에서 고유 module_name 추출)
  const colorModules = useMemo<ModuleOption[]>(() => {
    if (!selectedColor) return [];
    const FRAME_NAMES = new Set(["1구", "2구", "3구", "4구", "5구"]);
    const seen = new Set<string>();
    const result: ModuleOption[] = [];
    for (const p of allParts) {
      const matches = p.material_type
        ? p.material_type === selectedColor.material_type
        : p.color_name === selectedColor.name;
      if (!matches) continue;
      if (FRAME_NAMES.has(p.module_name)) continue;
      if (seen.has(p.module_name)) continue;
      const totalPrice = allParts
        .filter(
          (mp) =>
            mp.module_name === p.module_name && mp.color_name === p.color_name,
        )
        .reduce((s, mp) => s + mp.price, 0);
      seen.add(p.module_name);
      result.push({
        name: p.module_name,
        category: (p.category as ModuleCategory) ?? "기타류",
        price: totalPrice,
      });
    }
    return result;
  }, [allParts, selectedColor]);

  const filteredModules = useMemo(
    () => colorModules.filter((m) => m.category === activeCategory),
    [colorModules, activeCategory],
  );

  const coverCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allParts) {
      if (p.part_name.includes("커버")) {
        map[`${p.module_name}||${p.color_name}`] = p.part_code;
      }
    }
    return map;
  }, [allParts]);

  useEffect(() => {
    if (!selectedColor) return;

    const cancel = scheduleIdle(() => {
      const urls = new Set<string>();

      // 프레임 선택 모달 대비
      for (let n = 1; n <= 5; n += 1) {
        urls.add(`/frames/${selectedColor.name}/${n}구.webp`);
      }

      // 모듈 목록 상위 이미지 프리로드
      for (const module of colorModules.slice(0, IDLE_PREFETCH_LIMIT)) {
        const coverCode =
          coverCodeMap[`${module.name}||${selectedColor.name}`] ??
          module.name.replaceAll("/", ":");
        urls.add(`/modules/${selectedColor.name}/${coverCode}.webp`);
      }

      // 매립박스 모달 대비
      for (const box of embeddedBoxes) {
        if (box.image_url) urls.add(box.image_url);
      }

      urls.forEach((src) => {
        const img = new window.Image();
        img.src = src;
      });
    });

    return cancel;
  }, [colorModules, coverCodeMap, embeddedBoxes, selectedColor]);

  const currentParts = useMemo(() => {
    if (!selectedColor || !selectedModuleName) return [];
    return allParts.filter(
      (p) =>
        p.color_name === selectedColor.name &&
        p.module_name === selectedModuleName,
    );
  }, [allParts, selectedColor, selectedModuleName]);

  const handleSelect = (next: Selection) => {
    setSelection((prev) => {
      const isSame =
        prev?.type === next?.type &&
        (next?.type === "frame"
          ? (prev as { type: "frame"; gang: number }).gang === next.gang
          : next?.type === "part"
            ? (prev as { type: "part"; part: ModulePart }).part.id ===
              next.part.id
            : next?.type === "box"
              ? (prev as { type: "box"; box: EmbeddedBox }).box.id ===
                next.box.id
              : false);
      return isSame ? null : next;
    });
    setQuantity(1);
  };

  const framePartName = useMemo(() => {
    if (!selection || selection.type !== "frame" || !selectedColor) return null;
    const gang = selection.gang;
    const part = allParts.find(
      (p) =>
        p.module_name === `${gang}구` && p.color_name === selectedColor.name,
    );
    return part?.part_name ?? `프레임 ${gang}구`;
  }, [selection, allParts, selectedColor]);

  const selectionLabel = (() => {
    if (!selection) return null;
    if (selection.type === "frame")
      return `${framePartName} · ${selectedColor?.name}`;
    if (selection.type === "part")
      return `${selection.part.part_name} · ${selectedColor?.name}`;
    if (selection.type === "box") return selection.box.name;
    return null;
  })();

  const handleAddToCart = () => {
    if (!selection || !selectedColor) return;

    let cartItem: CartItem | null = null;

    if (selection.type === "frame") {
      cartItem = {
        id: uuidv4(),
        item_type: "single",
        gang_count: selection.gang,
        frame_color: selectedColor,
        modules: [],
        embedded_box: null,
        quantity,
        single_category: "frame",
        single_name: framePartName ?? `프레임 ${selection.gang}구`,
        single_unit_price: getFrameColorPrice(selectedColor, selection.gang),
        single_color_name: selectedColor.name,
        single_part_code:
          allParts.find(
            (p) =>
              p.module_name === `${selection.gang}구` &&
              p.color_name === selectedColor.name,
          )?.part_code ?? null,
      };
    } else if (selection.type === "part") {
      cartItem = {
        id: uuidv4(),
        item_type: "single",
        gang_count: 1,
        frame_color: selectedColor,
        modules: [],
        embedded_box: null,
        quantity,
        single_category: "part",
        single_name: selection.part.part_name,
        single_unit_price: selection.part.price,
        single_color_name: selectedColor.name,
        single_part_code: selection.part.part_code,
      };
    } else if (selection.type === "box") {
      cartItem = {
        id: uuidv4(),
        item_type: "single",
        gang_count: 1,
        frame_color: selectedColor ?? frameColors[0],
        modules: [],
        embedded_box: selection.box,
        quantity,
        single_category: "box",
        single_name: selection.box.name,
        single_unit_price: selection.box.price,
        single_color_name: null,
      };
    }

    if (!cartItem) return;
    addItem(cartItem);
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
      setSelection(null);
    }, 1500);
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-6 flex flex-col gap-4", false)}>
      <h1 className="text-xl font-bold text-gray-900">낱개부품 견적</h1>

      <section className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-900">
          낱개부품견적 사용방법
        </p>
        <ol className="mt-2 text-sm text-gray-700 list-decimal list-inside space-y-1">
          <li>색상을 먼저 선택해주세요.</li>
          <li>원하는 품목(프레임·모듈·매립박스)을 펼쳐 선택해주세요.</li>
          <li>수량 설정 후 견적 바구니에 담아주세요.</li>
        </ol>
      </section>

      <p className="text-sm text-blue-400 text-center">
        필요한 제품을 모두 담은 뒤,
        <br />
        견적 바구니에서 한 번에 확인해주세요.
      </p>

      {/* 색상 선택 */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-900">색상 선택</p>
        <div className="flex gap-2">
          {(["plastic", "metal"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setColorTab(tab);
                const autoColor =
                  tab === "metal"
                    ? frameColors.find((c) => c.material_type === "metal" && c.name === "스테인레스 스틸") ??
                      frameColors.find((c) => c.material_type === "metal")
                    : frameColors.find((c) => c.material_type === "plastic");
                if (autoColor) {
                  setSelectedColor(autoColor);
                  setSelectedModuleName(null);
                  setSelection(null);
                }
              }}
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
                setSelectedModuleName(null);
                setSelection(null);
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                selectedColor?.id === color.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              <Image
                src={`/colors/${color.name}.webp`}
                alt={color.name}
                width={56}
                height={56}
                unoptimized
                loading="lazy"
                className="object-cover w-12 h-12"
              />
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 프레임 */}
      <section>
        <button
          onClick={() => setFrameModalOpen(true)}
          className="w-full rounded-2xl border px-4 py-4 flex items-center justify-between transition-colors bg-gray-100 border-gray-100 hover:bg-gray-50"
        >
          <span className="font-semibold text-gray-700">프레임</span>
          <ChevronDown className="w-4 h-4 text-gray-300" />
        </button>
      </section>

      {/* 모듈 */}
      <section>
        <button
          onClick={() => setModuleOpen((v) => !v)}
          className={cn(
            "w-full rounded-2xl border px-4 py-4 flex items-center justify-between transition-colors",
            moduleOpen
              ? "bg-white border-gray-200"
              : "bg-gray-100 border-gray-100",
          )}
        >
          <span
            className={cn(
              "font-semibold transition-colors",
              moduleOpen ? "text-gray-900" : "text-gray-700",
            )}
          >
            모듈 (인서트+커버)
          </span>
          {moduleOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-300" />
          )}
        </button>

        {moduleOpen && (
          <div className="mt-2 bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
            {/* 카테고리 탭 */}
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSelectedModuleName(null);
                    setSelection(null);
                  }}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 모듈 그리드 (이미지) */}
            {colorModules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                해당 색상의 모듈이 없습니다.
              </p>
            ) : filteredModules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                선택 가능한 모듈이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredModules.map((module) => (
                  <button
                    key={module.name}
                    onClick={() => {
                      setSelectedModuleName(module.name);
                      setSelection(null);
                      setPartsSheetOpen(true);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      selectedModuleName === module.name
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 bg-white hover:border-gray-400",
                    )}
                  >
                    <Image
                      src={`/modules/${selectedColor?.name}/${coverCodeMap[`${module.name}||${selectedColor?.name}`] ?? module.name.replaceAll("/", ":")}.webp`}
                      alt={module.name}
                      width={72}
                      height={72}
                      unoptimized
                      loading="lazy"
                      className="object-cover w-16 h-16"
                    />
                    <span className="text-sm font-medium text-gray-800 text-center leading-tight">
                      {module.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 매립박스 */}
      <section>
        <button
          onClick={() => setBoxModalOpen(true)}
          className="w-full rounded-2xl border px-4 py-4 flex items-center justify-between transition-colors bg-gray-100 border-gray-100 hover:bg-gray-50"
        >
          <span className="font-semibold text-gray-700">매립박스</span>
          <ChevronDown className="w-4 h-4 text-gray-300" />
        </button>
      </section>

      {/* 프레임 모달 */}
      {frameModalOpen && selectedColor && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setFrameModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col pointer-events-auto"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  프레임 선택
                </h3>
                <button
                  onClick={() => setFrameModalOpen(false)}
                  className="p-1 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
                {GANG_OPTIONS.map((n) => {
                  const isSelected =
                    selection?.type === "frame" &&
                    (selection as { type: "frame"; gang: number }).gang === n;
                  const partName =
                    allParts.find(
                      (p) =>
                        p.module_name === `${n}구` &&
                        p.color_name === selectedColor.name,
                    )?.part_name ?? `${n}구 프레임`;
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        handleSelect({ type: "frame", gang: n });
                        setFrameModalOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-100 bg-white hover:border-gray-300",
                      )}
                    >
                      <Image
                        src={`/frames/${selectedColor.name}/${n}구.webp`}
                        alt={`${n}구`}
                        width={128}
                        height={128}
                        unoptimized
                        loading="lazy"
                        className="w-40 h-20 object-contain rounded-lg flex-shrink-0"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800 leading-tight">
                        {partName}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-gray-900 bg-gray-200 px-2 py-0.5 rounded-full">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 매립박스 모달 */}
      {boxModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setBoxModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col pointer-events-auto"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  매립박스 선택
                </h3>
                <button
                  onClick={() => setBoxModalOpen(false)}
                  className="p-1 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
                <p className="text-xs text-gray-400">
                  (미사용시 발생하는 사고에 대해 책임지지 않습니다.)
                </p>
                {embeddedBoxes.map((box) => {
                  const isSelected =
                    selection?.type === "box" &&
                    (selection as { type: "box"; box: EmbeddedBox }).box.id ===
                      box.id;
                  return (
                    <button
                      key={box.id}
                      onClick={() => {
                        handleSelect({ type: "box", box });
                        setBoxModalOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-100 bg-white hover:border-gray-300",
                      )}
                    >
                      {box.image_url ? (
                        <Image
                          src={box.image_url}
                          alt={box.name}
                          width={48}
                          height={48}
                          className="w-20 h-20 object-contain rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-medium text-gray-800 leading-tight">
                        {box.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-gray-900 bg-gray-200 px-2 py-0.5 rounded-full">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 구성부품 바텀시트 */}
      {partsSheetOpen && selectedModuleName && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setPartsSheetOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col pointer-events-auto"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedModuleName} · 구성부품 선택
                </h3>
                <button
                  onClick={() => setPartsSheetOpen(false)}
                  className="p-1 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
                {currentParts.map((part) => {
                  const isSelected =
                    selection?.type === "part" &&
                    (selection as { type: "part"; part: ModulePart }).part
                      .id === part.id;
                  return (
                    <button
                      key={part.id}
                      onClick={() => {
                        handleSelect({ type: "part", part });
                        setPartsSheetOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-100 bg-white hover:border-gray-300",
                      )}
                    >
                      <PartImageSmall
                        colorName={selectedColor?.name ?? ""}
                        partCode={part.part_code}
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800 leading-tight">
                        {part.part_name}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-gray-900 bg-gray-200 px-2 py-0.5 rounded-full">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 수량 + 담기 */}
      {selection && (
        <div
          ref={cartCardRef}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3"
        >
          <p className="text-sm font-medium text-gray-900">{selectionLabel}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
            >
              +
            </button>
          </div>
          <Button
            onClick={handleAddToCart}
            fullWidth
            size="lg"
            className={cn(addedFeedback && "bg-green-600 hover:bg-green-600")}
          >
            {addedFeedback ? "✓ 견적 바구니에 담겼어요!" : "견적 바구니에 담기"}
          </Button>
        </div>
      )}
    </div>
  );
}
