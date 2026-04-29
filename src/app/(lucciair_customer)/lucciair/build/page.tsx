"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FAN_PRODUCTS, FanProduct } from "@/lib/fan-products";

function FanCard({ product }: { product: FanProduct }) {
  const count = product.mainImages.length;
  const [baseIdx, setBaseIdx] = useState(0);
  const [overlayIdx, setOverlayIdx] = useState<number | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const nextImgIdx = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (count <= 1) return;

    const id = setInterval(() => {
      if (busy.current) return;
      busy.current = true;

      nextImgIdx.current = (nextImgIdx.current + 1) % count;

      setOverlayIdx(nextImgIdx.current);
      setOverlayVisible(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOverlayVisible(true);
          setTimeout(() => {
            setBaseIdx(nextImgIdx.current);
            setOverlayIdx(null);
            setOverlayVisible(false);
            busy.current = false;
          }, 700);
        });
      });
    }, 1500);

    return () => clearInterval(id);
  }, [count]);

  const cleanFolder = encodeURIComponent(product.mainCleanFolder);
  const origFolder = encodeURIComponent(product.mainFolder);

  const imgSrc = (file: string) =>
    `/fan/main_clean/${cleanFolder}/${encodeURIComponent(file)}`;
  const imgFallback = (file: string) =>
    `/fan/main/${origFolder}/${encodeURIComponent(file)}`;

  return (
    <Link href={`/lucciair/fan/${product.id}`} className="block">
      <div
        className="relative overflow-hidden rounded-xl bg-gray-100 shadow-md"
        style={{ aspectRatio: "9/11" }}
      >
        {count === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            준비중
          </span>
        ) : (
          <>
            <img
              src={imgSrc(product.mainImages[baseIdx].file)}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.src = imgFallback(
                  product.mainImages[baseIdx].file,
                );
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {overlayIdx !== null && (
              <img
                src={imgSrc(product.mainImages[overlayIdx].file)}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.src = imgFallback(
                    product.mainImages[overlayIdx].file,
                  );
                }}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: "opacity 0.6s ease-in-out",
                }}
              />
            )}
            {/* 카드 하단 텍스트 */}
            <div className="absolute bottom-5 left-5 flex flex-col items-start gap-1">
              {product.minHeight && (
                <span className="bg-gray-500/70 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full leading-tight">
                  {product.minHeight}
                </span>
              )}
              {product.roomType && (
                <span className="text-gray-900 text-sm font-normal drop-shadow-sm leading-tight">
                  {product.roomType}
                </span>
              )}
              <span className="text-gray-900 text-md font-extrabold leading-tight">
                {product.name}
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export default function LucciairBuildPage() {
  return (
    <div className="px-4 py-6">
      <div className="grid grid-cols-2 gap-4">
        {FAN_PRODUCTS.map((product) => (
          <FanCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
