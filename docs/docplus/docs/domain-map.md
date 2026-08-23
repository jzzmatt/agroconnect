# AgriConnect Domain Map

| Domain | Owns | Does not own |
|---|---|---|
| Identity | Clerk identity, profile bootstrap, roles | subscription rules |
| Authorization | roles-to-capability resolution, entitlements, guards | UI |
| Media | provider abstraction, asset lifecycle, metadata | product/course business rules |
| AgriProfile | personal workspace, dashboard aggregation | product/course business logic |
| AgriShopping | products, sellers, inventory, product media | Academy |
| AgriAcademy | courses, sections, lessons, students, instructors, progress, certificates | Shopping |
| AgriExpert | experts, services, requests, appointments | Academy |
| Localization | geographic hierarchy, PostGIS, map/search primitives | business permissions |
| Commerce | cart, checkout, orders, payments, delivery | product definition |
| QA | automated validation and regression | business ownership |

## Cross-domain rule
A domain may consume another domain's public service/contract, but must not directly manipulate its private internals.
