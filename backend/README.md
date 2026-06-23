---
title: Zarni Solar Backend
emoji: ☀️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
---

# Zarni Solar — Backend API

FastAPI backend for the Solar ESS Proposal Generator. Merges client project
data into the ZARNI branded 27-slide PowerPoint template and exports a
downloadable `.pptx`.

This Space is deployed via Docker. The frontend is hosted separately and
points at this Space's URL via its `VITE_API_BASE` environment variable.

See the main repository for full documentation:
https://github.com/acsconsult26/ZarniSolar

## Notes
- Storage is ephemeral on the free tier: saved projects and uploaded images
  reset whenever the Space restarts or rebuilds. Fine for testing/demos.
- Slide-19 AI image generation requires `IMAGE_GEN_PROVIDER` and
  `IMAGE_GEN_API_KEY` to be set as Space secrets; otherwise the UI falls back
  to manual image upload.
