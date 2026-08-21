-- ==============================================================================
-- AGROCONNECT — Angola Reference Geographic Seed Data: Provinces
-- Official 18 Provinces of Angola (ISO 3166-2:AO)
-- ==============================================================================

INSERT INTO public.locations (
  country_code,
  country_name,
  province_code,
  province_name,
  latitude,
  longitude
) VALUES
  ('AO', 'Angola', 'BGO', 'Bengo', -8.5833, 14.3333),
  ('AO', 'Angola', 'BGU', 'Benguela', -12.5833, 13.4167),
  ('AO', 'Angola', 'BIE', 'Bié', -12.3833, 17.3000),
  ('AO', 'Angola', 'CAB', 'Cabinda', -5.5500, 12.2000),
  ('AO', 'Angola', 'CCU', 'Cuando Cubango', -15.5000, 19.5000),
  ('AO', 'Angola', 'CNO', 'Cuanza Norte', -9.2500, 15.0000),
  ('AO', 'Angola', 'CUS', 'Cuanza Sul', -11.0000, 15.0000),
  ('AO', 'Angola', 'CNN', 'Cunene', -16.5000, 16.0000),
  ('AO', 'Angola', 'HUA', 'Huambo', -12.7833, 15.7333),
  ('AO', 'Angola', 'HUI', 'Huíla', -14.9167, 13.5500),
  ('AO', 'Angola', 'LUA', 'Luanda', -8.8383, 13.2344),
  ('AO', 'Angola', 'LNO', 'Lunda Norte', -8.5000, 19.5000),
  ('AO', 'Angola', 'LSU', 'Lunda Sul', -10.5000, 20.5000),
  ('AO', 'Angola', 'MAL', 'Malanje', -9.5333, 16.3500),
  ('AO', 'Angola', 'MOX', 'Moxico', -12.0000, 20.0000),
  ('AO', 'Angola', 'NAM', 'Namibe', -15.1961, 12.1522),
  ('AO', 'Angola', 'UIG', 'Uíge', -7.6167, 15.0500),
  ('AO', 'Angola', 'ZAI', 'Zaire', -6.2667, 14.2333)
ON CONFLICT DO NOTHING;
