export interface AngolaProvince {
  code: string;
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
  agriculturalFocus: string[];
}

export interface AngolaMunicipality {
  code: string;
  name: string;
  provinceCode: string;
  provinceName: string;
  latitude: number;
  longitude: number;
}

export const ANGOLA_COUNTRY_CODE = "AO";
export const ANGOLA_COUNTRY_NAME = "Angola";
export const ANGOLA_CURRENCY_CODE = "AOA";
export const ANGOLA_CURRENCY_SYMBOL = "Kz";

/**
 * All 18 Official Provinces of Angola with coordinates and agricultural characteristics
 */
export const ANGOLA_PROVINCES: AngolaProvince[] = [
  {
    code: "BGO",
    name: "Bengo",
    capital: "Caxito",
    latitude: -8.5833,
    longitude: 14.3333,
    agriculturalFocus: ["Banana", "Mandioca", "Cana-de-açúcar", "Hortícolas"],
  },
  {
    code: "BGU",
    name: "Benguela",
    capital: "Benguela",
    latitude: -12.5833,
    longitude: 13.4167,
    agriculturalFocus: ["Milho", "Feijão", "Fruticultura", "Pesca e Aquacultura"],
  },
  {
    code: "BIE",
    name: "Bié",
    capital: "Kuito",
    latitude: -12.3833,
    longitude: 17.3000,
    agriculturalFocus: ["Milho", "Trigo", "Arroz", "Soja", "Feijão"],
  },
  {
    code: "CAB",
    name: "Cabinda",
    capital: "Cabinda",
    latitude: -5.5500,
    longitude: 12.2000,
    agriculturalFocus: ["Café", "Cacau", "Palmeira de Dendém", "Mandioca"],
  },
  {
    code: "CCU",
    name: "Cuando Cubango",
    capital: "Menongue",
    latitude: -15.5000,
    longitude: 19.5000,
    agriculturalFocus: ["Milho", "Massango", "Massambala", "Pecuária"],
  },
  {
    code: "CNO",
    name: "Cuanza Norte",
    capital: "Ndalatando",
    latitude: -9.2500,
    longitude: 15.0000,
    agriculturalFocus: ["Café Robusta", "Palma de Dendém", "Fruticultura"],
  },
  {
    code: "CUS",
    name: "Cuanza Sul",
    capital: "Sumbe",
    latitude: -11.0000,
    longitude: 15.0000,
    agriculturalFocus: ["Café", "Milho", "Palma de Dendém", "Pecuária Bovina"],
  },
  {
    code: "CNN",
    name: "Cunene",
    capital: "Ondjiva",
    latitude: -16.5000,
    longitude: 16.0000,
    agriculturalFocus: ["Pecuária Bovina", "Massango", "Massambala"],
  },
  {
    code: "HUA",
    name: "Huambo",
    capital: "Huambo",
    latitude: -12.7833,
    longitude: 15.7333,
    agriculturalFocus: ["Milho", "Batata", "Feijão", "Hortícolas", "Avicultura"],
  },
  {
    code: "HUI",
    name: "Huíla",
    capital: "Lubango",
    latitude: -14.9167,
    longitude: 13.5500,
    agriculturalFocus: ["Milho", "Massambala", "Pecuária de Corte e Leite", "Fruticultura de Altitude"],
  },
  {
    code: "LUA",
    name: "Luanda",
    capital: "Luanda",
    latitude: -8.8383,
    longitude: 13.2344,
    agriculturalFocus: ["Agro-indústria", "Cintura Verde Hortícola", "Distribuição"],
  },
  {
    code: "LNO",
    name: "Lunda Norte",
    capital: "Dundo",
    latitude: -8.5000,
    longitude: 19.5000,
    agriculturalFocus: ["Mandioca", "Milho", "Piscicultura"],
  },
  {
    code: "LSU",
    name: "Lunda Sul",
    capital: "Saurimo",
    latitude: -10.5000,
    longitude: 20.5000,
    agriculturalFocus: ["Mandioca", "Arroz", "Amendoim"],
  },
  {
    code: "MAL",
    name: "Malanje",
    capital: "Malanje",
    latitude: -9.5333,
    longitude: 16.3500,
    agriculturalFocus: ["Mandioca", "Milho", "Soja", "Algodão", "Cana-de-açúcar"],
  },
  {
    code: "MOX",
    name: "Moxico",
    capital: "Luena",
    latitude: -12.0000,
    longitude: 20.0000,
    agriculturalFocus: ["Mandioca", "Arroz", "Milho", "Mel"],
  },
  {
    code: "NAM",
    name: "Namibe",
    capital: "Moçâmedes",
    latitude: -15.1961,
    longitude: 12.1522,
    agriculturalFocus: ["Tomate", "Azeitona", "Uva", "Caprinocultura", "Pesca"],
  },
  {
    code: "UIG",
    name: "Uíge",
    capital: "Uíge",
    latitude: -7.6167,
    longitude: 15.0500,
    agriculturalFocus: ["Café Robusta", "Mandioca", "Amendoim", "Frutas Tropicais"],
  },
  {
    code: "ZAI",
    name: "Zaire",
    capital: "Mbanza Kongo",
    latitude: -6.2667,
    longitude: 14.2333,
    agriculturalFocus: ["Mandioca", "Milho", "Banana", "Palma"],
  },
];

