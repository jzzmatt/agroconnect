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
- metadata JSONB
- created_at
- updated_at

## Upload
Prefer direct signed/browser uploads to the provider.
Application servers should issue authorization/signing information and persist metadata, not proxy large media unnecessarily.

## Security
Provider secrets are server-side only.
Protected Academy playback must verify course access before issuing/allowing playback.

## Durability
Never use process-local Map/Set/global state as the source of truth for media, subscriptions, products, courses, enrollments, orders or permissions.
