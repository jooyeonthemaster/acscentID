# 3D Assets Guide for Custom Duck Project

## Recommended File Format
For web-based 3D applications (Three.js / React Three Fiber), the **.glb (glTF Binary)** format is the industry standard and highly recommended.

### Why .glb?
1. **Efficiency**: It is a binary format, meaning smaller file sizes and faster loading compared to .obj or .fbx.
2. **All-in-One**: A single .glb file can contain the mesh, textures, materials, and even animations. No need to manage separate texture files.
3. **Compatibility**: It is the "JPEG of 3D", natively supported by Three.js and arguably the best format for the web.

## How to Prepare Your Parts
Since you are building a modular customizer (Body + Parts), here is the recommended workflow:

### Option A: Separate Files (Recommended for modularity)
Export each part as its own `.glb` file.
- `body.glb`
- `head_ribbon.glb`
- `head_hat.glb`
- `back_wings.glb`

**Critical Tip**: Ensure all parts share the same common origin point (0,0,0) in your 3D software (Blender/Maya).
- If the hat needs to sit on the head, position it correctly in Blender relative to the world origin, then export.
- This way, when you load it in Three.js and set `position={[0,0,0]}`, it snaps exactly to the right place on the body.

### Option B: Single File with Variants
Export one `duck_complete.glb` containing **all possible parts**.
- Inside the file, name your meshes clearly (e.g., "Hat", "Ribbon", "Wings").
- In the code, you load the single file but selectively toggle `visible={true/false}` for each part based on user selection.
- **Pros**: Only one HTTP request to load.
- **Cons**: File size might be larger if you have hundreds of parts.

## Folder Structure
Place your `.glb` files in the `public/models/` directory.
Example:
```
public/
  models/
    duck/
      body.glb
      parts/
        hat.glb
        ribbon.glb
        wings.glb
```

Then load them in React Three Fiber:
```tsx
import { useGLTF } from '@react-three/drei'

function Hat() {
  const { scene } = useGLTF('/models/duck/parts/hat.glb')
  return <primitive object={scene} />
}
```
