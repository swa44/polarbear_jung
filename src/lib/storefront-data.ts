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

export async function getStorefrontData(): Promise<StorefrontData> {
  if (storefrontDataCache) {
    return storefrontDataCache;
  }

  if (storefrontDataPromise) {
    return storefrontDataPromise;
  }

  storefrontDataPromise = Promise.all([
    fetch("/api/admin/products", { cache: "force-cache" }).then((res) =>
      res.json(),
    ),
    fetch("/api/admin/settings", { cache: "force-cache" }).then((res) =>
      res.json(),
    ),
  ]).then(([products, settings]) => {
    storefrontDataCache = { products, settings };
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
}
