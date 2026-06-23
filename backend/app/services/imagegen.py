"""Pluggable image-generation client for the slide-19 infographic.

Provider + key are read from environment so this can point at any
image-generation API without code changes. If no provider/key is configured,
generation fails cleanly and the caller falls back to manual upload.
"""
import base64
import os

import httpx

DEFAULT_PROMPT_TEMPLATE = """A clean, professional technical infographic titled "{site_name}: INTEGRATED HYBRID
SOLAR POWER MANAGEMENT SYSTEM", subtitle "SYSTEM SPECIFICATION & PERFORMANCE".

Horizontal left-to-right system flow with four labeled stages connected by arrows:
1. SOLAR PV — "TOTAL {total_solar_kwp} kWp", "{panel_qty} x {panel_watt}W {panel_brand} PANEL",
   icon of solar panels with sun.
2. INVERTER — "{inverter_qty} x {inverter_model}", white wall-mounted hybrid inverter unit.
3. BATTERY — "TOTAL {total_battery_kwh} kWh", "{battery_qty} x {battery_module} BATTERY",
   stacked battery cabinet.
4. GRID & LOAD — transmission tower for GRID; LOAD icons for {load_items};
   GENERATOR BACKUP unit below.

Below the flow, four dark benefit cards labeled A-D: "PRIORITIZING SOLAR USE",
"OPTIMIZING BATTERY LIFE", "MINIMIZING GRID & GENERATOR RELIANCE",
"ENSURING 24/7 UNINTERRUPTED OPERATION".

Style: corporate energy infographic, light blue / navy palette, flat vector icons,
clear sans-serif labels, 16:9, high detail, no watermark."""


class ImageGenError(Exception):
    pass


def render_prompt(template: str, values: dict) -> str:
    try:
        return template.format(**values)
    except KeyError as e:
        raise ImageGenError(f"Prompt template references unknown field: {e}")


def generate_image(prompt: str) -> bytes:
    """Calls the configured provider. Currently supports OpenAI-compatible
    image endpoints (IMAGE_GEN_PROVIDER=openai) via IMAGE_GEN_API_KEY /
    IMAGE_GEN_API_BASE / IMAGE_GEN_MODEL env vars. Raises ImageGenError on
    any failure so the caller can offer manual upload instead.
    """
    provider = os.environ.get("IMAGE_GEN_PROVIDER", "").lower()
    api_key = os.environ.get("IMAGE_GEN_API_KEY")
    if not provider or not api_key:
        raise ImageGenError("Image generation not configured (IMAGE_GEN_PROVIDER / IMAGE_GEN_API_KEY missing)")

    if provider == "openai":
        base_url = os.environ.get("IMAGE_GEN_API_BASE", "https://api.openai.com/v1")
        model = os.environ.get("IMAGE_GEN_MODEL", "gpt-image-1")
        try:
            resp = httpx.post(
                f"{base_url}/images/generations",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "prompt": prompt, "size": "1536x1024"},
                timeout=120,
            )
            resp.raise_for_status()
            payload = resp.json()
            b64 = payload["data"][0]["b64_json"]
            return base64.b64decode(b64)
        except Exception as e:
            raise ImageGenError(str(e))

    raise ImageGenError(f"Unsupported IMAGE_GEN_PROVIDER: {provider}")
