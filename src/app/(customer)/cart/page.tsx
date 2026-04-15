"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { formatPrice, getFrameColorPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import OrderSummaryModal from "@/components/cart/OrderSummaryModal";
import Image from "next/image";
import { CartItem } from "@/types";

const BOX_IMAGE_BY_NAME: Record<string, string> = {
  "메탈사각박스": "/boxes/BS6042M-50.webp",
  "원형박스(H47)": "/boxes/9063-02.webp",
  "원형박스(H61)": "/boxes/9064-02.webp",
  "2구원형박스(H48)": "/boxes/9252-22.webp",
  "3구원형박스(H48)": "/boxes/9253-22.webp",
  "4구원형박스(H48)": "/boxes/9254-22.webp",
};

function normalizeBoxName(name: string) {
  return name.replace(/\s+/g, "").trim();
}

function resolveEmbeddedBoxImage(box: CartItem["embedded_box"]) {
  if (!box) return null;

  if (box.image_url?.startsWith("/boxes/")) return box.image_url;

  const normalizedTarget = normalizeBoxName(box.name);
  const matchedKey = Object.keys(BOX_IMAGE_BY_NAME).find((key) => {
    const normalizedKey = normalizeBoxName(key);
    return (
      normalizedKey === normalizedTarget ||
      normalizedTarget.includes(normalizedKey) ||
      normalizedKey.includes(normalizedTarget)
    );
  });
  if (matchedKey) return BOX_IMAGE_BY_NAME[matchedKey];

  return box.image_url;
}

function SingleItemImage({ item }: { item: CartItem }) {
  const [stage, setStage] = useState(0);

  if (item.single_category === "box") {
    const boxSrc = resolveEmbeddedBoxImage(item.embedded_box);
    if (!boxSrc) {
      return <div className="w-14 h-14 bg-gray-200 rounded" />;
    }

    return (
      <Image
        src={boxSrc}
        alt={item.single_name ?? ""}
        width={56}
        height={56}
        className="w-14 h-14 object-contain"
      />
    );
  }

  const src = (() => {
    if ((item.single_category === 'frame' || item.single_category === 'part') && item.single_part_code) {
      if (stage === 0) return `/modules/${item.single_color_name}/${item.single_part_code}.webp`;
      if (stage === 1) return `/inserts/${item.single_part_code}.webp`;
    }
    return null;
  })();

  const isFrame = item.single_category === 'frame';

  if (!src || stage >= 2) {
    return <div className="w-14 h-14 bg-gray-200 rounded" />;
  }

  return (
    <Image
      key={src}
      src={src}
      alt={item.single_name ?? ''}
      width={56}
      height={56}
      className={`w-14 h-14 ${isFrame ? 'object-contain' : 'object-cover'}`}
      onError={() => setStage((s) => s + 1)}
    />
  );
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalPrice } =
    useCartStore();

  const showPrice = false;
  const [showSummary, setShowSummary] = useState(false);
  const [coverCodeMap, setCoverCodeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/module-parts')
      .then((r) => r.json())
      .then(({ parts }) => {
        const map: Record<string, string> = {};
        for (const p of parts ?? []) {
          if (p.part_name.includes('커버') || p.part_name.includes('프레임')) {
            map[`${p.module_name}||${p.color_name}`] = p.part_code;
          }
        }
        setCoverCodeMap(map);
      });
  }, []);


  const handleQuoteClick = () => {
    setShowSummary(true);
  };

  const handleConfirmQuote = async () => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartItems: items,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    clearCart();
    router.push(`/orders?new=${data.orderNumber}`);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-200" />
        <p className="text-gray-500 text-center">
          견적 바구니가 비어있어요.
          <br />
          스위치를 구성해보세요.
        </p>
        <Link href="/build">
          <Button>견적 구성하러가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">견적 바구니</h1>
        <button onClick={clearCart} className="text-sm text-red-500">
          전체 삭제
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          if (item.item_type === "single") {
            const singleUnit = item.single_unit_price ?? 0;
            const singleTotal = singleUnit * item.quantity;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      낱개부품 · {item.single_color_name ?? ''}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center justify-start gap-1.5 text-[11px] bg-gray-100 text-gray-700 px-2 py-2 rounded-md">
                        <SingleItemImage item={item} />
                        <span className="text-center leading-tight">{item.single_name}</span>
                      </div>
                    </div>
                    {showPrice && (
                      <p className="text-sm text-gray-700 mt-2">
                        {formatPrice(singleUnit)} × {item.quantity} ={" "}
                        <span className="font-semibold">
                          {formatPrice(singleTotal)}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">수량</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const setUnitPrice =
            getFrameColorPrice(item.frame_color, item.gang_count) +
            item.modules.reduce((s, m) => s + m.module_price, 0);
          const boxQuantity = item.embedded_box
            ? (item.embedded_box_quantity ?? 1)
            : 0;
          const boxTotal = (item.embedded_box?.price ?? 0) * boxQuantity;
          const itemTotal = setUnitPrice * item.quantity + boxTotal;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {item.gang_count}구 · {item.frame_color.name}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {/* 프레임 이미지 */}
                    <div className="flex flex-col items-center justify-start gap-1.5 text-[11px] bg-gray-100 text-gray-700 px-2 py-2 rounded-md">
                      <Image
                        src={`/modules/${item.frame_color.name}/${coverCodeMap[`${item.gang_count}구||${item.frame_color.name}`] ?? `${item.gang_count}구`}.webp`}
                        alt={`${item.frame_color.name} ${item.gang_count}구`}
                        width={56}
                        height={56}
                        className="w-14 h-14 object-contain"
                      />
                      <span className="text-center leading-tight">
                        {item.gang_count}구 프레임
                      </span>
                    </div>
                    {/* 모듈 이미지 */}
                    {item.modules.map((m, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-start gap-1.5 text-[11px] bg-gray-100 text-gray-700 px-2 py-2 rounded-md"
                      >
                        <Image
                          src={`/modules/${item.frame_color.name}/${coverCodeMap[`${m.module_name}||${item.frame_color.name}`] ?? m.module_name.replaceAll('/', ':')}.webp`}
                          alt={m.module_name}
                          width={56}
                          height={56}
                          className="w-14 h-14 object-cover"
                        />
                        <span className="text-center leading-tight">
                          {m.module_name}
                        </span>
                      </div>
                    ))}
                  </div>
                  {item.embedded_box && item.single_category !== 'box' && (
                    <p className="text-xs text-gray-500 mt-1">
                      추가상품: {item.embedded_box.name} × {boxQuantity}
                    </p>
                  )}
                  {showPrice && (
                    <p className="text-sm text-gray-700 mt-2">
                      {formatPrice(setUnitPrice)} × {item.quantity}
                      {boxTotal > 0 ? ` + ${formatPrice(boxTotal)}` : ""} ={" "}
                      <span className="font-semibold">
                        {formatPrice(itemTotal)}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">수량</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/build">
        <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
          + 구성 더 담기
        </button>
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        {showPrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">총 견적 금액</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(totalPrice())}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400">
          견적 요청 후 알림톡으로 견적서 링크를 보내드립니다.
        </p>
        <Button onClick={handleQuoteClick} fullWidth size="lg">
          견적 요청하기
        </Button>
      </div>

      {showSummary && (
        <OrderSummaryModal
          items={items}
          totalPrice={totalPrice()}
          showPrice={showPrice}
          onConfirm={handleConfirmQuote}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
