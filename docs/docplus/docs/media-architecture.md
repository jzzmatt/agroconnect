# AgriConnect Media Architecture

## Provider split

### ImageKit
Canonical provider for:
- product images
- product short videos
- profile avatars
- provider/service images
- banners
- course thumbnails
- other general application media

### Bunny Stream
Canonical provider for:
- AgriAcademy training videos
- course lesson videos

Bunny must not be used for AgriShopping product short videos.

## Data model
Supabase stores durable media metadata.
Providers store/deliver the binary media.

Recommended metadata:
- id
- owner_profile_id
- entity_type
- entity_id
- provider
- external_id
- storage_key
- url/playback metadata
- mime_type
- file_size
- dimensions/duration where applicable
- status
- metadata JSONB — provider-specific extras only
- created_at
- updated_at

The `metadata JSONB` column is an escape hatch for provider-specific fields that carry no
relational meaning. It must not hold core relational data: anything queried, filtered,
joined or constrained gets a real column. This keeps the model consistent with
`.cursor/rules/03-database.mdc`, which forbids JSONB for core relational data.

## Upload
Prefer direct signed/browser uploads to the provider.
Application servers should issue authorization/signing information and persist metadata, not proxy large media unnecessarily.

## Security
Provider secrets are server-side only.
Protected Academy playback must verify course access before issuing/allowing playback.

## Durability
Never use process-local Map/Set/global state as the source of truth for media, subscriptions, products, courses, enrollments, orders or permissions.

## Environment variables (Phase 4)

ImageKit (server-only private key; public key/URL endpoint may reach the client
as part of a signed upload authorization, never the private key):
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_URL_ENDPOINT`

Bunny Stream (AgriAcademy training video only):
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_CDN_HOSTNAME`
- `BUNNY_STREAM_WEBHOOK_SECRET` — required, not optional. `/api/webhooks/bunny`
  verifies an HMAC-SHA256 signature over the raw request body
  (`X-BunnyStream-Signature`) using this secret and rejects with 401 when the
  secret is unset or the signature does not match. There is no unsigned
  fallback.

## Product video upload flow (ImageKit)

1. Server issues a short-lived signed upload authorization (`token`,
   `signature`, `expire`, `publicKey`) via `createImageKitUploadAuth`, after
   validating ownership/entitlements and creating a `product_videos` row with
   status `uploading`.
2. The browser uploads the file directly to ImageKit — the Next.js server
   never proxies the bytes.
3. The browser calls `/api/products/video/complete` with the ImageKit
   response (`fileId`, `url`, `thumbnailUrl`, `size`). The server re-checks
   ownership and transitions the row to `ready`. ImageKit uploads are
   synchronous, so there is no transcoding wait and no webhook for product
   video.

Product images are small enough (≤5 MB) that the existing multipart route
(`/api/products/images`) uploads server-side to ImageKit using the private
key, instead of adding a second signed-upload round trip for the same UI.
