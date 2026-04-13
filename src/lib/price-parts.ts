import { readFile } from "fs/promises";
import path from "path";

type CsvPriceRow = {
  productName: string;
  color: string;
  price: number;
};

type FrameColorLike = {
  id: string;
  name: string;
  price: number | null;
  price_1: number | null;
  price_2: number | null;
  price_3: number | null;
  price_4: number | null;
  price_5: number | null;
};

type ModuleLike = {
  frame_color_id: string;
  name: string;
  price: number;
};

type EmbeddedBoxLike = {
  name: string;
  price: number;
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  // Accept common naming variants used in uploaded CSV files
  return normalized
    .replace("앤티크브래스", "앤틱브래스")
    .replace("stainlesssteel", "스테인레스스틸");
}

function buildKey(productName: string, color: string) {
  return `${normalizeText(productName)}::${normalizeText(color)}`;
}

function parsePrice(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

export async function readPricePartsMap() {
  const csvPath = path.join(process.cwd(), "price_parts_template.csv");
  const raw = await readFile(csvPath, "utf8");
  const rows = parseCsv(raw.replace(/^\uFEFF/, ""));

  if (rows.length < 2) {
    return new Map<string, CsvPriceRow>();
  }

  const header = rows[0].map((value) => value.trim());
  const expected = ["상품명", "색상", "단가"];
  if (
    header.length !== expected.length ||
    expected.some((value, index) => value !== header[index])
  ) {
    throw new Error(
      `price_parts_template.csv 헤더가 올바르지 않습니다. 기대값: ${expected.join(",")}`,
    );
  }

  const map = new Map<string, CsvPriceRow>();

  for (let i = 1; i < rows.length; i += 1) {
    const [productName = "", color = "", price = ""] = rows[i];
    const trimmedProductName = productName.trim();

    if (!trimmedProductName) continue;

    map.set(buildKey(trimmedProductName, color), {
      productName: trimmedProductName,
      color: color.trim(),
      price: parsePrice(price),
    });
  }

  return map;
}

function findPrice(
  priceMap: Map<string, CsvPriceRow>,
  productName: string,
  color: string,
) {
  return (
    priceMap.get(buildKey(productName, color))?.price ??
    priceMap.get(buildKey(productName, ""))?.price ??
    null
  );
}

export function applyCsvPricesToProducts<
  TFrameColor extends FrameColorLike,
  TModule extends ModuleLike,
  TEmbeddedBox extends EmbeddedBoxLike,
>(
  frameColors: TFrameColor[],
  modules: TModule[],
  embeddedBoxes: TEmbeddedBox[],
  priceMap: Map<string, CsvPriceRow>,
) {
  const colorNameById = new Map(frameColors.map((color) => [color.id, color.name]));

  const nextFrameColors = frameColors.map((color) => {
    const prices = {
      1: findPrice(priceMap, "1구프레임", color.name),
      2: findPrice(priceMap, "2구프레임", color.name),
      3: findPrice(priceMap, "3구프레임", color.name),
      4: findPrice(priceMap, "4구프레임", color.name),
      5: findPrice(priceMap, "5구프레임", color.name),
    };

    return {
      ...color,
      price: prices[1] ?? color.price ?? 0,
      price_1: prices[1] ?? color.price_1 ?? color.price ?? 0,
      price_2: prices[2] ?? color.price_2 ?? color.price ?? 0,
      price_3: prices[3] ?? color.price_3 ?? color.price ?? 0,
      price_4: prices[4] ?? color.price_4 ?? color.price ?? 0,
      price_5: prices[5] ?? color.price_5 ?? color.price ?? 0,
    };
  });

  const nextModules = modules.map((module) => {
    const colorName = colorNameById.get(module.frame_color_id) ?? "";
    const matchedPrice = findPrice(priceMap, module.name, colorName);
    return {
      ...module,
      price: matchedPrice ?? module.price,
    };
  });

  const nextEmbeddedBoxes = embeddedBoxes.map((box) => {
    const matchedPrice = findPrice(priceMap, box.name, "");
    return {
      ...box,
      price: matchedPrice ?? box.price,
    };
  });

  return {
    frame_colors: nextFrameColors,
    modules: nextModules,
    embedded_boxes: nextEmbeddedBoxes,
  };
}
