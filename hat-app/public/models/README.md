# 3D models for AR Hat App

Place your 3D assets here. They are served at `/hat-app/models/` (or `/models/` in dev).

## Format: **GLB** (recommended) or GLTF

- **GLB** = single binary file (`.glb`). Prefer this for production.
- **GLTF** = JSON + optional `.bin` + textures. Use if you need to edit assets in repo.
- **Not FBX** — convert to GLB/GLTF in Blender or [glTF Pipeline](https://github.com/CesiumGS/gltf-pipeline).

## What to add for the “waterfall” effect

1. **One reusable “drop” / particle asset** (e.g. `drop.glb`, `sphere.glb`, `crystal.glb`)
   - Single small model that will be **instanced** many times in the waterfall.
   - Keeps draw calls low and performance good on mobile.

2. **Optional: 2–3 variants** (e.g. `drop_a.glb`, `drop_b.glb`) for visual variety.
   - Same specs as above; we can pick randomly when spawning.

## Specs to aim for

| Spec        | Target        | Why |
|------------|----------------|-----|
| **Poly count** | &lt; 500–1000 per asset | Many instances; mobile GPU. |
| **File size**  | &lt; 100–200 KB each   | Fast load over cellular. |
| **Textures**   | 1 small texture or none | Untextured / vertex color is fine. |
| **Origin**     | Center or bottom       | Easiest to place above head. |
| **Scale**      | ~0.5–2 m in Blender    | We scale in code to match scene. |

## Optional: embedded animation

- If the asset should **tumble / spin**, you can add a short loop in Blender (e.g. 1–2 s) and export with **Animation** enabled.
- R3F/drei can play `model.animations`; we’ll hook it up in the waterfall component.

## Suggested filenames (you can change later)

- `waterfall-drop.glb` — main instanced asset for the waterfall.
- Or: `waterfall-a.glb`, `waterfall-b.glb` if you use variants.

## Loading in the app

- **From public:** `useGLTF('/hat-app/models/waterfall-drop.glb')` (or `/models/...` in dev with Vite).
- **Instancing:** We’ll use one loaded scene multiple times with different positions (and maybe rotations) for the waterfall originating above the head.
