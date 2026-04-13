/** 한국 거지맵 — 시드 데이터 · 지역 · 리뷰 단어 */

export type Category = "pub" | "restaurant" | "cafe";

export type MenuItem = { name: string; price: number };

export type Submission = {
  id: string;
  items: MenuItem[];
  photo?: string;
  review?: string;
  date: string;
};

export type Spot = {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  /** 시·도 단위 (필터용) */
  region: string;
  submissions: Submission[];
};

/** 지역별 필터 (광역시·도) */
export const KOREAN_REGIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type KoreanRegion = (typeof KOREAN_REGIONS)[number];

export const CATS: { id: Category; emoji: string; label: string; color: string }[] = [
  { id: "pub", emoji: "🍺", label: "술집", color: "#F59E0B" },
  { id: "restaurant", emoji: "🍽️", label: "식당", color: "#F43F5E" },
  { id: "cafe", emoji: "☕", label: "카페", color: "#A78BFA" },
];

/** 원화 기준 메뉴 1개 최대가 (저가 제보용) */
export const PRICE_CAPS: Record<Category, number> = {
  pub: 12_000,
  restaurant: 25_000,
  cafe: 10_000,
};

export const WORD_POOL = [
  "맛있", "별로", "최고", "실망", "딱좋", "그냥그래",
  "뜨거", "차가", "따뜻", "신선", "짜", "달",
  "쫄깃", "바삭", "부드", "얼큰", "담백", "느끼",
  "친절", "불친절", "깨끗", "저렴", "비쌈", "빨라",
  "느려", "북적", "한적", "분위기", "혼밥", "데이트",
];

export const FUNC_WORDS = ["이", "가", "을", "를", "은", "는", "도", "만", "와", "과", "너무", "좀"];

export const LS_KEY = "geojimap-kr-spots";

export const LS_SAVED = "geojimap-kr-saved";

