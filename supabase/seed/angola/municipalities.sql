-- ==============================================================================
-- AGROCONNECT — Angola Reference Geographic Seed Data: Key Municipalities
-- Representative municipalities across agricultural hubs
-- ==============================================================================

INSERT INTO public.locations (
  country_code,
  country_name,
  province_code,
  province_name,
  municipality_code,
  municipality_name,
  latitude,
  longitude
) VALUES
  -- Luanda
  ('AO', 'Angola', 'LUA', 'Luanda', 'LUA-BEL', 'Belas', -8.9950, 13.1600),
  ('AO', 'Angola', 'LUA', 'Luanda', 'LUA-CAC', 'Cacuaco', -8.7800, 13.3600),
  ('AO', 'Angola', 'LUA', 'Luanda', 'LUA-VIA', 'Viana', -8.9050, 13.3700),
  ('AO', 'Angola', 'LUA', 'Luanda', 'LUA-TAL', 'Talatona', -8.9167, 13.1833),
  ('AO', 'Angola', 'LUA', 'Luanda', 'LUA-IBA', 'Icolo e Bengo', -9.1000, 13.6000),

  -- Huambo (Major Agricultural Hub)
  ('AO', 'Angola', 'HUA', 'Huambo', 'HUA-HUA', 'Huambo', -12.7833, 15.7333),
  ('AO', 'Angola', 'HUA', 'Huambo', 'HUA-CAI', 'Caála', -12.8525, 15.5606),
  ('AO', 'Angola', 'HUA', 'Huambo', 'HUA-BAI', 'Bailundo', -12.1833, 15.8667),
  ('AO', 'Angola', 'HUA', 'Huambo', 'HUA-LON', 'Longonjo', -12.9167, 15.2500),

  -- Huíla (Livestock & Agriculture)
  ('AO', 'Angola', 'HUI', 'Huíla', 'HUI-LUB', 'Lubango', -14.9167, 13.5500),
  ('AO', 'Angola', 'HUI', 'Huíla', 'HUI-MAT', 'Matala', -15.0000, 15.0333),
  ('AO', 'Angola', 'HUI', 'Huíla', 'HUI-CHI', 'Chibia', -15.1833, 13.7000),
  ('AO', 'Angola', 'HUI', 'Huíla', 'HUI-HMP', 'Humpata', -15.0167, 13.3667),

  -- Benguela (Coastal & Valley Agriculture)
  ('AO', 'Angola', 'BGU', 'Benguela', 'BGU-BGU', 'Benguela', -12.5833, 13.4167),
  ('AO', 'Angola', 'BGU', 'Benguela', 'BGU-LOB', 'Lobito', -12.3500, 13.5333),
  ('AO', 'Angola', 'BGU', 'Benguela', 'BGU-CAT', 'Catumbela', -12.4333, 13.5500),
  ('AO', 'Angola', 'BGU', 'Benguela', 'BGU-GHA', 'Ganda', -13.0333, 14.6333),

  -- Malanje (Grains, Cassava & Livestock)
  ('AO', 'Angola', 'MAL', 'Malanje', 'MAL-MAL', 'Malanje', -9.5333, 16.3500),
  ('AO', 'Angola', 'MAL', 'Malanje', 'MAL-CAC', 'Cacuso', -9.4167, 15.7500),
  ('AO', 'Angola', 'MAL', 'Malanje', 'MAL-CAL', 'Calandula', -9.1333, 15.9500),

  -- Cuanza Sul (Coffee & Horticulture)
  ('AO', 'Angola', 'CUS', 'Cuanza Sul', 'CUS-SUM', 'Sumbe', -11.2000, 13.8500),
  ('AO', 'Angola', 'CUS', 'Cuanza Sul', 'CUS-POR', 'Porto Amboim', -10.7333, 13.7667),
  ('AO', 'Angola', 'CUS', 'Cuanza Sul', 'CUS-GAB', 'Gabela (Amboim)', -10.7833, 14.3667),
  ('AO', 'Angola', 'CUS', 'Cuanza Sul', 'CUS-WAK', 'Waku Kungo (Cela)', -11.4167, 15.1167),

  -- Uíge (Coffee, Cassava, Fruits)
  ('AO', 'Angola', 'UIG', 'Uíge', 'UIG-UIG', 'Uíge', -7.6167, 15.0500),
  ('AO', 'Angola', 'UIG', 'Uíge', 'UIG-NEG', 'Negage', -7.7667, 15.2667),

  -- Bié (Central Plateau Agriculture)
  ('AO', 'Angola', 'BIE', 'Bié', 'BIE-KUI', 'Kuito', -12.3833, 17.3000),
  ('AO', 'Angola', 'BIE', 'Bié', 'BIE-AND', 'Andulo', -11.4833, 16.6833)
ON CONFLICT DO NOTHING;
