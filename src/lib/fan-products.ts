export interface FanColorImage {
  file: string;
  color: string;
  price: number;
}

export interface FanProduct {
  id: string;
  name: string;
  mainFolder: string;
  mainCleanFolder: string;
  detailFolder: string;
  mainImages: FanColorImage[];
  detailImages: string[];
  minHeight?: string;
  roomType?: string;
}

export const FAN_PRODUCTS: FanProduct[] = [
  // ── 2.3m 이상 ─────────────────────────────────────
  {
    id: "radar3",
    name: "레이더3",
    minHeight: "2.3m 이상",
    roomType: "거실",
    mainFolder: "레이더3",
    mainCleanFolder: "Radar3",
    detailFolder: "레이더3",
    mainImages: [
      { file: "레이더3_0001_브론즈.webp", color: "브론즈", price: 550000 },
      { file: "레이더3_0002_크롬다크코코아.webp", color: "크롬다크코코아", price: 590000 },
      { file: "레이더3_0003_크롬티크.webp", color: "크롬티크", price: 590000 },
      { file: "레이더3_0005_화이트오크.webp", color: "화이트오크", price: 550000 },
      { file: "레이더3_0006_화이트.webp", color: "화이트", price: 550000 },
    ],
    detailImages: ["Radar3_1.webp", "Radar3_2.webp", "Radar3_3.webp", "Radar3_4.webp"],
  },
  {
    id: "radar3mini",
    name: "레이더3mini",
    minHeight: "2.3m 이상",
    roomType: "침실/서재/작은방",
    mainFolder: "레이더3미니",
    mainCleanFolder: "Radar3Mini",
    detailFolder: "레이더3mini",
    mainImages: [
      { file: "레이더3미니_0001_화이트.webp", color: "화이트", price: 530000 },
    ],
    detailImages: ["Radar3Mini_1.webp", "Radar3Mini_2.webp", "Radar3Mini_3.webp", "Radar3Mini_4.webp"],
  },
  {
    id: "springvale",
    name: "스프링베일",
    minHeight: "2.3m 이상",
    roomType: "거실",
    mainFolder: "스프링베일",
    mainCleanFolder: "Springvale",
    detailFolder: "스프링베일",
    mainImages: [
      { file: "스프링베일_0000_매트화이트.webp", color: "매트화이트", price: 620000 },
    ],
    detailImages: ["Springvale_1.webp", "Springvale_2.webp", "Springvale_3.webp", "Springvale_4.webp"],
  },
  {
    id: "array",
    name: "어레이",
    minHeight: "2.3m 이상",
    roomType: "거실",
    mainFolder: "어레이",
    mainCleanFolder: "Array",
    detailFolder: "어레이",
    mainImages: [
      { file: "어레이_0000_화이트.webp", color: "화이트", price: 490000 },
    ],
    detailImages: ["Array_1.webp", "Array_2.webp", "Array_3.webp", "Array_4.webp"],
  },
  {
    id: "kotara-ctc",
    name: "코타라CTC",
    minHeight: "2.3m 이상",
    roomType: "거실",
    mainFolder: "코타라CTC",
    mainCleanFolder: "KotaraCTC",
    detailFolder: "코타라CTC",
    mainImages: [
      { file: "코타라CTC_0000_블랙다크코코아.webp", color: "블랙다크코코아", price: 620000 },
      { file: "코타라CTC_0001_화이트티크.webp", color: "화이트티크", price: 620000 },
      { file: "코타라CTC_0002_화이트.webp", color: "화이트", price: 620000 },
    ],
    detailImages: ["KotaraCTC_1.webp", "KotaraCTC_2.webp", "KotaraCTC_3.webp", "KotaraCTC_4.webp"],
  },
  {
    id: "fraser",
    name: "프레이저",
    minHeight: "2.3m 이상",
    roomType: "거실",
    mainFolder: "프레이저",
    mainCleanFolder: "Fraser",
    detailFolder: "프레이저",
    mainImages: [
      { file: "프레이저_0000_화이트.webp", color: "화이트", price: 490000 },
    ],
    detailImages: ["Fraser_1.webp", "Fraser_2.webp", "Fraser_3.webp", "Fraser_4.webp"],
  },
  {
    id: "tiwi-connect",
    name: "티위 커넥트",
    minHeight: "2.3m 이상",
    roomType: "침실/서재/작은방",
    mainFolder: "티위커넥트",
    mainCleanFolder: "TiwiConnect",
    detailFolder: "티위커넥트",
    mainImages: [
      { file: "티위커넥트_0000_화이트오크.webp", color: "화이트오크", price: 420000 },
      { file: "티위커넥트_0001_화이트.webp", color: "화이트", price: 420000 },
    ],
    detailImages: ["Tiwi_1.webp", "Tiwi_2.webp", "Tiwi_3.webp", "Tiwi_4.webp"],
  },

  // ── 2.4m 이상 ─────────────────────────────────────
  {
    id: "londo",
    name: "론도",
    minHeight: "2.4m 이상",
    roomType: "거실",
    mainFolder: "론도",
    mainCleanFolder: "Londo",
    detailFolder: "론도",
    mainImages: [
      { file: "론도_0000_매트화이트.webp", color: "매트화이트", price: 510000 },
      { file: "론도_0000_크롬티크.webp", color: "크롬티크", price: 510000 },
    ],
    detailImages: ["Londo_1.webp", "Londo_2.webp", "Londo_3.webp", "Londo_4.webp"],
  },
  {
    id: "whitehaven-plus",
    name: "화이트헤이븐+",
    minHeight: "2.4m 이상",
    roomType: "거실",
    mainFolder: "화이트헤이븐플러스",
    mainCleanFolder: "WhitehavenPlus",
    detailFolder: "화이트헤이븐플러스",
    mainImages: [
      { file: "화이트헤이븐플러스_0000_블랙.webp", color: "블랙", price: 550000 },
      { file: "화이트헤이븐플러스_0001_크롬우드.webp", color: "크롬우드", price: 590000 },
      { file: "화이트헤이븐플러스_0002_화이트오크.webp", color: "화이트오크", price: 550000 },
      { file: "화이트헤이븐플러스_0003_화이트.webp", color: "화이트", price: 550000 },
    ],
    detailImages: ["WhitehavenPlus_1.webp", "WhitehavenPlus_2.webp", "WhitehavenPlus_3.webp", "WhitehavenPlus_4.webp"],
  },
  {
    id: "whitehaven-plus-mini",
    name: "화이트헤이븐+ mini",
    minHeight: "2.4m 이상",
    roomType: "침실/서재/작은방",
    mainFolder: "화이트헤이블플러스mini",
    mainCleanFolder: "WhitehavenPlusMini",
    detailFolder: "화이트헤이블플러스mini",
    mainImages: [
      { file: "화이트헤이븐플러스미니_0000_크롬우드.webp", color: "크롬우드", price: 580000 },
      { file: "화이트헤이븐플러스미니_0001_화이트.webp", color: "화이트", price: 520000 },
    ],
    detailImages: ["WhiteHavenPlusMini_1.webp", "WhiteHavenPlusMini_2.webp", "WhiteHavenPlusMini_3.webp", "WhiteHavenPlusMini_4.webp"],
  },

  // ── 2.5m 이상 ─────────────────────────────────────
  {
    id: "nordic",
    name: "노르딕",
    minHeight: "2.5m 이상",
    roomType: "큰 평수 거실/상업공간",
    mainFolder: "노르딕",
    mainCleanFolder: "Nordic",
    detailFolder: "노르딕",
    mainImages: [
      { file: "1_0000_화이트오크.webp", color: "화이트오크", price: 780000 },
      { file: "1_0001_브론즈.webp", color: "브론즈", price: 780000 },
      { file: "1_0002_블랙.webp", color: "블랙", price: 780000 },
    ],
    detailImages: ["Nordic_1.webp", "Nordic_2.webp", "Nordic_3.webp", "Nordic_4.webp"],
  },
  {
    id: "akmani",
    name: "아크마니",
    minHeight: "2.5m 이상",
    roomType: "큰 평수 거실/상업공간",
    mainFolder: "아크마니",
    mainCleanFolder: "Akmani",
    detailFolder: "아크마니",
    mainImages: [
      { file: "아크마니_0000_블랙.webp", color: "블랙", price: 820000 },
      { file: "아크마니_0001_브론즈코아.webp", color: "브론즈코아", price: 820000 },
      { file: "아크마니_0002_크롬티크.webp", color: "크롬티크", price: 820000 },
    ],
    detailImages: ["Akmani_1.webp", "Akmani_2.webp", "Akmani_3.webp", "Akmani_4.webp"],
  },
  {
    id: "kotara-rod",
    name: "코타라ROD",
    minHeight: "2.5m 이상",
    roomType: "거실",
    mainFolder: "코타라ROD",
    mainCleanFolder: "KotaraROD",
    detailFolder: "코타라ROD",
    mainImages: [
      { file: "코타라ROD_0000_블랙다크코코아.webp", color: "블랙다크코코아", price: 620000 },
      { file: "코타라ROD_0001_화이트티크.webp", color: "화이트티크", price: 620000 },
      { file: "코타라ROD_0002_화이트.webp", color: "화이트", price: 620000 },
    ],
    detailImages: ["KotaraROD_1.webp", "KotaraROD_2.webp", "KotaraROD_3.webp", "KotaraROD_4.webp"],
  },
  {
    id: "climate2",
    name: "클라이메이트2",
    minHeight: "2.5m 이상",
    roomType: "거실",
    mainFolder: "클라이메이트2",
    mainCleanFolder: "Climate2",
    detailFolder: "클라이메이트2",
    mainImages: [
      { file: "클라이메이트2_0000_차콜.webp", color: "차콜", price: 590000 },
      { file: "클라이메이트2_0001_화이트.webp", color: "화이트", price: 590000 },
    ],
    detailImages: ["Climate2_1.webp", "Climate2_2.webp", "Climate2_3.webp", "Climate2_4.webp"],
  },
  {
    id: "peregrine",
    name: "페레그린",
    minHeight: "2.5m 이상",
    roomType: "큰 평수 거실/상업공간",
    mainFolder: "페레그린",
    mainCleanFolder: "Peregrine",
    detailFolder: "페레그린",
    mainImages: [
      { file: "페레그린_0000_블랙.webp", color: "블랙", price: 720000 },
      { file: "페레그린_0001_화이트.webp", color: "화이트", price: 720000 },
    ],
    detailImages: ["Peregrine_1.webp", "Peregrine_2.webp", "Peregrine_3.webp", "Peregrine_4.webp"],
  },
];

export function getFanProduct(id: string): FanProduct | undefined {
  return FAN_PRODUCTS.find((p) => p.id === id);
}