export function formatKrw(n: number) {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

export const SEED_SPOTS: Spot[] = [
  {
    id: "kbk",
    name: "김밥천국 강남역점",
    category: "restaurant",
    lat: 37.4981,
    lng: 127.0276,
    address: "서울 강남구 강남대로",
    region: "서울",
    submissions: [
      {
        id: "s1",
        items: [
          { name: "참치김밥", price: 3500 },
          { name: "라면", price: 4500 },
        ],
        review: "너무 맛있 가격도 저렴",
        date: "2026-03-15",
      },
    ],
  },
  {
    id: "cu",
    name: "CU 편의점 커피",
    category: "cafe",
    lat: 37.5665,
    lng: 126.978,
    address: "서울 중구 세종대로",
    region: "서울",
    submissions: [
      {
        id: "s2",
        items: [{ name: "아메리카노", price: 1500 }],
        review: "가격이 딱좋 혼밥 도",
        date: "2026-02-20",
      },
    ],
  },
  {
    id: "hof",
    name: "포장마차 골목",
    category: "pub",
    lat: 37.5704,
    lng: 126.991,
    address: "서울 종로구 종로",
    region: "서울",
    submissions: [
      {
        id: "s3",
        items: [
          { name: "소주", price: 4000 },
          { name: "맥주 500ml", price: 4500 },
        ],
        review: "분위기 최고 저렴",
        date: "2026-04-01",
      },
    ],
  },
  {
    id: "busan",
    name: "국제시장 떡볶이",
    category: "restaurant",
    lat: 35.1028,
    lng: 129.0322,
    address: "부산 중구 국제시장",
    region: "부산",
    submissions: [
      {
        id: "s4",
        items: [{ name: "떡볶이", price: 3000 }, { name: "순대", price: 4000 }],
        review: "얼큰 맛있 가격도 저렴",
        date: "2026-01-22",
      },
    ],
  },
  {
    id: "jeju",
    name: "동문시장 과일주스",
    category: "cafe",
    lat: 33.5129,
    lng: 126.5278,
    address: "제주 제주시 동문로",
    region: "제주",
    submissions: [
      {
        id: "s5",
        items: [{ name: "한라봉주스", price: 5000 }],
        review: "신선 달달 최고",
        date: "2026-03-10",
      },
    ],
  },
  {
    id: "daegu",
    name: "서문시장 칼국수",
    category: "restaurant",
    lat: 35.8714,
    lng: 128.5911,
    address: "대구 중구 큰장로",
    region: "대구",
    submissions: [
      {
        id: "s6",
        items: [{ name: "칼국수", price: 7000 }],
        review: "따뜻 담백 맛있",
        date: "2026-02-14",
      },
    ],
  },
  {
    id: "gwangju",
    name: "충장로 카페거리",
    category: "cafe",
    lat: 35.1595,
    lng: 126.8526,
    address: "광주 동구 충장로",
    region: "광주",
    submissions: [
      {
        id: "s7",
        items: [{ name: "아인슈페너", price: 5500 }],
        review: "분위기 좋 달달",
        date: "2026-03-28",
      },
    ],
  },
  {
    id: "incheon",
    name: "차이나타운 짜장면",
    category: "restaurant",
    lat: 37.4753,
    lng: 126.6188,
    address: "인천 중구 차이나타운로",
    region: "인천",
    submissions: [
      {
        id: "s8",
        items: [{ name: "짜장면", price: 6000 }],
        review: "짜 맛있 가격 저렴",
        date: "2026-04-05",
      },
    ],
  },
  {
    id: "chuncheon",
    name: "춘천 명동 닭갈비골목",
    category: "restaurant",
    lat: 37.8813,
    lng: 127.7298,
    address: "강원 춘천시 후석동",
    region: "강원",
    submissions: [
      {
        id: "s9",
        items: [{ name: "닭갈비 1인", price: 12000 }],
        review: "뜨거 쫄깃 최고",
        date: "2026-03-01",
      },
    ],
  },
  {
    id: "suwon",
    name: "행궁동 한옥카페",
    category: "cafe",
    lat: 37.2819,
    lng: 127.0147,
    address: "경기 수원시 팔달구",
    region: "경기",
    submissions: [
      {
        id: "s10",
        items: [{ name: "핸드드립", price: 6000 }],
        review: "분위기 최고 조금 비쌈",
        date: "2026-02-28",
      },
    ],
  },
  {
    id: "jeonju",
    name: "한옥마을 빈대떡",
    category: "restaurant",
    lat: 35.815,
    lng: 127.1539,
    address: "전북 전주시 완산구",
    region: "전북",
    submissions: [
      {
        id: "s11",
        items: [{ name: "빈대떡", price: 8000 }],
        review: "바삭 뜨거 맛있",
        date: "2026-01-10",
      },
    ],
  },
  {
    id: "daejeon",
    name: "은행골목 포차",
    category: "pub",
    lat: 36.3504,
    lng: 127.3845,
    address: "대전 중구 은행동",
    region: "대전",
    submissions: [
      {
        id: "s12",
        items: [{ name: "맥주", price: 4000 }],
        review: "북적 분위기 저렴",
        date: "2026-03-20",
      },
    ],
  },
  {
    id: "ulsan",
    name: "태화강 삼겹살",
    category: "restaurant",
    lat: 35.5384,
    lng: 129.3114,
    address: "울산 남구 삼산로",
    region: "울산",
    submissions: [
      {
        id: "s13",
        items: [{ name: "삼겹살 1인분", price: 11000 }],
        review: "고기 신선 친절",
        date: "2026-02-05",
      },
    ],
  },
  {
    id: "changwon",
    name: "마산 아구찜골목",
    category: "restaurant",
    lat: 35.2271,
    lng: 128.6818,
    address: "경남 창원시 마산합포구",
    region: "경남",
    submissions: [
      {
        id: "s14",
        items: [{ name: "아구찜 소", price: 18000 }],
        review: "얼큰 맛있 가격은 좀",
        date: "2026-03-12",
      },
    ],
  },
  {
    id: "cheongju",
    name: "상당산성 막걸리",
    category: "pub",
    lat: 36.6424,
    lng: 127.489,
    address: "충북 청주시 상당구",
    region: "충북",
    submissions: [
      {
        id: "s15",
        items: [{ name: "막걸리", price: 3000 }],
        review: "달달 저렴 한적",
        date: "2026-01-30",
      },
    ],
  },
  {
    id: "pohang",
    name: "죽도시장 회센터",
    category: "restaurant",
    lat: 36.019,
    lng: 129.343,
    address: "경북 포항시 북구",
    region: "경북",
    submissions: [
      {
        id: "s16",
        items: [{ name: "모둠회 소", price: 20000 }],
        review: "신선 최고 가격은 비쌈",
        date: "2026-04-02",
      },
    ],
  },
  {
    id: "sejong",
    name: "세종 호수공원 푸드트럭",
    category: "cafe",
    lat: 36.504,
    lng: 127.265,
    address: "세종특별자치시 보람동",
    region: "세종",
    submissions: [
      {
        id: "s17",
        items: [{ name: "에이드", price: 5000 }],
        review: "뷰 좋 달달",
        date: "2026-03-08",
      },
    ],
  },
  {
    id: "yeosu",
    name: "여수 밤바다 횟집",
    category: "restaurant",
    lat: 34.7604,
    lng: 127.6622,
    address: "전남 여수시 돌산읍",
    region: "전남",
    submissions: [
      {
        id: "s18",
        items: [{ name: "회 소자", price: 15000 }],
        review: "바다뷰 최고 신선",
        date: "2026-02-18",
      },
    ],
  },
  {
    id: "cheonan",
    name: "천안 불당동 카페거리",
    category: "cafe",
    lat: 36.796,
    lng: 127.116,
    address: "충남 천안시 서북구",
    region: "충남",
    submissions: [
      {
        id: "s19",
        items: [{ name: "라떼", price: 4500 }],
        review: "분위기 좋 가격 딱좋",
        date: "2026-03-25",
      },
    ],
  },
];
