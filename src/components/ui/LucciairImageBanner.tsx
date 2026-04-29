"use client";

import { useState, useEffect } from "react";

const IMAGES = Array.from({ length: 6 }, (_, i) => `/lucciair/main_images/lucci_${i + 1}.webp`);

export default function LucciairImageBanner() {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % IMAGES.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === imgIndex ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
