# Signal press: styling recipe

An original exercise inspired by [Plastic Labs' Neuromancer](https://plasticlabs.ai/neuromancer) and [Nous Research's Hermes](https://hermes-agent.nousresearch.com). This experiment is independent and unaffiliated. The [comparative source study](../docs/neuromancer-hermes.md) records the references; this document describes the implementation and vocabulary to reuse.

## The intended effect

A quiet editorial page holds a highly concentrated image: warm paper, ultramarine, an engraved seed vessel, and small fragments of ASCII. The page gives the image one job, and the image gives the page its identity. The representation controls make the recipe visible without turning the reading experience into a complex interface.

Useful vocabulary: **curved hatching**, **contour engraving**, **technical marginalia**, **ASCII interference**, **monochrome plate**, **concentrated color field**, **warm paper ground**, **editorial negative space**, **hairline rules**, **serif / monospace contrast**.

## Composition

- The desktop spread gives 44% of the width to the headline and 56% to an uninterrupted image field. The image and heading are the only two dominant elements.
- The display serif uses tight tracking and short lines. Small monospace labels provide a second, technical register. Both are system font stacks.
- Warm paper surrounds an ultramarine plate; dark mode uses charcoal paper and a deeper blue plate. The paper option reverses the plate into blue contours on a quiet ground.
- Three short recipe captions describe form, interference, and color. Keep these subordinate to the image.

## Image construction

The original SVG uses a tapered radial profile, a slightly displaced axis, and a twist over its height. A series of 43 meridians describes the body; 27 transverse contour curves describe depth. These are simple paths with round joins. No raster illustration, copied artwork, shaders, filters, external fonts, or image requests are involved.

The form is intentionally more like a seed or hollow vessel than a generic globe. Its open shoulders, pinched upper profile, heavy belly, and narrow foot create a recognizable silhouette. Closely spaced lines carry the shading. A few sparse, displaced ASCII labels interrupt the otherwise coherent surface.

The separate ASCII mode builds a deterministic character rendering once at load time. It samples the same radius function into 38 text rows. It does not run a continuous conversion or animation loop. The density slider changes group opacity; the representation buttons reveal and hide the groups. The SVG stays in the document, so the image needs no reload when a control changes.

## Translating the references

From Neuromancer: dense image texture, the feeling of a coherent subject being translated through machine marks, and fragments around a visual center. Its image treatment is an inspiration rather than an asset source. The independent ASCII layer borrows that compositional relationship.

From Hermes: a concentrated blue / paper palette, an engraving-like image vocabulary, and the contrast between fine technical detail and large empty color. This exercise achieves that with original vector paths rather than copying the reference's artwork.

The resulting study has its own vessel, typography, copy, layout, and control model. It is a prompt interpretation, not an attempt at a faithful reproduction of either page.

## What to reuse

A compact prompt recipe:

> Make an editorial composition with generous negative space, a short tightly tracked serif headline, and small monospace technical marginalia. Use warm paper and one concentrated ultramarine. Place an original contour engraving of a sculptural organic object in a large uninterrupted color field. Let closely spaced curved hatching establish its volume. Introduce a few sparse ASCII interruptions as a separate layer. Preserve the silhouette and make movement subtle, optional, and respectful of reduced motion. Use original vector geometry and no external media.

A different object needs a different contour function, not merely a new label. A mineral, folded sail, or botanical pod could use the same vocabulary while changing the actual drawing. Resist adding multiple accent colors, glowing dashboard panels, uniform scanline overlays, or decorative controls without a visible effect.

## Performance and accessibility

The page is self-contained and makes zero external resource requests. The static SVG is approximately 24 KB; interactions are class changes and opacity changes. Animation is opt-in, uses only a few CSS group properties, and is disabled by the operating system's reduced motion preference. Buttons expose their selected state; controls have labels; the drawing has an accessible title and description. The mobile composition stacks the plate below the introduction.

## Provenance

All illustration geometry, copy, and implementation code were created for this repository. `specimen.svg` is a text SVG, duplicated inline in `index.html` for direct-from-disk operation. The named references are linked for attribution and research only; their images, logos, and site code are not redistributed. No third-party dependencies are included.

## Collection integration verification

On October 16, 2026, the artifact was visually checked through the collection's HTTP preview in light and dark appearance, including a 390-pixel viewport. Mixed, ASCII, and engraving representations, paper/blue grounds, and the density slider were exercised. The appearance selector defaults to the operating system and permits an explicit local preview. Source/script parsing and publication link checks pass. Direct-file browser execution was attempted but the browser tool rejects `file://`; HTTP testing does not establish direct-file playback. No benchmark or subjective audio test applies to this silent study.
