# 0005. Owned exercise catalog from wger

## Status

Accepted

## Context

Live third-party exercise search was unreliable (silent empty results, wrong host defaults, volatile media URLs). Product requires Gymeasure to serve Exercises and images from our own systems.

## Decision

Import redistributable wger exercise records (English, Creative Commons) into a local `exercises` table and mirror static images to Gymeasure-owned Cloudflare R2 (or local `/media` in development). Runtime APIs read only Gymeasure storage. Per-item attribution is persisted and shown in the app.

## Consequences

- Catalog search works offline from the API database
- Import is an operator step, not a request-path dependency
- Share-alike/attribution obligations must be honored for adapted catalog content
- Custom exercises are removed from the product model
