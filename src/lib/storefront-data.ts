"use client";

import { EmbeddedBox, FrameColor, Module } from "@/types";

export interface StorefrontData {
  products: {
    frame_colors: FrameColor[];
    modules: Module[];
    embedded_boxes: EmbeddedBox[];
  };
}

let storefrontDataCache: StorefrontData | null = null;
let storefrontDataPromise: Promise<StorefrontData> | null = null;
let storefrontDataCachedAt = 0;
const STOREFRONT_CACHE_TTL_MS =
  0;

export async function getStorefrontData(): Promise<StorefrontData> {
  const isFresh =
    storefrontDataCache &&
    Date.now() - storefrontDataCachedAt < STOREFRONT_CACHE_TTL_MS;

  if (isFresh && storefrontDataCache) {
    return storefrontDataCache;
  }

  if (storefrontDataPromise) {
    return storefrontDataPromise;
  }

  storefrontDataPromise = fetch("/api/admin/products", { cache: "no-store" })
    .then((res) => res.json())
    .then((products) => {
      storefrontDataCache = { products };
      storefrontDataCachedAt = Date.now();
      storefrontDataPromise = null;
      return storefrontDataCache;
    });

  return storefrontDataPromise;
}

export function warmStorefrontData() {
  void getStorefrontData();
}

export function clearStorefrontDataCache() {
  storefrontDataCache = null;
  storefrontDataPromise = null;
  storefrontDataCachedAt = 0;
}
