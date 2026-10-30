---
name: react-three-fiber
description: Build 3D/WebGL scenes in React with React Three Fiber (@react-three/fiber) and drei. Use for a 3D hero, interactive 3D objects that react to pointer/scroll, loading GLTF models, shaders, or any three.js work inside a React + Vite app. Includes performance rules for mobile and the official docs as references.
---

# React Three Fiber (R3F)

R3F is a React renderer for three.js: every three.js object becomes a JSX element
(`<mesh>`, `<boxGeometry>`, `<meshStandardMaterial>`), and props map to the object's properties.
The official docs are vendored in `references/` (read the one you need, they are short):

| File | Read when |
|------|-----------|
| `references/installation.md` | installing, version pairing (fiber@9 ↔ react@19, fiber@8 ↔ react@18) |
| `references/your-first-scene.md` | first Canvas, mesh, lights, useFrame |
| `references/canvas.md` | `<Canvas>` props: camera, dpr, frameloop, gl, shadows |
| `references/hooks.md` | `useThree`, `useFrame`, `useLoader`, `useGraph` |
| `references/events.md` | pointer events on meshes, raycasting |
| `references/basic-animations.md` | animating with useFrame / refs / lerp |
| `references/loading-models.md` | GLTF/GLB loading, Draco, `useGLTF` |
| `references/scaling-performance.md` | on-demand rendering, instancing, dpr, regress |
| `references/pitfalls.md` | what NOT to do (setState in useFrame, new objects per frame, etc.) |

For `@react-three/drei` helpers (OrbitControls, Float, Environment, Text, useGLTF, MeshTransmissionMaterial…),
`@react-three/postprocessing`, or anything missing here, use Context7 (`react-three-fiber`, `drei`, `three`).

## Install (this project: React + Vite)

```bash
npm install three @react-three/fiber @react-three/drei
```

Pair `@react-three/fiber@9` with React 19. Vite needs no extra config.

## Minimal scene

```jsx
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Environment } from "@react-three/drei"
import { useRef } from "react"

function Gem() {
  const ref = useRef()
  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.4
    // pointer is normalized (-1..1); use it for a subtle look-at effect
    ref.current.rotation.x = state.pointer.y * 0.3
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.6} flatShading />
    </mesh>
  )
}

export function Hero3D() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1.2} />
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
        <Gem />
      </Float>
      <Environment preset="city" />
    </Canvas>
  )
}
```

The `<Canvas>` fills its parent — give the parent an explicit size (`h-[420px]` / `aspect-square`).

## Rules for a portfolio hero (performance first)

1. **Lazy-load the scene**: `const Hero3D = lazy(() => import("./Hero3D"))` inside `<Suspense fallback={<StaticHero />}>`.
   three.js is ~600 kB; it must not block first paint. The fallback is a real static visual, not a spinner.
2. **Respect reduced motion and weak devices**: if `matchMedia("(prefers-reduced-motion: reduce)").matches`
   or `navigator.hardwareConcurrency <= 4` on mobile, render the static fallback instead of the Canvas.
3. **Cap pixel ratio**: `dpr={[1, 1.5]}` (never 3 on phones). Consider `<PerformanceMonitor>` from drei to drop dpr when the FPS falls.
4. **On-demand rendering when idle**: `frameloop="demand"` + `invalidate()` on interaction, if the scene can rest.
   A hero that spins forever should at least pause when off-screen (`useInView` → `frameloop="never"`).
5. **Never allocate per frame**: no `new THREE.Vector3()` inside `useFrame`; reuse refs. Never `setState` in `useFrame`.
6. **One light + environment map** is cheaper and prettier than four lights. Avoid real-time shadows on mobile.
7. **Models**: GLB with Draco/meshopt compression, under ~1 MB; `useGLTF.preload(url)`.
8. **Keep it quiet**: the 3D element is the "one bold thing" of the page; everything around it stays disciplined.

## Interaction patterns that read as "game developer"

- Object reacts to the pointer (`state.pointer`) with damped rotation: `ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, target, 4, delta)`.
- Scroll-driven camera or object progress: read Motion's `scrollYProgress.get()` inside `useFrame`.
- Click/tap on the mesh (`onClick`, `onPointerOver` from `references/events.md`) to cycle materials or trigger a "level up" moment.
- A custom shader material (`shaderMaterial` from drei) with a `uTime` uniform for a living surface.

## Testing

Visual checks via Playwright/Chrome DevTools MCP: screenshot at 390×844 (phone) and 1440×900, check that the
fallback renders when WebGL is unavailable (`gl.getContext` returns null in some headless runs — handle it).
