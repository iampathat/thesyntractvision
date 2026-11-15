QCDS MedCare Cycling Intelligence v2.3.2 · public browser runtime
© 2026 Patrik Sundblom. All Rights Reserved. Proprietary.
Theory and creation by Patrik Sundblom. OpenAI / ChatGPT research and development support.

V2.3.2 (2026-11-15) advances the original WebGL2 runtime without replacing the FTMS, map, GPX, racing, audio, storage or fallback logic.
- World-space scrolling keeps the road moving continuously, even when large terrain meshes are cached between updates.
- Procedural conifers and deciduous trees are rooted to the terrain elevation at their world positions rather than the centerline height.
- Alpha-tested botanical cards write depth for correct foreground/background occlusion; nearby trees use multiple crossed planes for parallax.
- Road and terrain now remain opaque instead of revealing an unrelated distant photograph through the rideable ground.
- Asphalt/ground microtextures track the traveled distance, avoiding stationary-looking materials.
- Road surface normals are oriented toward daylight, improving directional lighting on visible geometry.
- Higher-grade terrain tessellation and stable road/grass detail reduce visual snapping.
- V2.3.1 replaces repeated wildflower photo sprites with generated grass, uses alpine conifers over flat oak cards, reduces bright speckles, color-grades natural turf and limits photographic treetops to the horizon.
- V2.3.2 adds stable terrain irregularity, natural ground-color variation, route-anchored tree contact shadows and less regimented grass spacing.
- WebGL visual smoke tests now exercise moving race frames and save screenshots, rather than validating syntax alone.
- Photo-assisted cyclist sprites remain view-dependent, although the geometric bikes and rider kinematics move independently.

Synthetic demo landscapes and any backdrop photography are illustrative and NOT GPS-accurate visual surveys. Real OSM/GPX routes drive road position and known grade but do not carry street-level photogrammetry. The result is a substantial engineering update, NOT a claim of reference-image photorealism. Visual screenshot review remains required.

The QCDS visual oracle planner is explicit, classical and auditable; it does not claim quantum hardware execution.
Original C/source modules remain proprietary. Public HTML, JS and WASM bundles are browser-readable.

All safety limits for hardware resistance, especially synthetic routes, remain in force.
