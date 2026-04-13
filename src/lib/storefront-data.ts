"use client";

import { EmbeddedBox, FrameColor, Module } from "@/types";

export interface StorefrontData {
  products: {
    frame_colors: FrameColor[];
    modules: Module[];
    embedded_boxes: EmbeddedBox[];
  };
  settings: {
    show_price: string;
    telegram_enabled?: string;
  };
}

let storefrontDataCache: StorefrontData | null = null;
let storefrontDataPromise: Promise<StorefrontData> | null = null;
let storefrontDataCachedAt = 0;
const STOREFRONT_CACHE_TTL_MS =
  process.env.NODE_ENV === "development" ? 0 : 10 * 1000;

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

  storefrontDataPromise = Promise.all([
    fetch("/api/admin/products", { cache: "no-store" }).then((res) =>
      res.json(),
    ),
    fetch("/api/admin/settings", { cache: "no-store" }).then((res) =>
      res.json(),
    ),
  ]).then(([products, settings]) => {
    storefrontDataCache = { products, settings };
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
