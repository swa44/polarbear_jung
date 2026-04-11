"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useSessionStore } from "@/store/sessionStore";
import { useRouter } from "next/navigation";
import { cn, formatPrice, getFrameColorPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import OrderSummaryModal from "@/components/cart/OrderSummaryModal";
import Image from "next/image";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          roadAddress: string;
          jibunAddress: string;
          bname: string;
          buildingName: string;
          apartment: "Y" | "N";
          zonecode: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalPrice } =
    useCartStore();
  const customerName = useSessionStore((s) => s.name);

  const [showPrice, setShowPrice] = useState(false);
  const [moduleImageMap, setModuleImageMap] = useState<
    Record<string, string | null>
  >({});
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingDetail, setShippingDetail] = useState("");
  const [addressError, setAddressError] = useState("");
  const [recipientError, setRecipientError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/products").then((r) => r.json()),
    ]).then(([settingsData, productsData]) => {
      setShowPrice(settingsData.show_price === "true");
      const nextMap: Record<string, string | null> = {};
      for (const mod of productsData?.modules ?? []) {
        nextMap[mod.id] = mod.image_url ?? null;
      }
      setModuleImageMap(nextMap);
    });
  }, []);

  useEffect(() => {
    if (customerName && !recipientName.trim()) {
      setRecipientName(customerName);
    }
  }, [customerName, recipientName]);

  useEffect(() => {
    if (window.daum?.Postcode) {
      setPostcodeReady(true);
      return;
    }

    const existingScript = document.getElementById("daum-postcode-script");
    if (existingScript) {
      const onLoad = () => setPostcodeReady(true);
      existingScript.addEventListener("load", onLoad);
      return () => existingScript.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src =
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => setPostcodeReady(true);
    document.body.appendChild(script);
  }, []);

  const handleSearchAddress = () => {
    if (!window.daum?.Postcode) {
      alert(
        "주소 검색 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        const baseAddress = data.roadAddress || data.jibunAddress;
        let extraAddress = "";

        if (data.roadAddress) {
          const extras = [
            data.bname,
            data.apartment === "Y" ? data.buildingName : "",
          ].filter(Boolean);
          if (extras.length > 0) {
            extraAddress = ` (${extras.join(", ")})`;
          }
        }

        setShippingAddress(`[${data.zonecode}] ${baseAddress}${extraAddress}`);
        setAddressError("");
      },
    }).open();
  };

  const handleOrderClick = () => {
    if (!recipientName.trim()) {
      setRecipientError("수신인 이름을 입력해주세요.");
      return;
    }
    setRecipientError("");

    if (!shippingAddress.trim()) {
      setAddressError("배송지 주소를 입력해주세요.");
      return;
    }
    setAddressError("");
    setShowSummary(true);
  };

  const handleConfirmOrder = async () => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartItems: items,
        recipientName,
        shippingAddress,
        shippingDetail,
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
          장바구니가 비어있어요.
          <br />
          스위치를 구성해보세요.
        </p>
        <Link href="/build">
          <Button>주문하러가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">장바구니</h1>
        <button onClick={clearCart} className="text-sm text-red-500">
          전체 삭제
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const itemUnitPrice =
            getFrameColorPrice(item.frame_color, item.gang_count) +
            item.modules.reduce((s, m) => s + m.module_price, 0) +
            (item.embedded_box?.price ?? 0);

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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.modules.map((m, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-start gap-1.5 text-[11px] bg-gray-100 text-gray-700 px-2 py-2 rounded-md min-w-24"
                      >
                        {moduleImageMap[m.module_id] ? (
                          <Image
                            src={moduleImageMap[m.module_id] as string}
                            alt={m.module_name}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover"
                          />
                        ) : (
                          <span className="w-14 h-14 bg-gray-200" />
                        )}
                        <span className="text-center leading-tight">
                          {m.module_name}
                        </span>
                      </div>
                    ))}
                  </div>
                  {item.embedded_box && (
                    <p className="text-xs text-gray-500 mt-1">
                      매립박스: {item.embedded_box.name}
                    </p>
                  )}
                  {showPrice && (
                    <p className="text-sm text-gray-700 mt-2">
                      {formatPrice(itemUnitPrice)} × {item.quantity} ={" "}
                      <span className="font-semibold">
                        {formatPrice(itemUnitPrice * item.quantity)}
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

              {/* Quantity */}
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

      {/* 더 담기 */}
      <Link href="/build">
        <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
          + 상품 더 담기
        </button>
      </Link>

      {/* 배송지 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">배송 정보</h2>
        <Input
          label="수신인"
          placeholder="수신인 이름을 입력해주세요"
          value={recipientName}
          onChange={(e) => {
            setRecipientName(e.target.value);
            setRecipientError("");
          }}
          error={recipientError}
        />
        <Input
          label="주소"
          placeholder="클릭하여 주소를 검색해주세요"
          value={shippingAddress}
          onClick={handleSearchAddress}
          onChange={() => {}}
          readOnly
          disabled={!postcodeReady}
          className="cursor-pointer"
          error={addressError}
        />
        <Input
          label="상세 주소 (선택)"
          placeholder="동/호수, 건물명 등"
          value={shippingDetail}
          onChange={(e) => setShippingDetail(e.target.value)}
        />
      </div>

      {/* 주문 합계 & 버튼 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        {showPrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">총 주문 금액</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(totalPrice())}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400">
          주문 접수 후 담당자가 연락드려 입금 안내를 드립니다.
        </p>
        <Button onClick={handleOrderClick} fullWidth size="lg">
          주문 접수하기
        </Button>
      </div>

      {/* 주문 확인 모달 */}
      {showSummary && (
        <OrderSummaryModal
          items={items}
          recipientName={recipientName}
          shippingAddress={shippingAddress}
          shippingDetail={shippingDetail}
          totalPrice={totalPrice()}
          showPrice={showPrice}
          onConfirm={handleConfirmOrder}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
