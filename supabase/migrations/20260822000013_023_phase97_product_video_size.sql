-- Allow optimized 60s product videos up to the application 40 MB cap.
ALTER TABLE public.product_videos DROP CONSTRAINT IF EXISTS product_videos_file_size_check;
ALTER TABLE public.product_videos
  ADD CONSTRAINT product_videos_file_size_check
  CHECK (file_size >= 0 AND file_size <= 41943040);
