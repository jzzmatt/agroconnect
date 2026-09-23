# Cursor Context Map

Use only the contexts relevant to the current task.

The rules in `.cursor/rules/` apply automatically, including `11-agridev.mdc`.
The agents in `.cursor/agents/` are live Cursor subagents and can be invoked by name,
for example `/authorization`.

@00-master
- .cursor/rules/00-master.mdc
- .cursor/rules/11-agridev.mdc
- docs/docplus/IMPLEMENTATION_STRATEGY.md
- docs/docplus/docs/architecture-v2.md

@01-foundation
- .cursor/agents/foundation.md
- .cursor/rules/01-architecture.mdc

@02-identity
- .cursor/agents/identity.md
- .cursor/rules/02-security.mdc

@03-authorization
- .cursor/agents/authorization.md
- .cursor/rules/04-authorization.mdc
- .cursor/rules/10-subscription.mdc
- docs/docplus/docs/authorization-model.md

@04-media
- .cursor/agents/media.md
- .cursor/rules/05-media.mdc
- docs/docplus/docs/media-architecture.md

@05-agriprofile
- .cursor/agents/agriprofile.md
- docs/docplus/docs/route-map.md

@06-agrishopping
- .cursor/agents/agrishopping.md
- docs/docplus/docs/route-map.md

@07-agriacademy
- .cursor/agents/agriacademy.md
- docs/docplus/docs/media-architecture.md
- docs/docplus/docs/authorization-model.md

@08-agriexpert
- .cursor/agents/agriexpert.md
- AgriService discovery: Expert, Services and Transport (not a rename-only of AgriExpert)

@09-localization
- .cursor/agents/localization.md
- Lead agent for Phase 10 AgriService

@10-commerce
- .cursor/agents/commerce.md

@11-qa
- .cursor/agents/qa.md
- .cursor/rules/08-testing.mdc

@12-docs
- .cursor/agents/documentation.md
- docs/docplus/docs/
