# Phase 6 — AgriShopping Prompt

@00-master
@03-authorization
@04-media
@06-agrishopping
@09-localization
@10-commerce
@11-qa

Refactor existing AgriShopping rather than rebuilding it.

Target product experience:
- optimized ImageKit image
- optional optimized ImageKit short video
- mini localization
- price/unit
- name
- category
- stock
- owner/vendor
- product detail with vendor and localization

Vendor routes:
 /[userId]/agriprofile/products
 /[userId]/agriprofile/products/[productId]

Preserve existing product data model where possible.
Do not duplicate cart/checkout logic.
