import json
import requests
import time

# Configuration
BASE_URL = "https://www.opencatalog.sh"
HEADERS = {
    "Content-Type": "application/json",
    "X-Submit-Source": "ai-agent",
    "X-Submit-Identity": "grok-opencatalog-contributor"
}

# Full Payloads
payloads = [
    # 1. New Category
    {
        "kind": "category",
        "slug": "ui-design",
        "name": "UI/UX Design & Prototyping",
        "definition": "Collaborative tools for creating user interfaces, design systems, interactive prototypes, and design-to-code handoff. Focus on vector design, components, tokens, real-time collaboration, and developer-friendly outputs.",
        "primaryWorkflows": ["vector-ui-design", "design-systems-tokens-components", "interactive-prototyping", "dev-handoff-inspection", "real-time-collaboration"],
        "neighborCategories": ["image-editing"],
        "paidProductSlugs": ["figma"],
        "alternativeSlugs": ["penpot"],
        "sources": [
            {"url": "https://penpot.app/", "label": "Penpot official site", "basis": "cited"},
            {"url": "https://www.figma.com/", "label": "Figma official site", "basis": "cited"}
        ]
    },
    # 2. Paid Product: Figma
    {
        "kind": "paid-product",
        "slug": "figma",
        "name": "Figma",
        "brand": "Figma",
        "tagline": "Collaborative interface design and prototyping platform",
        "description": "Figma is the leading browser-based tool for UI/UX design, design systems, interactive prototyping, and developer handoff. It features real-time collaboration, components/variants, variables/tokens, Dev Mode for code inspection, FigJam for whiteboarding, and expanding AI capabilities.",
        "category": "ui-design",
        "secondaryCategories": [],
        "pricingShape": "subscription",
        "pricingNote": "Free Starter tier with limits. Professional ~$12-16/mo per full seat (annual). Higher for Organization/Enterprise.",
        "workflows": [
            {"slug": "vector-ui-design", "label": "Vector UI design & components", "description": "Advanced vector editing, auto-layout, components, variants."},
            {"slug": "design-systems-tokens-components", "label": "Design systems & tokens", "description": "Centralized libraries and variables."},
            {"slug": "interactive-prototyping", "label": "Interactive prototyping", "description": "High-fidelity prototypes with animations."},
            {"slug": "dev-handoff-inspection", "label": "Dev Mode & code inspection", "description": "Developer-friendly specs and snippets."},
            {"slug": "real-time-collaboration", "label": "Real-time collaboration", "description": "Simultaneous editing and comments."}
        ],
        "exportImport": {
            "formats": ["SVG", "PNG", "PDF"],
            "apis": ["Figma REST API"],
            "note": "Proprietary .fig format creates lock-in.",
            "basis": "cited",
            "sources": [{"url": "https://www.figma.com/pricing/", "label": "Figma pricing", "basis": "cited"}]
        },
        "rankedAlternatives": [
            {
                "altSlug": "penpot",
                "fit": "best-fit",
                "note": "Best open-source alternative with open standards and self-hosting.",
                "workflowFit": [
                    {"workflowSlug": "vector-ui-design", "status": "supported", "basis": "cited"},
                    {"workflowSlug": "design-systems-tokens-components", "status": "supported", "basis": "cited"},
                    {"workflowSlug": "interactive-prototyping", "status": "partial", "basis": "cited"},
                    {"workflowSlug": "dev-handoff-inspection", "status": "supported", "basis": "cited"},
                    {"workflowSlug": "real-time-collaboration", "status": "supported", "basis": "cited"}
                ]
            }
        ],
        "verified": False,
        "sources": [
            {"url": "https://www.figma.com/", "label": "Figma official", "basis": "cited"}
        ]
    },
    # 3. Alternative: Penpot
    {
        "kind": "alternative",
        "slug": "penpot",
        "name": "Penpot",
        "tagline": "Open-source collaborative design platform",
        "description": "Open-source browser-based UI/UX design and prototyping tool with strong dev handoff, self-hosting, and open web standards (SVG/CSS/HTML).",
        "repo": "https://github.com/penpot/penpot",
        "homepage": "https://penpot.app/",
        "license": {
            "slug": "mpl-2.0",
            "name": "Mozilla Public License 2.0",
            "osiApproved": True,
            "basis": "cited",
            "sources": [{"url": "https://github.com/penpot/penpot", "label": "GitHub", "basis": "cited"}]
        },
        "deployment": ["self-hosted", "web-deployable"],
        "platforms": ["browser", "docker"],
        "installPaths": [
            {
                "kind": "container",
                "platform": "docker",
                "command": "docker compose up -d",
                "url": "https://penpot.app/self-host",
                "note": "Official Docker setup",
                "basis": "cited",
                "sources": [{"url": "https://penpot.app/self-host", "label": "Self-host guide", "basis": "cited"}]
            }
        ],
        "maturity": [
            {"kind": "repo-stars", "value": "popular", "probedAt": "2026-07-04", "stale": False, "source": "GitHub"}
        ],
        "knownGaps": [
            {"slug": "plugin-ecosystem", "label": "Smaller plugin ecosystem", "description": "Growing but smaller than Figma", "severity": "nuisance", "basis": "cited", "sources": []}
        ],
        "categories": ["ui-design"],
        "replaces": ["figma"],
        "verified": False,
        "sources": [
            {"url": "https://penpot.app/", "label": "Penpot official", "basis": "cited"},
            {"url": "https://github.com/penpot/penpot", "label": "GitHub repo", "basis": "cited"}
        ]
    }
]

def submit_payload(payload):
    try:
        response = requests.post(f"{BASE_URL}/api/submit", headers=HEADERS, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
        if response.status_code == 201:
            print("✅ Success!")
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("Submitting to opencatalog.sh...")
    for i, payload in enumerate(payloads, 1):
        print(f"\n--- Submitting {i}/{len(payloads)}: {payload.get('kind')} - {payload.get('slug') or payload.get('name')} ---")
        submit_payload(payload)
        if i < len(payloads):
            time.sleep(2)
    print("\nDone!")