/**
 * Key Agricultural Municipalities of Angola
 */
export const ANGOLA_KEY_MUNICIPALITIES: AngolaMunicipality[] = [
  // Luanda
  { code: "LUA-BEL", name: "Belas", provinceCode: "LUA", provinceName: "Luanda", latitude: -8.995, longitude: 13.16 },
  { code: "LUA-CAC", name: "Cacuaco", provinceCode: "LUA", provinceName: "Luanda", latitude: -8.78, longitude: 13.36 },
  { code: "LUA-VIA", name: "Viana", provinceCode: "LUA", provinceName: "Luanda", latitude: -8.905, longitude: 13.37 },
  { code: "LUA-TAL", name: "Talatona", provinceCode: "LUA", provinceName: "Luanda", latitude: -8.9167, longitude: 13.1833 },
  { code: "LUA-IBA", name: "Icolo e Bengo", provinceCode: "LUA", provinceName: "Luanda", latitude: -9.1, longitude: 13.6 },

  // Huambo
  { code: "HUA-HUA", name: "Huambo", provinceCode: "HUA", provinceName: "Huambo", latitude: -12.7833, longitude: 15.7333 },
  { code: "HUA-CAI", name: "Caála", provinceCode: "HUA", provinceName: "Huambo", latitude: -12.8525, longitude: 15.5606 },
  { code: "HUA-BAI", name: "Bailundo", provinceCode: "HUA", provinceName: "Huambo", latitude: -12.1833, longitude: 15.8667 },
  { code: "HUA-LON", name: "Longonjo", provinceCode: "HUA", provinceName: "Huambo", latitude: -12.9167, longitude: 15.25 },

  // Huíla
  { code: "HUI-LUB", name: "Lubango", provinceCode: "HUI", provinceName: "Huíla", latitude: -14.9167, longitude: 13.55 },
  { code: "HUI-MAT", name: "Matala", provinceCode: "HUI", provinceName: "Huíla", latitude: -15.0, longitude: 15.0333 },
  { code: "HUI-CHI", name: "Chibia", provinceCode: "HUI", provinceName: "Huíla", latitude: -15.1833, longitude: 13.7 },
  { code: "HUI-HMP", name: "Humpata", provinceCode: "HUI", provinceName: "Huíla", latitude: -15.0167, longitude: 13.3667 },

  // Benguela
  { code: "BGU-BGU", name: "Benguela", provinceCode: "BGU", provinceName: "Benguela", latitude: -12.5833, longitude: 13.4167 },
  { code: "BGU-LOB", name: "Lobito", provinceCode: "BGU", provinceName: "Benguela", latitude: -12.35, longitude: 13.5333 },
  { code: "BGU-CAT", name: "Catumbela", provinceCode: "BGU", provinceName: "Benguela", latitude: -12.4333, longitude: 13.55 },
  { code: "BGU-GHA", name: "Ganda", provinceCode: "BGU", provinceName: "Benguela", latitude: -13.0333, longitude: 14.6333 },

  // Malanje
  { code: "MAL-MAL", name: "Malanje", provinceCode: "MAL", provinceName: "Malanje", latitude: -9.5333, longitude: 16.35 },
  { code: "MAL-CAC", name: "Cacuso", provinceCode: "MAL", provinceName: "Malanje", latitude: -9.4167, longitude: 15.75 },
  { code: "MAL-CAL", name: "Calandula", provinceCode: "MAL", provinceName: "Malanje", latitude: -9.1333, longitude: 15.95 },

  // Cuanza Sul
  { code: "CUS-SUM", name: "Sumbe", provinceCode: "CUS", provinceName: "Cuanza Sul", latitude: -11.2, longitude: 13.85 },
  { code: "CUS-POR", name: "Porto Amboim", provinceCode: "CUS", provinceName: "Cuanza Sul", latitude: -10.7333, longitude: 13.7667 },
  { code: "CUS-GAB", name: "Gabela (Amboim)", provinceCode: "CUS", provinceName: "Cuanza Sul", latitude: -10.7833, longitude: 14.3667 },
  { code: "CUS-WAK", name: "Waku Kungo (Cela)", provinceCode: "CUS", provinceName: "Cuanza Sul", latitude: -11.4167, longitude: 15.1167 },

  // Uíge
  { code: "UIG-UIG", name: "Uíge", provinceCode: "UIG", provinceName: "Uíge", latitude: -7.6167, longitude: 15.05 },
  { code: "UIG-NEG", name: "Negage", provinceCode: "UIG", provinceName: "Uíge", latitude: -7.7667, longitude: 15.2667 },

  // Bié
  { code: "BIE-KUI", name: "Kuito", provinceCode: "BIE", provinceName: "Bié", latitude: -12.3833, longitude: 17.3 },
  { code: "BIE-AND", name: "Andulo", provinceCode: "BIE", provinceName: "Bié", latitude: -11.4833, longitude: 16.6833 },
];
