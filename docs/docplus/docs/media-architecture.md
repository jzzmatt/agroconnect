# AgriConnect Media Architecture

ImageKit and Bunny Stream are retired. Do not add their SDKs, API clients, webhooks, environment variables, or stored identifiers.

## Provider split

### Supabase Storage
Private buckets and signed URLs for:

- product images
- product short videos
- profile and provider images
- transport media
- uploaded lesson files
- course thumbnails
- other application media that the app stores as bytes

### YouTube Unlisted
AgriAcademy training videos only. Lesson playback uses a YouTube video id stored on the lesson. The app does not proxy those bytes.

## Data model
Supabase stores durable media metadata and the object bytes for the buckets above.
YouTube stores and delivers Academy training video.

Recommended metadata:

- id
- owner_profile_id
- entity_type
- entity_id
- provider (`supabase_storage` for stored objects)
- storage_key / storage path
- url or playback metadata issued as a signed URL
- mime_type
- file_size
- dimensions or duration where applicable
- status
- metadata JSONB — extras that are not queried, filtered, joined, or constrained
- created_at
- updated_at

Rows and URLs that pointed only at ImageKit or Bunny are removed by `supabase/migrations/20261028140000_remove_imagekit_bunny.sql`. Until that migration is applied, `isRetiredMediaUrl()` refuses hosts `imagekit.io`, `b-cdn.net`, `bunnycdn.com`, and `mediadelivery.net`.

## Upload
Product short videos use a direct signed upload to the private product-media bucket. The server validates ownership and entitlements, inserts a `product_videos` row with provider `supabase_storage` and status `uploading`, and returns `signedUrl` plus `storagePath`. The browser uploads the bytes. `/api/products/video/complete` confirms the same storage path and marks the row ready. Playback is a signed URL, rendered by `ProductVideoPlayer`.

Product images (≤5 MB) use the multipart route `/api/products/images`. The server writes the object to Supabase Storage and stores the metadata. It does not call an external media API.

## Security
Supabase service credentials stay server-side. Signed upload and display URLs are short-lived. Protected Academy playback checks course access before showing the YouTube player. There is no ImageKit or Bunny webhook.

## Durability
Never use process-local Map/Set/global state as the source of truth for media, subscriptions, products, courses, enrollments, orders, or permissions.

## Environment
Media storage uses the existing Supabase server configuration (`SUPABASE_SERVICE_ROLE_KEY` and the project URL). Do not add `IMAGEKIT_*` or `BUNNY_STREAM_*` variables.
