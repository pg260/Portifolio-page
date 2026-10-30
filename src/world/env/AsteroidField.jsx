import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { buildPaths } from '../paths.js'

const VARIANTS = 3
const tmp = new THREE.Object3D()
const point = new THREE.Vector3()
const tangent = new THREE.Vector3()
const side = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const camPos = new THREE.Vector3()

/* ruído de valor 3D + fbm, só para modelar as rochas na criação */
const hash = (x, y, z) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}
const fade = (t) => t * t * (3 - 2 * t)
function vnoise(x, y, z) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const w = fade(z - zi)
  const lerp = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15

/**
 * Rocha: esfera subdividida com relevo em fbm, crateras (depressão com borda) e proporções
 * irregulares; normais suaves. A textura da Lua dá a variação de cor e o microrrelevo.
 */
export function makeRock(seed) {
  // vértices fundidos para as normais saírem suaves (o icosaedro vem com triângulos soltos)
  const base = new THREE.IcosahedronGeometry(1, 4)
  base.deleteAttribute('normal')
  const g = mergeVertices(base)
  base.dispose()
  const p = g.attributes.position
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  const craters = Array.from({ length: 5 }, (_, i) => ({
    dir: new THREE.Vector3(hash(seed * 7 + i, 1, 3) - 0.5, hash(seed * 7 + i, 2, 5) - 0.5, hash(seed * 7 + i, 4, 9) - 0.5).normalize(),
    size: 0.25 + hash(seed, i, 11) * 0.35,
    depth: 0.06 + hash(seed, i, 13) * 0.1,
  }))
  const stretch = new THREE.Vector3(0.75 + hash(seed, 1, 1) * 0.5, 0.65 + hash(seed, 2, 2) * 0.4, 0.8 + hash(seed, 3, 3) * 0.4)
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize()
    let r = 1 + (fbm(n.x * 1.7 + seed * 3.1, n.y * 1.7 + seed, n.z * 1.7 - seed) - 0.5) * 0.75
    for (const c of craters) {
      const d = Math.acos(Math.min(1, n.dot(c.dir))) / c.size
      if (d < 1) r -= c.depth * (1 - d * d)
      else if (d < 1.35) r += c.depth * 0.35 * (1 - (d - 1) / 0.35)
    }
    v.copy(n).multiplyScalar(r).multiply(stretch)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

/**
 * Cinturão de asteroides do modo Jogos, espalhado ao longo da trilha da câmera (fora do hero):
 * dá profundidade e paralaxe ao voo entre as estações. Entra/sai encolhendo cada rocha no lugar.
 */
export function AsteroidField({ count, active, reduced }) {
  const meshes = useRef([])
  const moon = useTexture('/textures/earth/moon-color.webp')
  const geos = useMemo(() => Array.from({ length: VARIANTS }, (_, i) => makeRock(i * 2.3 + 0.7)), [])
  // Textura da Lua projetada em 3 planos (triplanar) no espaço do objeto: sem costura nem "polo"
  // de UV esférico, e a textura gira junto com a rocha.
  const material = useMemo(() => {
    const map = moon.clone()
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.needsUpdate = true
    return new CustomShaderMaterial({
      baseMaterial: THREE.MeshStandardMaterial,
      roughness: 1,
      metalness: 0,
      uniforms: { uMap: { value: map }, uTint: { value: new THREE.Color('#c9bca8') } },
      vertexShader: /* glsl */ `
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        void main() { vObjPos = position; vObjNormal = normal; }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uTint;
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        void main() {
          vec3 n = normalize(vObjNormal);
          vec3 w = pow(abs(n), vec3(4.0));
          w /= (w.x + w.y + w.z);
          vec3 p = vObjPos * 0.7;
          vec3 c = texture2D(uMap, p.yz + 0.5).rgb * w.x + texture2D(uMap, p.xz + 0.5).rgb * w.y + texture2D(uMap, p.xy + 0.5).rgb * w.z;
          csm_DiffuseColor = vec4(c * uTint, 1.0);
        }
      `,
    })
  }, [moon])
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose())
      material.dispose()
    },
    [geos, material],
  )

  const rocks = useMemo(() => {
    const curve = buildPaths(false).games.pos
    return Array.from({ length: count }, (_, i) => {
      const u = 0.26 + Math.random() * 0.74
      curve.getPoint(u, point)
      curve.getTangent(u, tangent)
      side.crossVectors(tangent, up).normalize()
      const angle = Math.random() * Math.PI * 2
      const radius = 4.5 + Math.pow(Math.random(), 1.6) * 16
      const pos = point
        .clone()
        .addScaledVector(side, Math.cos(angle) * radius)
        .addScaledVector(up, Math.sin(angle) * radius * 0.7)
      const big = Math.random() < 0.08
      return {
        variant: i % VARIANTS,
        pos,
        scale: big ? 1.2 + Math.random() * 1.6 : 0.12 + Math.pow(Math.random(), 2) * 0.7,
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3),
        drift: (Math.random() - 0.5) * 0.4,
      }
    })
  }, [count])
  const perVariant = useMemo(() => Array.from({ length: VARIANTS }, (_, v) => rocks.filter((r) => r.variant === v)), [rocks])
  const vis = useRef(active ? 1 : 0)

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    camPos.copy(camera.position)
    vis.current += ((active ? 1 : 0) - vis.current) * (reduced ? 1 : Math.min(1, dt * 4))
    const show = vis.current > 0.01
    const t = reduced ? 0 : clock.elapsedTime
    perVariant.forEach((list, v) => {
      const mesh = meshes.current[v]
      if (!mesh) return
      mesh.visible = show
      if (!show) return
      list.forEach((r, i) => {
        tmp.position.copy(r.pos)
        tmp.position.y += Math.sin(t * 0.2 + r.drift * 10) * r.drift
        tmp.rotation.set(r.rot.x + t * r.spin.x, r.rot.y + t * r.spin.y, r.rot.z + t * r.spin.z)
        // rochas encolhem ao passar rente à câmera, para não taparem a tela
        const near = THREE.MathUtils.smoothstep(tmp.position.distanceTo(camPos), 1.2, 4 + r.scale * 2)
        tmp.scale.setScalar(r.scale * vis.current * near)
        tmp.updateMatrix()
        mesh.setMatrixAt(i, tmp.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  return perVariant.map((list, v) => (
    <instancedMesh
      key={`${v}-${count}`}
      ref={(el) => (meshes.current[v] = el)}
      args={[geos[v], material, list.length]}
      frustumCulled={false}
      raycast={() => null}
    />
  ))
}
