# AgriConnect Media Architecture

**Later supersession (Phase 7+):** AgriAcademy training video is **YouTube Unlisted**. AgroConnect stores only the Video ID and course/enrollment metadata. Instructors upload on YouTube and paste the URL. Bunny Stream is not an AgriAcademy provider from Phase 7 and must not remain as a fallback. ImageKit remains the product/application media provider, including course thumbnails. See `docs/agroconnect-updated-phases.md`.

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

### YouTube Unlisted (AgriAcademy training video)
Canonical provider for:
- AgriAcademy lesson/training videos

AgroConnect does not upload, store or transcode Academy video. It validates a YouTube URL, extracts the Video ID, and embeds the YouTube player after authentication and enrollment checks.

Unlisted YouTube videos can still be watched by anyone who obtains the URL. Enrollment gates the in-app learning experience; it cannot guarantee the URL is unshareable.

Deleting a course, chapter or lesson must never delete the YouTube video.

Do not use ImageKit or Bunny for AgriAcademy lesson video.

### Bunny Stream
Not used for AgriAcademy from Phase 7. Phase 4 historically introduced Bunny for Academy training video; that decision is superseded. Do not remove unrelated non-Academy Bunny usage if any exists.

Bunny must not be used for AgriShopping product short videos (those stay on ImageKit).

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
Protected Academy learning experiences must verify authentication and enrollment before displaying the YouTube player. Do not treat Unlisted visibility as equivalent to private DRM.

## Durability
Never use process-local Map/Set/global state as the source of truth for media, subscriptions, products, courses, enrollments, orders or permissions.

## Environment variables (Phase 4)

ImageKit (server-only private key; public key/URL endpoint may reach the client
as part of a signed upload authorization, never the private key):
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_URL_ENDPOINT`

Bunny Stream (historical Phase 4 AgriAcademy training video; remove Academy usage in Phase 7):
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_CDN_HOSTNAME`
- `BUNNY_STREAM_WEBHOOK_SECRET`

Phase 7 must not keep these as a required Academy playback path. Do not add a Bunny fallback. Unrelated non-Academy Bunny usage, if any, is out of Academy scope.

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
