Design System Analysis: getdesign.md

Note on accuracy: This analysis is built from the page's text content, structure, and component/copy patterns pulled via a text-based fetch of https://getdesign.md/. I did not have access to the live rendered CSS, so exact hex codes, font-family names, and spacing units below are best-effort inferences, not measured values — flagged with ⚠ where inferred. Treat this as a directional starting point, and verify/adjust hex values against the live site (devtools → Inspect) before locking them into production.

Developer-tool catalog site for AI coding agents. Clean, utility-first SaaS aesthetic aimed at "vibecoders" — dense card grids, monospace CLI snippets, and a light/dark toggle built into its own product surface.

Usage

Best suited for: developer tool marketing sites, catalog/directory products, docs-adjacent landing pages, CLI-first products.

1. Color Palette ⚠ (inferred)

Based on the target audience (developer tools, AI coding agents) and cross-referencing sibling entries in getdesign.md's own catalog (Vercel, Linear, Resend — described elsewhere on the page as "black and white precision" / "minimal dark theme, monospace accents"), the site most likely follows a neutral, dark-leaning developer-tool palette:

Token	Best-guess value	Usage
--bg-primary	
#0A0A0A – 
#111111	Page background (dark mode default)
--bg-secondary	
#1A1A1A – 
#1F1F1F	Card surfaces, catalog tiles
--bg-elevated	
#232323	Hover states, elevated panels
--text-primary	
#F5F5F5 – 
#FAFAFA	Headings, primary copy
--text-secondary	
#A0A0A0	Descriptions, metadata ("Installs", "Bookmarked")
--border	
#2A2A2A	Card borders, dividers
--accent	Single brand accent (likely a blue or green, common in dev-tool CLIs)	Primary CTA buttons ("Download DESIGN.md", "SAVE"), links
--accent-hover	Lightened/saturated variant of accent	Hover states

The site also explicitly supports a Light mode (toggle visible on each analysis page: "Light / Dark"), so a companion light palette (white background, near-black text, same accent) should exist as a first-class variant — not an afterthought.

Recommendation: Inspect the live CSS custom properties (:root variables in devtools) to lock exact hex values — this pattern (CSS variables for theming, light/dark parity) is strongly implied by the toggle UI.

2. Typography ⚠ (inferred)
Role	Best-guess	Reasoning
Headings / UI	Inter, Geist, or similar grotesque sans-serif	Standard for modern dev-tool SaaS sites in this category
Body copy	Same family, lighter weight	Consistent single-family systems are common across the catalog's own listed sites
CLI / code snippets	Monospace (e.g. ui-monospace, SF Mono, JetBrains Mono)	Directly observed: install command is styled as a distinct code block — npx getdesign@latest add claude

Type scale is likely tight and utilitarian (dev-tool convention): large bold hero headline, medium subheadline, small uppercase labels for metadata (e.g. "Installs", "Bookmarked", "New" tags).

3. Layout & Structure (observed)

These patterns were directly visible in the page content/markup, not inferred:

Sticky/persistent header with logo, primary nav (Request a DESIGN.md, Browse catalog), social links, and a "Sign in" CTA.
Promotional banner strip above the fold advertising the "Website Starter Kit" — dismissible, tagged "2026".
Hero section: single bold headline ("Give AI-built websites a real design with DESIGN.md") + supporting paragraph + trust badge ("Follows Google's official DESIGN.md spec").
Benefit list: 5-item repeated/echoed list ("Use a DESIGN.md to…") — suggests animated/cycling text component in the live UI.
"Style without design skills" feature block with an input-like affordance (yoursite.com placeholder) — implies an interactive demo widget.
Sponsor/tool row: horizontal scroll of partner tool cards ("Vibecoder tools").
Catalog grid (main content): dense card grid, 70+ entries visible, each card containing:
Brand logo/icon
Site name + optional year (e.g. "Dell (1996)", "Nintendo (2001)")
One-line descriptive tagline in a consistent voice: "[Category]. [2-4 word visual signature]."
Metadata row: Installs count, Bookmarked count, "New" badge where applicable
Link through to /[site]/design-md
Individual analysis page (e.g. /claude/design-md):
Breadcrumb ("Back to designs")
H1 + one-line description
"Usage" section with copyable CLI command (npx getdesign@latest add [site])
Metadata (Installs, Bookmarked) + primary CTA ("Download DESIGN.md") + secondary CTA (starter kit upsell)
Legal/disclaimer line in smaller type (independent analysis, not affiliated)
Preview section with a Light/Dark toggle and an iframe-style live preview (preview.html)
Footer: multi-column (Products / Resources / Company), maintainer credit with GitHub avatar, newsletter/feedback CTA.
4. Components (observed)
Component	Notes
Catalog card	Logo + name + tagline + stat row; consistent across 70+ entries
CLI snippet block	Monospace, copyable, single-line install command
Toggle (Light/Dark)	Two-state pill/segmented control on preview sections
Stat pair	"Installs — / Bookmarked —" pattern, em-dash as zero-state placeholder
Badge	"New" label on recently-added catalog entries
Sponsor card	Logo strip + short pitch + CTA, horizontally arranged
Footer nav columns	3-column link groups under a brand statement
5. Voice & Content Patterns (observed)
Taglines follow a strict formula: Category/positioning. Visual signature (2–5 words). e.g. "Payment infrastructure. Signature purple gradients, weight-300 elegance."
Copy is terse, benefit-led, developer-to-developer in tone — no marketing fluff, heavy use of concrete nouns (colors, type names, layout terms) even in one-liners.
Consistent disclaimer pattern on every analysis page: independent, unaffiliated, for inspiration only.
6. What I'd verify before building from this
Exact accent color (hex) — grab from a rendered card's CTA button or active nav state.
Font-family declarations — check <link> tags or font-family in computed styles.
Spacing scale (likely a 4px or 8px base grid, standard for this category) — measure card gutters/padding.
Border-radius values on cards/buttons (visually appears to be small-to-medium radius, consistent with the catalog card style).
Whether dark mode or light mode is the actual default (I inferred dark-first based on category convention, not confirmed).