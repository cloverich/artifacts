---
tags:
  - ingest
  - axonometric
  - cartography
  - architecture
  - open-data
---
# Exploded atlases: from persuasive image to inspectable model

Study date: 2026-10-10. Engram note: `03h0vzv2wv6rxdabd9pibfuho`, journal `engram`.

## Evidence boundary

The primary references are the two user-supplied screenshots: “Faroe Islands Landscape System” and “River Culture Library Pavilion.” Their attribution to Archmaster comes from the user. They are images, not model files or an inspectable application. No source URL or generating prompt was supplied. Text in the pavilion screenshot is too blurred for reliable full transcription. The landscape view presents topography and ecology; it is not evidence of a geological subsurface model.

Observed in screenshots: repeated elevated surfaces, a consistent oblique view, registration lines, neutral paper backgrounds, desaturated earthy materials, compact numbered headings, and peripheral legends/insets. In the landscape board, five thematic copies sit above a more substantial base landscape. In the pavilion, eight separated groups appear to represent ground, plaza, occupied levels, core, terrace, and canopy. The screenshots do not establish exact dimensions, actual orthographic projection, engineering validity, geographic accuracy, or AI generation. No transitions or responsive behavior can be inferred from a still.

Public product inspection: [ArchMasterAI](https://archmasterai.com/) advertises image generation, model rendering, and presentation deliverables; [archmaster.app](https://archmaster.app/en/features) advertises a separate range of image redesign tools. Similar names leave identity unresolved. Neither page authenticates these exact images. The rendered ArchMasterAI landing page was inspected in the in-app browser; no authenticated generator was used and no proprietary implementation was inspected. Public marketing claims are not measured capabilities or proof of a special diagram engine.

## Why this depiction works

These are editorial plates as much as 3D drawings. The center carries spatial detail; margins carry meaning. A single camera, footprint, palette, and light direction allow the reader to compare layers without relearning each image. Thin vertical guides preserve correspondence through empty space. They are registration cues, not implied structural columns.

The landscape uses **thematic explosion**: terrain repeats as a common coordinate frame while water, vegetation, circulation, program, and strategy change. The pavilion uses **assembly explosion**: actual model groups move away from their assembled elevations. Confusing the two would create a plausible picture with a misleading physical interpretation.

Material detail is high but chromatic contrast is restrained. Grasses, rocks, wood, and glazing help identify matter. Semantic overlays use a smaller vocabulary: blue water, pale routes, patches, points. Object texture answers “what is it made of?”; a line, symbol, or label answers “what should I understand?” Keeping those channels separate is transferable.

The typography has a three-level hierarchy: title, numbered layer name, short supporting phrases. Material swatches and small supporting drawings avoid lengthy leaders into the central model. The landscape board is actually annotation-dense at board scale: many tiny sidebar diagrams and captions. Its apparent balance depends on viewing a large original. The pavilion is simpler, but its body text is unreadable in this capture. Do not copy tiny type as a readability strategy.

For a practical board, start with one question per layer, one summary label per layer, and a small number of decision-relevant exceptions. Keep the full inventory in selectable details or a table. This is an authoring heuristic, not a universal numerical law. Budget labels by final output size and minimum readable type. At narrow widths, preserve the diagram's own scale with a clearly labeled pan region and move the label inventory into HTML.

## Reconstructable pipeline

1. **Input and provenance.** Keep geometry, scientific attributes, and annotation metadata separate. Each feature needs an ID, source, units, timestamp/revision, status (observed/derived/proposed), and uncertainty where known. A terrain raster and a building model are different inputs.
2. **Geometry.** Terrain: reproject raster and vectors into a suitable common metric CRS, reconcile vertical datum, clip to an extent, sample elevations into a triangle mesh, add boundary skirts if a solid cut edge is wanted. Building: resolve IFC placements and units, group by storey or subsystem, decide which walls to section so rooms remain visible. A render-ready GLB does not automatically preserve all BIM semantics.
3. **Semantics.** Derive contours from elevations, drape paths onto the terrain, classify land cover, or associate rooms with uses. Hydrology needs a documented analysis (conditioning, flow direction, accumulation, thresholds) rather than hand-painted blue arrows. Habitat connectivity needs a species/resistance model and validation; land cover alone is insufficient.
4. **Explosion.** Retain original positions. Assembly: displayed z = model z + explode amount × group rank × gap. Thematic: clone the common surface into presentation slots; gap is a layout parameter, never geological depth. Recompute anchor positions from the same transform as the mesh.
5. **Projection and rendering.** Use an orthographic camera for comparable scale, or a fixed affine projection for a small vector diagram. True isometric is a special equal-axis case; these references only establish an axonometric appearance. Shade faces with normals and a coherent light; add restrained edge lines and ambient occlusion for print quality. Texture detail cannot replace missing source geometry.
6. **Annotation and composition.** Project stable model anchors to screen coordinates, reserve a label gutter, sort anchors vertically, and enforce minimum separation with bounded forward/backward passes. Prioritize, aggregate, or defer labels when the region cannot fit them. Recompute for camera/layout changes. Keep labels vector/HTML for search, editing, accessibility, and sharp export.
7. **Output.** Save model and annotation IDs together. Export a rendered background with vector labels for a polished print plate, or meshes plus an HTML/SVG label layer for interactive review. Geometry and semantic records remain the source of truth.

## Tools and meaningful alternatives

| Route | What it supports | Real tradeoff |
| --- | --- | --- |
| SVG + ordinary JavaScript | Fixed-view polygons, lines, selectable layers, crisp labels, standalone files | Excellent for a small authored atlas; painter order, occlusion, and projection become your responsibility. No real PBR or free camera. |
| Canvas 2D | Many projected triangles or a raster intermediate | Simple drawing surface; requires a separate accessible label/control layer and explicit hit testing. Raster export is resolution-bound. |
| Three.js + SVG/HTML labels | Orthographic meshes, material rendering, clipping, interactive camera | Appropriate for richer geometry; requires asset loading, GPU resources, camera-aware label placement, and picking. No benchmark here establishes relative speed. |
| QGIS + GDAL → Blender → vector editor | Georeferenced terrain preparation, contours, mesh export, high quality still rendering and editorial finishing | More authoring steps, but a useful route to a practical printable board. Final labels should remain editable. Blender documentation fetching was blocked in this session; no specific Freestyle settings are asserted. |
| IfcOpenShell → GLB + feature table → viewer | Geometry extraction and conversion from IFC | Source IFC and disciplined grouping are essential. Preserve IDs and properties explicitly; a mesh alone is an incomplete technical document. |
| Generated image followed by authored labels | Rapid aesthetic exploration and atmospheric texture | Can imitate the visual idiom; does not establish consistent geometry, measured quantities, or dependable element identity. Useful for concepts with stated status. |

[Three.js OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html) documents distance-independent object size. [QGIS 3D](https://docs.qgis.org/3.44/en/docs/user_manual/map_views/3d_map_view.html) documents raster-derived terrain meshes, texture layers, vertical scale, and OBJ scene export. [GDAL contours](https://gdal.org/en/stable/programs/gdal_contour.html) produces contour lines or polygons from a raster; [D3 contours](https://d3js.org/d3-contour) uses marching squares on a numeric grid. These generate contour geometry, not a whole annotated atlas. [QGIS labeling](https://docs.qgis.org/3.44/en/docs/user_manual/working_with_vector/vector_properties.html#labels-properties) exposes placement and rule-based labels. [IfcOpenShell geometry](https://docs.ifcopenshell.org/ifcopenshell-python/geometry_processing.html) documents mesh extraction, transforms, filtering, and GLB serialization.

## How much is openly available?

**The visual technique: strongly supported.** Projection, exploded transforms, heightfields, contours, mesh shading, label layout, and editorial composition are established techniques. The distinctive result is a coordinated application of them. Open tools support that pipeline; they do not automatically make its editorial choices.

**Landscape base data: available, with resolution limits.** [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) offers publicly accessible GLO-30/GLO-90 under its license and attribution conditions. It is a DSM including vegetation/buildings, not bare-earth terrain. Thirty-metre sampling can support regional context but cannot justify small ledges, paths, waterfalls, or subterranean geology. Exact Faroe tile availability and a local high-resolution survey were not checked. Global coverage is not a site audit.

[ESA WorldCover](https://esa-worldcover.org/en/data-access) offers 2020/2021 land-cover products at approximately 10 m under CC BY 4.0. It supports broad cover classes, not specific habitat quality; different algorithm versions also complicate year-to-year comparisons. [OpenStreetMap](https://www.openstreetmap.org/copyright) provides reusable mapped features under ODbL with attribution requirements. Local trail completeness, building interiors, elevations, and dates still require verification. Do not treat a rendered WMS image as equivalent to downloadable analytic raster values.

**Buildings: the tooling is open; the model often is not.** OSM footprints do not supply a pavilion's rooms, furniture, structure, services, or material specifications. An IFC model from its author, a measured survey, or original authored geometry fills that gap. There is no basis to assume a public model exists for this depicted pavilion. Open know-how supports making a new design; it cannot recover the original design from one image without assumptions.

**Analysis: requires domain judgment.** Surface geology may need a geological survey; groundwater needs subsurface observations and a model. Connectivity, drainage, structural adequacy, access, and fire egress cannot be certified by a convincing diagram. Practical usefulness comes from connecting a visible claim to its input and method.

**Potential vendor advantage: workflow and art direction.** ArchMasterAI publicly advertises specialized visual workflows. Prompt presets, curated examples/assets, model adaptation, consistent styles, and fast iteration are plausible differentiators, but their role in these two images is unknown. No reviewed evidence establishes an exclusive projection method, verified GIS/BIM analysis, exact geometry preservation, or exportable semantic scene for these examples. A fair comparison would test the same known IFC/terrain inputs, cross-layer alignment, label correctness, editable output, reproducibility, and correction effort. Do not infer that open implementation is cheap merely because all component tools exist.

## Artifact implementation and differences

The original dependency-free SVG atlas has terrain and building modes, explosion, section/mesh views, annotation budgets, semantic color, selectable layers, and actual SVG export. Synthetic terrain and authored pavilion geometry are plainly labeled as illustrative. Each layer has a focused record and practical source requirements. This teaches the pipeline and composition, not Archmaster's unknown renderer. No reference image assets will be copied into the project. It does not implement GIS import, IFC parsing, scientific hydrology, structural analysis, physically based materials, or arbitrary camera rotation.

## Verification

Implemented in `exploded-atlas/`. Build with `node build.mjs`; open `dist/exploded-atlas.html`. Source entry points: `index.html`, `style.css`, `app.js`, `mechanics.mjs`. The bundle embeds this study and has no runtime asset dependencies. SVG export produces real vector polygons and editable text.

Three Node tests passed: projection/registration and assembly elevations, bounded label packing at collapsed and extreme anchor positions, and terrain triangle finiteness/orientation. The build validates emitted JavaScript syntax and rejects external runtime script/style references. HTTP browser verification covered terrain/pavilion switching, separation endpoints, sparse/balanced/detailed annotations, material/semantic/mesh rendering, guides, terrain profile, pavilion cutaway, layer selection and record updates. A real SVG download was obtained and parsed as XML. Desktop and 375/320 px layouts were inspected; document width remained within the viewport and the intentional diagram pan region held its overflow. No warning/error browser logs were observed during these checks.

The browser policy rejected `file://`; direct-file execution is **not verified**. Interactive tests used a temporary loopback HTTP preview of the same generated file. The SVG download location is machine-specific and is not committed. Generated HTML, screenshots, and research caches are ignored. Rules were reviewed against [GitHub’s Node template](https://github.com/github/gitignore/blob/main/Node.gitignore) and the root baseline.

All URLs above were inspected on 2026-10-10. Blender documentation requests failed; product generation was not tested. No comparative performance measurement or source-data accuracy audit was performed.

## Preserved implementation

Source revision `a0ac242cce722e89391b0aa179424a28ee7305e0`. [Renderer](/code/artifacts@a0ac242cce722e89391b0aa179424a28ee7305e0/exploded-atlas/app.js), [projection and labels](/code/artifacts@a0ac242cce722e89391b0aa179424a28ee7305e0/exploded-atlas/mechanics.mjs), [standalone packager](/code/artifacts@a0ac242cce722e89391b0aa179424a28ee7305e0/exploded-atlas/build.mjs), and [verification tests](/code/artifacts@a0ac242cce722e89391b0aa179424a28ee7305e0/exploded-atlas/mechanics.test.mjs).
