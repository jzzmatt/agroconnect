# AgriConnect Domain Map

The first three rows are capabilities of the Core Platform domain. Localization and the
four Agri/Commerce rows are domains in their own right. See `architecture-v2.md` for the
seven-domain list.

| Domain | Owns | Does not own |
|---|---|---|
| Identity | Clerk identity, profile bootstrap, roles | subscription rules, entitlements |
| Authorization | subscription resolution, entitlement resolution, capability guards | UI, roles |
| Media | provider abstraction, asset lifecycle, metadata | product/course business rules |
| AgriProfile | personal workspace at `/[userId]/agriprofile`, dashboard aggregation | product/course business logic |
| AgriShopping | products, sellers, inventory, product media | Academy |
| AgriAcademy | courses, sections, lessons, students, instructors, progress, certificates | Shopping |
| AgriExpert | experts, services, requests, appointments | Academy |
| Localization | geographic hierarchy, PostGIS, map/search primitives | business permissions |
| Commerce | cart, checkout, orders, payments, delivery | product definition |

## Cross-cutting functions
QA is a cross-cutting function, not a business domain: it owns automated validation and
regression across every domain and owns no business behaviour. Documentation is likewise
cross-cutting.

## Cross-domain rule
A domain may consume another domain's public service/contract, but must not directly manipulate its private internals.

Each domain owns its own types and publishes only the subset other domains may consume.
