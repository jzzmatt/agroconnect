export interface AngolaProvince {
  /** Stable relationship id, e.g. AO-BGU */
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  capital: string;
  latitude: number;
  longitude: number;
  agriculturalFocus: string[];
  /** Tuned label anchor (not necessarily centroid) */
  labelLatitude: number;
  labelLongitude: number;
  fillColor: string;
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
 * 21 provinces of Angola (Lei n.º 14/24 — current administrative division).
 */
export const ANGOLA_PROVINCES: AngolaProvince[] = [
  {
    id: "AO-BGO",
    code: "BGO",
    name: "Bengo",
    normalizedName: "bengo",
    capital: "Caxito",
    latitude: -8.5833,
    longitude: 14.3333,
    labelLatitude: -8.65,
    labelLongitude: 14.25,
    fillColor: "#3E7130",
    agriculturalFocus: ["Banana", "Mandioca", "Cana-de-açúcar", "Hortícolas"],
  },
  {
    id: "AO-BGU",
    code: "BGU",
    name: "Benguela",
    normalizedName: "benguela",
    capital: "Benguela",
    latitude: -12.5833,
    longitude: 13.4167,
    labelLatitude: -12.85,
    labelLongitude: 13.55,
    fillColor: "#718333",
    agriculturalFocus: ["Milho", "Feijão", "Fruticultura", "Pesca e Aquacultura"],
  },
  {
    id: "AO-BIE",
    code: "BIE",
    name: "Bié",
    normalizedName: "bie",
    capital: "Kuito",
    latitude: -12.3833,
    longitude: 17.3,
    labelLatitude: -12.55,
    labelLongitude: 17.1,
    fillColor: "#68732D",
    agriculturalFocus: ["Milho", "Trigo", "Arroz", "Soja", "Feijão"],
  },
  {
    id: "AO-CAB",
    code: "CAB",
    name: "Cabinda",
    normalizedName: "cabinda",
    capital: "Cabinda",
    latitude: -5.55,
    longitude: 12.2,
    labelLatitude: -5.45,
    labelLongitude: 12.35,
    fillColor: "#A18B2F",
    agriculturalFocus: ["Café", "Cacau", "Palmeira de Dendém", "Mandioca"],
  },
  {
    id: "AO-CUA",
    code: "CUA",
    name: "Cuando",
    normalizedName: "cuando",
    capital: "Mavinga",
    latitude: -15.85,
    longitude: 21.2,
    labelLatitude: -15.6,
    labelLongitude: 21.0,
    fillColor: "#C49A32",
    agriculturalFocus: ["Milho", "Massango", "Pecuária"],
  },
  {
    id: "AO-CNO",
    code: "CNO",
    name: "Cuanza Norte",
    normalizedName: "cuanza norte",
    capital: "Ndalatando",
    latitude: -9.25,
    longitude: 15.0,
    labelLatitude: -9.1,
    labelLongitude: 14.85,
    fillColor: "#D9B13C",
    agriculturalFocus: ["Café Robusta", "Palma de Dendém", "Fruticultura"],
  },
  {
    id: "AO-CUS",
    code: "CUS",
    name: "Cuanza Sul",
    normalizedName: "cuanza sul",
    capital: "Sumbe",
    latitude: -11.0,
    longitude: 15.0,
    labelLatitude: -11.35,
    labelLongitude: 14.75,
    fillColor: "#B95E45",
    agriculturalFocus: ["Café", "Milho", "Palma de Dendém", "Pecuária Bovina"],
  },
  {
    id: "AO-CUB",
    code: "CUB",
    name: "Cubango",
    normalizedName: "cubango",
    capital: "Menongue",
    latitude: -15.5,
    longitude: 18.2,
    labelLatitude: -15.35,
    labelLongitude: 17.85,
    fillColor: "#A84D42",
    agriculturalFocus: ["Milho", "Massambala", "Pecuária"],
  },
  {
    id: "AO-CNN",
    code: "CNN",
    name: "Cunene",
    normalizedName: "cunene",
    capital: "Ondjiva",
    latitude: -16.5,
    longitude: 16.0,
    labelLatitude: -16.75,
    labelLongitude: 15.85,
    fillColor: "#D97735",
    agriculturalFocus: ["Pecuária Bovina", "Massango", "Massambala"],
  },
  {
    id: "AO-HUA",
    code: "HUA",
    name: "Huambo",
    normalizedName: "huambo",
    capital: "Huambo",
    latitude: -12.7833,
    longitude: 15.7333,
    labelLatitude: -12.65,
    labelLongitude: 15.55,
    fillColor: "#3E7130",
    agriculturalFocus: ["Milho", "Batata", "Feijão", "Hortícolas", "Avicultura"],
  },
  {
    id: "AO-HUI",
    code: "HUI",
    name: "Huíla",
    normalizedName: "huila",
    capital: "Lubango",
    latitude: -14.9167,
    longitude: 13.55,
    labelLatitude: -15.05,
    labelLongitude: 13.35,
    fillColor: "#E87557",
    agriculturalFocus: ["Milho", "Massambala", "Pecuária de Corte e Leite", "Fruticultura de Altitude"],
  },
  {
    id: "AO-IEB",
    code: "IEB",
    name: "Icolo e Bengo",
    normalizedName: "icolo e bengo",
    capital: "Catete",
    latitude: -9.15,
    longitude: 13.75,
    labelLatitude: -9.05,
    labelLongitude: 13.65,
    fillColor: "#F5D98A",
    agriculturalFocus: ["Hortícolas", "Avicultura", "Cintura Verde"],
  },
  {
    id: "AO-LUA",
    code: "LUA",
    name: "Luanda",
    normalizedName: "luanda",
    capital: "Luanda",
    latitude: -8.8383,
    longitude: 13.2344,
    labelLatitude: -8.92,
    labelLongitude: 13.15,
    fillColor: "#718333",
    agriculturalFocus: ["Agro-indústria", "Cintura Verde Hortícola", "Distribuição"],
  },
  {
    id: "AO-LNO",
    code: "LNO",
    name: "Lunda Norte",
    normalizedName: "lunda norte",
    capital: "Dundo",
    latitude: -8.5,
    longitude: 19.5,
    labelLatitude: -8.35,
    labelLongitude: 19.25,
    fillColor: "#A18B2F",
    agriculturalFocus: ["Mandioca", "Milho", "Piscicultura"],
  },
  {
    id: "AO-LSU",
    code: "LSU",
    name: "Lunda Sul",
    normalizedName: "lunda sul",
    capital: "Saurimo",
    latitude: -10.5,
    longitude: 20.5,
    labelLatitude: -10.25,
    labelLongitude: 20.15,
    fillColor: "#C49A32",
    agriculturalFocus: ["Mandioca", "Arroz", "Amendoim"],
  },
  {
    id: "AO-MAL",
    code: "MAL",
    name: "Malanje",
    normalizedName: "malanje",
    capital: "Malanje",
    latitude: -9.5333,
    longitude: 16.35,
    labelLatitude: -9.65,
    labelLongitude: 16.15,
    fillColor: "#68732D",
    agriculturalFocus: ["Mandioca", "Milho", "Soja", "Algodão", "Cana-de-açúcar"],
  },
  {
    id: "AO-MOX",
    code: "MOX",
    name: "Moxico",
    normalizedName: "moxico",
    capital: "Luena",
    latitude: -12.0,
    longitude: 18.5,
    labelLatitude: -12.25,
    labelLongitude: 18.2,
    fillColor: "#B95E45",
    agriculturalFocus: ["Mandioca", "Arroz", "Milho", "Mel"],
  },
  {
    id: "AO-MXL",
    code: "MXL",
    name: "Moxico Leste",
    normalizedName: "moxico leste",
    capital: "Cazombo",
    latitude: -11.9,
    longitude: 22.0,
    labelLatitude: -11.75,
    labelLongitude: 21.6,
    fillColor: "#D97735",
    agriculturalFocus: ["Mandioca", "Arroz", "Mel"],
  },
  {
    id: "AO-NAM",
    code: "NAM",
    name: "Namibe",
    normalizedName: "namibe",
    capital: "Moçâmedes",
    latitude: -15.1961,
    longitude: 12.1522,
    labelLatitude: -15.45,
    labelLongitude: 12.35,
    fillColor: "#D9B13C",
    agriculturalFocus: ["Tomate", "Azeitona", "Uva", "Caprinocultura", "Pesca"],
  },
  {
    id: "AO-UIG",
    code: "UIG",
    name: "Uíge",
    normalizedName: "uige",
    capital: "Uíge",
    latitude: -7.6167,
    longitude: 15.05,
    labelLatitude: -7.45,
    labelLongitude: 14.85,
    fillColor: "#3E7130",
    agriculturalFocus: ["Café Robusta", "Mandioca", "Amendoim", "Frutas Tropicais"],
  },
  {
    id: "AO-ZAI",
    code: "ZAI",
    name: "Zaire",
    normalizedName: "zaire",
    capital: "Mbanza Kongo",
    latitude: -6.2667,
    longitude: 14.2333,
    labelLatitude: -6.55,
    labelLongitude: 14.05,
    fillColor: "#718333",
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
  { code: "IEB-CAT", name: "Catete", provinceCode: "IEB", provinceName: "Icolo e Bengo", latitude: -9.15, longitude: 13.75 },
  { code: "CUB-MEN", name: "Menongue", provinceCode: "CUB", provinceName: "Cubango", latitude: -15.5, longitude: 18.2 },
  { code: "CUA-MAV", name: "Mavinga", provinceCode: "CUA", provinceName: "Cuando", latitude: -15.85, longitude: 21.2 },
  { code: "MXL-CAZ", name: "Cazombo", provinceCode: "MXL", provinceName: "Moxico Leste", latitude: -11.9, longitude: 22.0 },

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
