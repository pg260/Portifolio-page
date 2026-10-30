import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { colors, font, MODE_COLORS } from '../../lib/tokens.js'
import { modes } from '../../data/profile.js'
import { buildPaths } from '../paths.js'
import { measureAnchors } from '../scroll.js'
import { world } from '../store.js'
import { heroWindowRect } from '../hero/HeroStation.jsx'
import { FLOOR_Y } from './DataGrid.jsx'
import { billboardVertex, cameraOnPath, glowFragment, placeOnPath, premultiplied, rng, smooth, useFade, usePrecompile } from './landmarks.js'

/*
 * Viagem do modo Fullstack, "infraestrutura viva" com código à Matrix (DESIGN.md §8): skyline de vidro com
 * código escorrendo pelas fachadas no hero, corredor de datacenter em Trabalhos, núcleo de banco de dados em
 * Sobre, globo de rede no Contato; paredões de código no fundo (cânion dos dois lados da viagem e atrás de
 * cada estação), chuva de código no ar e painéis digitando código ou rolando logs pelo caminho todo (túnel
 * denso entre Sobre e Contato). Tudo em vidro escuro com arestas e luzes acima do limiar do bloom; nada encosta
 * no texto das seções (as zonas de texto vêm do DOM, world.zones), e os paredões apagam atrás dele.
 */

const fs = MODE_COLORS.fullstack
/** Vidro escuro dos prédios, racks e discos. */
const GLASS = '#07131a'
/** Névoa do horizonte e reflexo do céu no vidro. */
const HAZE = '#10303a'
/** Branco frio das janelas e LEDs mais fortes. */
const COLD = '#e6fdff'
/** Corpo do globo (mar escuro). */
const SEA = '#04121a'
/** Bolinhas de semáforo das janelas de código (as mesmas da janela do minigame). */
const TRAFFIC = ['#ff5f57', '#febc2e', '#28c840']

const SNIPPETS = modes.fullstack.world.code
const LOGS = modes.fullstack.world.logs

const color = (hex) => new THREE.Color(hex)

const HELPERS = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  // faixa [a, b] suavizada pela largura do pixel: de longe não serrilha
  float band(float x, float a, float b, float w) { return smoothstep(a - w, a + w, x) - smoothstep(b - w, b + w, x); }
`

/**
 * Chuva de código (precisa de `uTime` e HELPERS). `rain`: rastro e cabeça de uma coluna que cai sem parar
 * (célula 0 no alto); `glyph`: caractere da célula em `cont` (coordenada em células), trocando no ritmo `rate`.
 */
const RAIN = /* glsl */ `
  vec2 rain(float cell, float rows, float seed, float speed) {
    float span = rows + 16.0;
    float head = fract(uTime * speed / span + seed) * span;
    float d = head - cell;
    float trail = step(0.0, d) * exp(-d * 0.22) * (1.0 - smoothstep(10.0, 15.0, d));
    return vec2(trail, step(0.0, d) * step(d, 1.0));
  }
  float glyph(sampler2D map, vec2 cont, float cell, float seed, float rate) {
    float id = floor(hash12(vec2(cell, seed * 91.7) + floor(uTime * rate + seed * 13.0)) * 64.0);
    vec2 g = vec2(mod(id, 8.0), floor(id / 8.0));
    vec2 f = fract(cont);
    vec2 k = vec2(0.125, -0.125);
    // derivadas da coordenada contínua: a troca de caractere entre células não serrilha o mipmap
    return textureGrad(map, vec2(g.x + f.x, 8.0 - g.y - f.y) * 0.125, dFdx(cont) * k, dFdy(cont) * k).a;
  }
`

/* ---------- caixas instanciadas (prédios e racks) ---------- */

/** Caixa com a base no y 0; cada instância tem posição, tamanho, giro em y e dados próprios. */
const boxVertex = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aSize;
  attribute vec4 aData; // semente, giro em y, brilho, livre
  varying vec3 vLocal;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vSize;
  varying vec4 vData;
  void main() {
    vec3 p = position * aSize;
    float c = cos(aData.y), s = sin(aData.y);
    vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    vec3 n = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
    vec4 w = modelMatrix * vec4(aPos + r, 1.0);
    vLocal = p;
    vObjN = normal;
    vN = normalize(mat3(modelMatrix) * n);
    vWorld = w.xyz;
    vSize = aSize;
    vData = aData;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

function boxGeometry(items) {
  const geo = new THREE.InstancedBufferGeometry()
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
  geo.index = box.index
  geo.setAttribute('position', box.attributes.position)
  geo.setAttribute('normal', box.attributes.normal)
  const attr = (key, size) => new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap((it) => it[key])), size)
  geo.setAttribute('aPos', attr('pos', 3))
  geo.setAttribute('aSize', attr('size', 3))
  geo.setAttribute('aData', attr('data', 4))
  geo.instanceCount = items.length
  return geo
}

/** Pulsos de luz correndo por tubos (cabos, arcos do globo): `aInfo` = semente, comprimento do tubo. */
const cableVertex = /* glsl */ `
  attribute vec2 aInfo;
  varying vec2 vUv;
  varying vec2 vInfo;
  void main() {
    vUv = uv;
    vInfo = aInfo;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Junta tubos num só desenho; cada um leva a própria semente e o comprimento para o shader dos pulsos. */
function tubes(curves, segments, radius) {
  const parts = curves.map((curve, i) => {
    const g = new THREE.TubeGeometry(curve, segments, radius, 5, false)
    const n = g.attributes.position.count
    const info = new Float32Array(n * 2)
    const seed = ((i * 0.618034) % 1 + 1) % 1
    const len = curve.getLength()
    for (let k = 0; k < n; k++) info.set([seed, len], k * 2)
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 2))
    g.deleteAttribute('normal')
    return g
  })
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

/* ---------- skyline (hero) ---------- */

const towerFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uFloor;
  uniform vec3 uGlass; uniform vec3 uHaze; uniform vec3 uA; uniform vec3 uB; uniform vec3 uInk;
  uniform vec2 uFog;
  uniform sampler2D uGlyphs;
  varying vec3 vLocal;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vSize;
  varying vec4 vData;
  ${HELPERS}
  ${RAIN}
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - abs(dot(n, v)), 3.0);
    float y = vLocal.y;
    float seed = vData.x;
    float style = vData.w; // 0 janelas em grade, 1 faixas de andar (pele de vidro), 2 antena
    // vidro escuro que clareia para o alto (reflexo do céu) e acende nas bordas
    vec3 col = uGlass * (0.6 + 0.6 * smoothstep(0.0, vSize.y, y)) + uHaze * fres * 0.9;
    vec3 emit = vec3(0.0);
    if (style > 1.5) {
      // antena: luz piscando na ponta
      float tip = smoothstep(vSize.y - 0.6, vSize.y - 0.15, y);
      float blink = step(0.55, fract(uTime * 0.45 + seed));
      emit += uInk * tip * (0.25 + blink * 2.8);
    } else if (abs(vObjN.y) < 0.5) {
      bool xFace = abs(vObjN.x) > 0.5;
      float u = xFace ? vLocal.z : vLocal.x;
      float faceW = xFace ? vSize.z : vSize.x;
      float face = xFace ? (vObjN.x > 0.0 ? 1.0 : 2.0) : (vObjN.z > 0.0 ? 3.0 : 4.0);
      float h0 = hash12(vec2(seed, face));
      if (style < 0.5) {
        vec2 cell = vec2((u + faceW * 0.5) / 0.62, y / 0.82);
        vec2 id = floor(cell);
        vec2 f = fract(cell);
        vec2 fw = fwidth(cell);
        float rows = vSize.y / 0.82;
        float win = band(f.x, 0.22, 0.78, fw.x) * band(f.y, 0.3, 0.75, fw.y);
        // sem janela colada no topo nem cortada na quina
        win *= step(id.y + 1.5, rows) * step(id.x + 1.0, floor(faceW / 0.62));
        float h = hash12(id + seed * 61.0 + face * 7.3);
        // escritórios acesos que trocam devagar
        float on = step(0.78, hash12(id * 1.7 + floor(uTime * 0.08 + h * 9.0) + seed * 13.0));
        // dados subindo pela fachada: em algumas colunas um pulso corre de baixo para cima
        float colH = hash12(vec2(id.x + face * 31.0, seed * 17.0));
        float head = fract(uTime * (0.05 + colH * 0.08) + colH * 7.0) * (rows + 10.0) - 5.0;
        float d = head - id.y;
        float stream = step(0.8, colH) * step(0.0, d) * (1.0 - smoothstep(0.0, 7.0, d));
        vec3 wc = mix(uA, uInk, step(0.7, h) * 0.65);
        wc = mix(wc, uB, step(0.94, h));
        emit += win * wc * (on * 0.5 + stream * 2.0);
      } else {
        // pele de vidro: laje acesa a cada andar, salas acesas em trechos e uma varredura correndo num andar
        float fy = y / 0.7;
        float fid = floor(fy);
        float ff = fract(fy);
        float fwy = fwidth(fy);
        float slab = band(ff, 0.0, 0.07, fwy);
        float su = (u + faceW * 0.5) / 1.4;
        float sid = floor(su);
        float on = step(0.76, hash12(vec2(sid, fid) + seed * 3.1 + face * 5.0 + floor(uTime * 0.06 + h0 * 7.0)));
        float pane = band(ff, 0.16, 0.86, fwy) * band(fract(su), 0.04, 0.96, fwidth(su));
        float lane = step(0.9, hash12(vec2(fid, seed + face)));
        float sweep = fract(uTime * (0.1 + h0 * 0.15) + hash12(vec2(fid, seed)));
        float t = (u + faceW * 0.5) / faceW;
        float scan = lane * band(ff, 0.2, 0.8, fwy) * exp(-pow((t - sweep) * 9.0, 2.0));
        vec3 wc = mix(uA, uInk, step(0.6, h0) * 0.5);
        emit += uA * slab * 0.14 + wc * on * pane * 0.42 + uA * scan * 2.0;
      }
      // código escorrendo pela fachada (Matrix no vidro espelhado) em parte das faces, coluna por coluna
      if (h0 > 0.25) {
        vec2 gc = vec2((u + faceW * 0.5) / 1.6, (vSize.y - y) / 1.6);
        float gx = floor(gc.x);
        float lane = step(0.25, hash12(vec2(gx, seed * 3.7 + face))) * step(gx + 1.0, floor(faceW / 1.6));
        float rows = vSize.y / 1.6;
        vec2 tr = max(rain(floor(gc.y), rows, hash12(vec2(gx, seed + face * 5.0)), 5.0 + h0 * 6.0), rain(floor(gc.y), rows, hash12(vec2(gx, seed + face * 2.3 + 0.5)), 4.0 + h0 * 5.0));
        float g = glyph(uGlyphs, gc, floor(gc.y), seed + gx * 7.1 + face, 2.0 + tr.y * 10.0);
        float g2 = max(g, 0.45 * band(fract(gc.x), 0.25, 0.75, fwidth(gc.x)));
        emit += lane * (uB * g * (0.14 + tr.x * 2.6) + uInk * g2 * tr.y * 3.4);
      }
      // arestas verticais e coroa acesas
      float edge = 1.0 - smoothstep(0.0, 0.04 + fwidth(u) * 1.5, faceW * 0.5 - abs(u));
      float crown = 1.0 - smoothstep(0.0, 0.07 + fwidth(y) * 1.5, vSize.y - y);
      emit += uA * (edge * 0.25 + crown * 0.85);
    } else {
      // telhado: só o contorno
      vec2 e = vSize.xz * 0.5 - abs(vLocal.xz);
      float m = min(e.x, e.y);
      emit += uA * (1.0 - smoothstep(0.0, 0.07 + fwidth(m) * 1.5, m)) * 0.7;
    }
    emit *= vData.z;
    // os prédios do fundo se perdem na névoa do horizonte; o pé some na neblina do chão
    float dist = length(vWorld - cameraPosition);
    float fog = smoothstep(uFog.x, uFog.y, dist);
    float mist = 1.0 - smoothstep(0.0, 9.0, vWorld.y - uFloor);
    col = mix(col, uHaze, max(fog * 0.8, mist * 0.75));
    emit *= (1.0 - fog * 0.65) * (1.0 - mist * 0.6);
    gl_FragColor = vec4((col + emit) * uOpacity, uOpacity);
    #include <colorspace_fragment>
  }
`

const plainVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const horizonFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float g = exp(-vUv.y * 5.5) * (1.0 - smoothstep(0.35, 1.0, x));
    gl_FragColor = vec4(uColor * g * uOpacity, 1.0);
  }
`

/**
 * Prédios de vidro no horizonte do hero, atrás da janela do minigame: janelas em grade com colunas de dados
 * subindo ou pele de vidro com lajes acesas e varreduras, código caindo em colunas por parte das fachadas
 * (`glyphs`), recuos no alto, antenas piscando, arestas e coroas em `accent`. À esquerda de `clear` (onde fica
 * o título) quase não há prédios; o topo nunca passa de `ceiling` (NDC).
 */
function Skyline({ count, narrow, aspect, fov, ceiling, clear, glyphs, active, reduced, leave }) {
  const group = useRef()
  const mat = useRef()
  const glowMat = useRef()
  const fade = useFade(active, reduced, null, leave)
  const geometry = useMemo(() => {
    const r = rng(42)
    const cam = cameraOnPath(buildPaths(narrow).fullstack, 0, aspect, fov)
    const base = new THREE.Vector3()
    const top = new THREE.Vector3()
    const items = []
    for (let tries = 0, n = 0; n < count && tries < count * 30; tries++) {
      const z = -140 - r() * 120
      const x = (r() * 2 - 1) * (40 + -z * 0.75)
      base.set(x, FLOOR_Y, z).project(cam)
      if (Math.abs(base.x) > 1.15) continue
      // à esquerda fica o título do hero: ali sobram poucos prédios baixos; a cidade sobe a partir de `clear` (NDC x)
      const side = smooth(clear[0], clear[1], base.x)
      if (side < 0.1 && r() < 0.75) continue
      n++
      const w = 2.4 + r() * 3.6
      const d = 2.4 + r() * 3.6
      let h = (8 + Math.pow(r(), 1.4) * 36) * (0.12 + 0.88 * side)
      // o topo nunca chega ao HUD: a altura encolhe até o topo projetado ficar abaixo de `ceiling`
      top.set(x, FLOOR_Y + h, z).project(cam)
      if (top.y > ceiling) h *= (ceiling - base.y) / (top.y - base.y)
      const style = r() < 0.5 ? 0 : 1
      const yaw = (r() - 0.5) * 0.5
      const bright = 0.6 + r() * 0.4
      items.push({ pos: [x, FLOOR_Y, z], size: [w, h, d], data: [r() * 100, yaw, bright, style] })
      let total = h
      // recuo: um volume menor em cima de parte dos prédios altos quebra a silhueta de caixa
      if (h > 16 && r() < 0.55) {
        const k = 0.5 + r() * 0.3
        const h2 = h * (0.15 + r() * 0.25)
        items.push({ pos: [x, FLOOR_Y + h, z], size: [w * k, h2, d * k], data: [r() * 100, yaw, bright, style] })
        total += h2
      }
      // antena com luz piscando nos mais altos
      if (total > 22 && r() < 0.6) items.push({ pos: [x, FLOOR_Y + total, z], size: [0.28, 2.5 + r() * 4, 0.28], data: [r() * 100, yaw, bright, 2] })
    }
    return boxGeometry(items)
  }, [count, narrow, aspect, fov, ceiling, clear])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uGlass: { value: color(GLASS) },
      uHaze: { value: color(HAZE) },
      uA: { value: color(fs.accent) },
      uB: { value: color(fs['accent-2']) },
      uInk: { value: color(COLD) },
      uFog: { value: new THREE.Vector2(150, 280) },
      uFloor: { value: FLOOR_Y },
      uGlyphs: { value: glyphs },
    }),
    [glyphs],
  )
  const glow = useMemo(() => ({ uColor: { value: color(fs.accent) }, uOpacity: { value: 0 } }), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    const u = mat.current.uniforms
    u.uOpacity.value = v
    if (!reduced) u.uTime.value += dt
    glowMat.current.uniforms.uOpacity.value = v * 0.16
  })
  return (
    <group ref={group}>
      {/* brilho da cidade no horizonte, atrás dos prédios */}
      <mesh position={[40, FLOOR_Y + 35, -270]} scale={[420, 70, 1]} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={glowMat} vertexShader={plainVertex} fragmentShader={horizonFragment} uniforms={glow} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={mat} vertexShader={boxVertex} fragmentShader={towerFragment} uniforms={uniforms} {...premultiplied} depthWrite />
      </mesh>
    </group>
  )
}

/* ---------- datacenter (Trabalhos) ---------- */

const RACK = { w: 1.1, h: 4.2, d: 1.0, gap: 0.12, aisle: 3.0 }
/** Trecho da trilha (estações) com fileiras de racks dos dois lados. */
const RACK_S = [0.58, 1.68]

const rackFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uGlass; uniform vec3 uHaze; uniform vec3 uA; uniform vec3 uB; uniform vec3 uInk;
  uniform vec2 uFog;
  varying vec3 vLocal;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vSize;
  varying vec4 vData;
  ${HELPERS}
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - abs(dot(n, v)), 2.5);
    float seed = vData.x;
    vec3 col = uGlass + uHaze * fres * 0.7;
    vec3 emit = vec3(0.0);
    vec3 hs = vSize * 0.5;
    if (vObjN.z > 0.5) {
      // frente (virada para o corredor): servidores de 0,2 de altura com LEDs à direita
      float x = vLocal.x;
      float y = vLocal.y;
      float inner = step(abs(x), hs.x - 0.07) * step(0.12, y) * step(y, vSize.y - 0.12);
      float uy = (y - 0.12) / 0.2;
      float id = floor(uy);
      float fy = fract(uy);
      float fwY = fwidth(uy);
      float unit = band(fy, 0.07, 0.93, fwY) * inner;
      float hu = hash12(vec2(id, seed * 37.0));
      // cada unidade é um pouco mais clara que o rack e pega luz na borda de cima
      col += (uGlass * 0.9 + uHaze * 0.35 * smoothstep(0.6, 0.95, fy)) * unit;
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        vec2 c = vec2(hs.x - 0.17 - fk * 0.075, 0.12 + (id + 0.5) * 0.2);
        float r = length(vec2(x, y) - c);
        float dotm = 1.0 - smoothstep(0.017, 0.017 + fwidth(r) * 1.5, r);
        float rate = 0.5 + hash12(vec2(id, fk + seed)) * 5.0;
        float on = step(0.35, hash12(vec2(floor(uTime * rate), id * 3.1 + fk + seed * 9.0)));
        emit += (k == 0 ? uB : k == 1 ? uA : uInk) * dotm * on * unit * 2.6;
      }
      // barra de atividade em algumas unidades: uma varredura correndo da esquerda para a direita
      float w = vSize.x - 0.55;
      float t = (x + hs.x - 0.14) / w;
      float bar = step(0.78, hu) * band(fy, 0.42, 0.58, fwY) * band(t, 0.0, 1.0, fwidth(t));
      float sweep = fract(uTime * (0.25 + hu * 0.6) + hu * 5.0);
      emit += uA * bar * unit * (0.12 + 1.6 * pow(clamp(1.0 - (sweep - t) * 4.0, 0.0, 1.0), 3.0) * step(t, sweep));
    }
    // arestas acesas em todas as faces
    vec3 q = vec3(vLocal.x, vLocal.y - hs.y, vLocal.z);
    vec3 e = hs - abs(q);
    float ed = abs(vObjN.x) > 0.5 ? min(e.y, e.z) : abs(vObjN.y) > 0.5 ? min(e.x, e.z) : min(e.x, e.y);
    emit += uA * (1.0 - smoothstep(0.0, 0.02 + fwidth(ed) * 1.5, ed)) * 0.55;
    // o fundo do corredor se perde na névoa
    float fog = smoothstep(uFog.x, uFog.y, length(vWorld - cameraPosition));
    col = mix(col, uHaze, fog * 0.8);
    emit *= (1.0 - fog * 0.75) * vData.z;
    gl_FragColor = vec4((col + emit) * uOpacity, uOpacity);
    #include <colorspace_fragment>
  }
`

const cableFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uBase;
  uniform float uEvery;
  uniform vec3 uA; uniform vec3 uB;
  varying vec2 vUv;
  varying vec2 vInfo;
  void main() {
    // um pulso a cada uEvery unidades, correndo no sentido do cabo, com rastro atrás
    float x = vUv.x * vInfo.y;
    float p = fract((x - uTime * (3.0 + vInfo.x * 4.0)) / uEvery + vInfo.x * 3.7);
    float pulse = pow(p, 14.0);
    vec3 c = mix(uA, uB, step(0.62, vInfo.x));
    gl_FragColor = vec4(c * (uBase + pulse * 2.6) * uOpacity, 1.0);
  }
`

/**
 * Corredor de datacenter que a câmera percorre entre o hero e Sobre: duas fileiras de racks de vidro
 * acompanhando a trilha (LEDs piscando, barras de atividade), calhas de cabo no alto das fileiras e
 * arcos de luz cruzando o corredor nas passagens, com pulsos correndo.
 */
function DataCenter({ path, brightness, active, reduced, appear, leave }) {
  const group = useRef()
  const rackMat = useRef()
  const cableMat = useRef()
  const fade = useFade(active, reduced, appear, leave)
  const { racks, cables } = useMemo(() => {
    const r = rng(7)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const track = []
    for (let i = 0; i <= 700; i++) {
      path.sample(RACK_S[0] + (RACK_S[1] - RACK_S[0]) * (i / 700), a, b)
      track.push(new THREE.Vector2(a.x, a.z))
    }
    const items = []
    const rows = { [-1]: [], [1]: [] }
    const bridges = []
    const top = FLOOR_Y + RACK.h
    let acc = 0
    let slot = 0
    for (let i = 1; i < track.length; i++) {
      acc += track[i].distanceTo(track[i - 1])
      if (acc < RACK.w + RACK.gap) continue
      acc = 0
      slot++
      const t = track[i].clone().sub(track[i - 1]).normalize()
      const nrm = new THREE.Vector2(-t.y, t.x)
      // a cada 9 racks uma passagem; um arco de luz cruza o corredor por cima dela
      if (slot % 9 === 0) {
        const L = track[i].clone().addScaledVector(nrm, -RACK.aisle)
        const R = track[i].clone().addScaledVector(nrm, RACK.aisle)
        bridges.push(new THREE.QuadraticBezierCurve3(new THREE.Vector3(L.x, top + 0.1, L.y), new THREE.Vector3(track[i].x, top + 2.6, track[i].y), new THREE.Vector3(R.x, top + 0.1, R.y)))
        continue
      }
      for (const side of [-1, 1]) {
        const c = track[i].clone().addScaledVector(nrm, side * (RACK.aisle + RACK.d / 2))
        rows[side].push(new THREE.Vector3(c.x, top + 0.2, c.y))
        // a frente (+z local) vira para o corredor
        const inward = nrm.clone().multiplyScalar(-side)
        items.push({ pos: [c.x, FLOOR_Y, c.y], size: [RACK.w, RACK.h * (0.92 + r() * 0.08), RACK.d], data: [r() * 100, Math.atan2(inward.x, inward.y), (0.75 + r() * 0.35) * brightness, 0] })
      }
    }
    // calhas: uma linha de cabo correndo sobre cada fileira
    const trays = [-1, 1].map((side) => new THREE.CatmullRomCurve3(rows[side].filter((_, k) => k % 3 === 0)))
    return { racks: boxGeometry(items), cables: tubes([...trays, ...bridges], 220, 0.03) }
  }, [path, brightness])
  useEffect(
    () => () => {
      racks.dispose()
      cables.dispose()
    },
    [racks, cables],
  )
  const rackU = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uGlass: { value: color(GLASS) },
      uHaze: { value: color(HAZE) },
      uA: { value: color(fs.accent) },
      uB: { value: color(fs['accent-2']) },
      uInk: { value: color(COLD) },
      uFog: { value: new THREE.Vector2(16, 42) },
    }),
    [],
  )
  const cableU = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uBase: { value: 0.2 }, uEvery: { value: 9 }, uA: { value: color(fs.accent) }, uB: { value: color(fs['accent-2']) } }), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    const ru = rackMat.current.uniforms
    const cu = cableMat.current.uniforms
    ru.uOpacity.value = v
    cu.uOpacity.value = v * brightness
    if (!reduced) {
      ru.uTime.value += dt
      cu.uTime.value += dt
    }
  })
  return (
    <group ref={group}>
      <mesh geometry={racks} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={rackMat} vertexShader={boxVertex} fragmentShader={rackFragment} uniforms={rackU} {...premultiplied} depthWrite />
      </mesh>
      <mesh geometry={cables} raycast={() => null}>
        <shaderMaterial ref={cableMat} vertexShader={cableVertex} fragmentShader={cableFragment} uniforms={cableU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- núcleo de banco de dados (Sobre) ---------- */

const objVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vObj = position;
    vObjN = normal;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const diskFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIndex;
  uniform float uH;
  uniform vec3 uGlass; uniform vec3 uA; uniform vec3 uB;
  varying vec3 vObj;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  ${HELPERS}
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - abs(dot(n, v)), 2.0);
    float ang = atan(vObj.z, vObj.x);
    float dir = mod(uIndex, 2.0) * 2.0 - 1.0;
    vec3 emit = vec3(0.0);
    if (abs(vObjN.y) < 0.5) {
      // lateral: uma faixa de blocos de dados girando (sentido alterna por disco), bordas acesas
      float y = vObj.y / uH + 0.5;
      float seg = ang / 6.2831853 * 44.0 + uTime * (0.5 + uIndex * 0.2) * dir;
      float sid = floor(seg);
      float lit = step(0.5, hash12(vec2(sid, uIndex * 7.0 + floor(uTime * 0.7 + hash12(vec2(sid, uIndex)) * 5.0))));
      float block = band(y, 0.36, 0.64, fwidth(y)) * band(fract(seg), 0.14, 0.86, fwidth(seg));
      emit += mix(uA, uB, step(0.86, hash12(vec2(sid, uIndex + 3.0)))) * block * (0.15 + lit * 1.1);
      float rim = 1.0 - smoothstep(0.0, 0.07 + fwidth(y) * 1.5, min(y, 1.0 - y));
      emit += uA * rim * 1.7;
    } else {
      // tampa: trilhas concêntricas de prato girando, bits acesos
      float r = length(vObj.xz);
      float tr = r * 8.0;
      float track = band(fract(tr), 0.4, 0.6, fwidth(tr)) * step(0.18, r);
      float spin = ang + uTime * 0.5 / (0.3 + r) * dir;
      float bits = step(0.55, hash12(vec2(floor(tr), floor(spin / 6.2831853 * 28.0))));
      emit += uA * track * (0.12 + bits * 0.7);
      float rim = 1.0 - smoothstep(0.0, 0.03 + fwidth(r) * 1.5, 1.0 - r);
      emit += uA * rim * 1.7;
    }
    float a = 0.5 + fres * 0.45;
    vec3 col = uGlass * a + uA * fres * 0.35;
    gl_FragColor = vec4((col + emit) * uOpacity, a * uOpacity);
    #include <colorspace_fragment>
  }
`
const dashFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vObj;
  void main() {
    float ang = atan(vObj.y, vObj.x) + uTime * uSpeed;
    float d = fract(ang / 6.2831853 * 46.0);
    float dash = smoothstep(0.0, 0.12, d) * (1.0 - smoothstep(0.5, 0.62, d));
    float arcs = step(0.18, fract(ang / 6.2831853 * 3.0));
    gl_FragColor = vec4(uColor * dash * arcs * 1.5 * uOpacity, 1.0);
  }
`
const flowVertex = /* glsl */ `
  attribute vec4 aP; // raio, fase, velocidade, altura inicial
  uniform float uTime;
  uniform float uPx;
  uniform float uScale;
  varying float vA;
  varying float vK;
  void main() {
    // dados entram por baixo num raio largo, sobem em espiral colados nos discos e saem abrindo por cima
    float y = mod(aP.w + uTime * aP.z, 6.0) - 3.0;
    float rr = mix(2.4, 1.3, smoothstep(-3.0, -1.2, y));
    rr = mix(rr, 2.4, smoothstep(1.2, 3.0, y)) * aP.x;
    float ang = aP.y + uTime * 0.45 * aP.z + y * 0.9;
    vec4 mv = modelViewMatrix * vec4(cos(ang) * rr, y, sin(ang) * rr, 1.0);
    gl_PointSize = uPx * uScale * (0.5 + aP.x * 0.5) / -mv.z;
    // somem logo abaixo dos discos (embaixo ficam os números do Sobre) e mais alto por cima
    vA = smoothstep(-2.4, -1.4, y) * smoothstep(3.0, 2.0, y);
    vK = fract(aP.y * 3.7);
    gl_Position = projectionMatrix * mv;
  }
`
const flowFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uInk;
  varying float vA;
  varying float vK;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vA;
    vec3 c = vK > 0.85 ? uB : vK > 0.6 ? uInk : uA;
    gl_FragColor = vec4(c * a * 1.6 * uOpacity, 1.0);
  }
`

const DISKS = [-0.75, -0.25, 0.25, 0.75]
const DISK_H = 0.36

/** Quatro discos de vidro empilhados (o ícone de banco de dados), anéis tracejados girando e dados em espiral. */
function DatabaseCore({ position, radius, particles, active, reduced, appear, leave }) {
  const group = useRef()
  const diskMats = useRef([])
  const ringMats = useRef([])
  const flowMat = useRef()
  const glowMat = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const fade = useFade(active, reduced, appear, leave)
  const diskU = useMemo(
    () =>
      DISKS.map((_, i) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uIndex: { value: i },
        uH: { value: DISK_H },
        uGlass: { value: color(GLASS) },
        uA: { value: color(fs.accent) },
        uB: { value: color(fs['accent-2']) },
      })),
    [],
  )
  const rings = useMemo(
    () => [
      { y: -0.5, r: [1.32, 1.38], tilt: 0.12, speed: 0.35, color: fs.accent },
      { y: 0.0, r: [1.55, 1.6], tilt: -0.08, speed: -0.22, color: fs['accent-2'] },
      { y: 0.5, r: [1.32, 1.38], tilt: 0.05, speed: 0.5, color: fs.accent },
    ],
    [],
  )
  const ringU = useMemo(() => rings.map((g) => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uSpeed: { value: g.speed }, uColor: { value: color(g.color) } })), [rings])
  const flow = useMemo(() => {
    const r = rng(19)
    const data = new Float32Array(particles * 4)
    for (let i = 0; i < particles; i++) data.set([0.85 + r() * 0.4, r() * Math.PI * 2, 0.25 + r() * 0.5, r() * 6], i * 4)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particles * 3), 3))
    g.setAttribute('aP', new THREE.BufferAttribute(data, 4))
    return g
  }, [particles])
  useEffect(() => () => flow.dispose(), [flow])
  const flowU = useMemo(() => ({ uTime: { value: 0 }, uPx: { value: 1 }, uScale: { value: 1 }, uOpacity: { value: 0 }, uA: { value: color(fs.accent) }, uB: { value: color(fs['accent-2']) }, uInk: { value: color(COLD) } }), [])
  const glowU = useMemo(() => ({ uColor: { value: color(fs.accent) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uRays: { value: 0 }, uSpin: { value: 0 } }), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    const step = reduced ? 0 : dt
    diskMats.current.forEach((m) => {
      m.uniforms.uOpacity.value = v
      m.uniforms.uTime.value += step
    })
    ringMats.current.forEach((m) => {
      m.uniforms.uOpacity.value = v
      m.uniforms.uTime.value += step
    })
    const fu = flowMat.current.uniforms
    fu.uOpacity.value = v
    fu.uPx.value = dpr
    fu.uScale.value = radius * 45
    fu.uTime.value += step
    glowMat.current.uniforms.uOpacity.value = v * 0.4
  })
  return (
    <group ref={group} position={position}>
      {/* brilho do miolo, esticado na vertical como uma coluna de luz */}
      <mesh scale={[radius * 2.6, radius * 6, 1]} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={glowMat} vertexShader={billboardVertex} fragmentShader={glowFragment} uniforms={glowU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group scale={radius} rotation={[0.16, 0, 0.04]}>
        {DISKS.map((y, i) => (
          <mesh key={y} position={[0, y, 0]} raycast={() => null}>
            <cylinderGeometry args={[1, 1, DISK_H, 72, 1]} />
            <shaderMaterial ref={(m) => (diskMats.current[i] = m)} vertexShader={objVertex} fragmentShader={diskFragment} uniforms={diskU[i]} {...premultiplied} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {rings.map((g, i) => (
          <mesh key={g.y} position={[0, g.y, 0]} rotation={[-Math.PI / 2 + g.tilt, 0, 0]} raycast={() => null}>
            <ringGeometry args={[g.r[0], g.r[1], 160, 1]} />
            <shaderMaterial ref={(m) => (ringMats.current[i] = m)} vertexShader={objVertex} fragmentShader={dashFragment} uniforms={ringU[i]} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
        <points geometry={flow} frustumCulled={false} raycast={() => null}>
          <shaderMaterial ref={flowMat} vertexShader={flowVertex} fragmentShader={flowFragment} uniforms={flowU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
        </points>
      </group>
    </group>
  )
}

/* ---------- código: chuva estilo Matrix, painéis digitando e terminais de log ---------- */

/** Caracteres da chuva: símbolos e letras de código. */
const GLYPHS = '{}[]()<>/;:=+-*&|!?._$#@%~^0123456789abcdefxyzABCDEFXYZ'

/** Atlas 8 × 8 de caracteres brancos (64 px cada) da chuva no ar e nas fachadas. */
function glyphAtlas() {
  const cell = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = cell * 8
  const ctx = canvas.getContext('2d')
  ctx.font = `600 44px ${font('code')}`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < 64; i++) ctx.fillText(GLYPHS[i % GLYPHS.length], ((i % 8) + 0.5) * cell, (Math.floor(i / 8) + 0.55) * cell)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  return tex
}

const rainVertex = /* glsl */ `
  attribute vec3 aTop;
  attribute vec4 aInfo; // semente, tamanho do caractere, linhas, velocidade (células/s)
  attribute float aTint;
  uniform vec4 uRange; // perto (some → cheio), longe (cheio → some)
  varying vec2 vCell;
  varying vec4 vInfo;
  varying float vTint;
  varying float vFade;
  void main() {
    float g = aInfo.y;
    float rows = aInfo.z;
    // fita de pé que só gira em y para encarar a câmera
    vec3 to = cameraPosition - aTop;
    vec3 right = normalize(vec3(to.z, 0.0, -to.x));
    vec3 p = aTop + right * position.x * g + vec3(0.0, (position.y - 0.5) * rows * g, 0.0);
    float dist = length(cameraPosition - aTop + vec3(0.0, rows * g * 0.5, 0.0));
    vFade = smoothstep(uRange.x, uRange.y, dist) * (1.0 - smoothstep(uRange.z, uRange.w, dist));
    vCell = vec2(position.x + 0.5, (0.5 - position.y) * rows);
    vInfo = aInfo;
    vTint = aTint;
    gl_Position = vFade < 0.001 ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const rainFragment = /* glsl */ `
  uniform sampler2D uGlyphs;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uInk;
  varying vec2 vCell;
  varying vec4 vInfo;
  varying float vTint;
  varying float vFade;
  ${HELPERS}
  ${RAIN}
  void main() {
    float rows = vInfo.z;
    float cell = floor(vCell.y);
    vec2 tr = rain(cell, rows, vInfo.x, vInfo.w);
    float g = glyph(uGlyphs, vCell, cell, vInfo.x, 1.5 + tr.y * 12.0);
    // código parado bem fraco, rastro na cor do modo e a cabeça branca acima do limiar do bloom
    vec3 col = mix(uA, uB, vTint) * (0.07 + tr.x * 0.95) + uInk * tr.y * 2.4;
    float ends = smoothstep(0.0, 2.5, vCell.y) * (1.0 - smoothstep(rows - 3.0, rows, vCell.y));
    gl_FragColor = vec4(col * g * ends * vFade * uOpacity, 1.0);
  }
`

const tmpV = new THREE.Vector3()

/** Retângulo na tela (NDC) dos pontos vistos por `cam`; null se algum fica atrás dela. */
function screenRect(cam, points) {
  const r = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of points) {
    tmpV.copy(p).applyMatrix4(cam.matrixWorldInverse)
    if (tmpV.z > -0.5) return null
    tmpV.applyMatrix4(cam.projectionMatrix)
    r[0] = Math.min(r[0], tmpV.x)
    r[1] = Math.min(r[1], tmpV.y)
    r[2] = Math.max(r[2], tmpV.x)
    r[3] = Math.max(r[3], tmpV.y)
  }
  return r
}

/** Os retângulos [x0, y0, x1, y1] se tocam, com folga `px`, `py`? */
const touches = (a, b, px = 0, py = 0) => a[0] < b[2] + px && a[2] > b[0] - px && a[1] < b[3] + py && a[3] > b[1] - py
const onScreen = (r) => r[2] > -1 && r[0] < 1 && r[3] > -1 && r[1] < 1

/**
 * Os pontos (vistos de alguma estação, até `far` unidades) cairiam em cima de uma zona ocupada? `grow` alarga
 * o retângulo em unidades do mundo (meia largura de uma coluna fina).
 */
function blocked(views, points, center, far, grow, aspect, fov, padX, padY) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  return views.some((v) => {
    const rect = screenRect(v.cam, points)
    if (!rect) return false
    const dist = v.cam.position.distanceTo(center)
    if (dist > far) return false
    const hw = grow / (dist * tanH * aspect)
    rect[0] -= hw
    rect[2] += hw
    return onScreen(rect) && v.zones.some((z) => touches(rect, z, padX, padY))
  })
}

/**
 * Como a câmera vê cada estação: na chegada e no fim da parada (`s` e `s + 0.12`), com as zonas de texto
 * medidas no DOM mais as dos marcos que já ocupam a tela ali (`extra`).
 */
function stationViews(path, aspect, fov, zones, extra) {
  return zones.flatMap((list, j) =>
    [j, j + 0.12].map((s) => ({ j, cam: cameraOnPath(path, s, aspect, fov).clone(), zones: [...list, ...(extra[j] ?? [])] })),
  )
}

/** Retângulo NDC de uma esfera de raio (rx, ry) vista da estação `s`: para os marcos entrarem nas zonas ocupadas. */
function sphereRect(path, s, center, rx, ry, aspect, fov) {
  const cam = cameraOnPath(path, s, aspect, fov)
  const c = center.clone().project(cam)
  const depth = center.clone().sub(cam.position).dot(cam.getWorldDirection(tmpV))
  const k = 1 / (depth * Math.tan(THREE.MathUtils.degToRad(fov / 2)))
  return [c.x - (rx * k) / aspect, c.y - ry * k, c.x + (rx * k) / aspect, c.y + ry * k]
}

/**
 * Colunas de código caindo no ar (Matrix) ao longo da viagem inteira. Quem cairia atrás do texto de alguma
 * estação (ou de um marco) fica de fora, então nas paradas a chuva só ocupa os vãos livres; nos voos ela
 * passa por todo lado. Aditiva: a cabeça de cada coluna acende no bloom.
 */
function CodeRain({ path, count, views, aspect, fov, map, active, reduced }) {
  const group = useRef()
  const mat = useRef()
  const fade = useFade(active, reduced)
  const { width, height } = useThree((s) => s.size)
  const FAR = 85
  const geometry = useMemo(() => {
    const r = rng(77)
    const padX = 40 / width
    const padY = 40 / height
    const top = new THREE.Vector3()
    const bottom = new THREE.Vector3()
    const mid = new THREE.Vector3()
    const cols = { top: [], info: [], tint: [] }
    for (let tries = 0, n = 0; views.length && n < count && tries < count * 30; tries++) {
      // metade perto das estações (onde o olho para; colunas curtas cabem nos vãos), metade pelos voos
      const near = r() < 0.5
      const s = near ? Math.floor(r() * 4) - 0.05 + r() * 0.3 : -0.05 + r() * 3.1
      const c = placeOnPath(path, s, [r() * 2.4 - 1.2, r() * 1.9 - 0.85], 9 + Math.pow(r(), 1.3) * 60, aspect, fov)
      const g = 0.26 + r() * 0.4
      const rows = Math.round(near ? 6 + r() * 14 : 10 + r() * 26)
      const y0 = Math.max(FLOOR_Y + 0.4, c.y - (rows * g) / 2)
      top.set(c.x, y0 + rows * g, c.z)
      bottom.set(c.x, y0, c.z)
      mid.lerpVectors(top, bottom, 0.5)
      if (blocked(views, [top, bottom], mid, FAR, g / 2, aspect, fov, padX, padY)) continue
      cols.top.push(top.x, top.y, top.z)
      cols.info.push(r(), g, rows, 6 + r() * 10)
      cols.tint.push(r() < 0.3 ? 1 : 0)
      n++
    }
    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.attributes.position)
    geo.setAttribute('aTop', new THREE.InstancedBufferAttribute(new Float32Array(cols.top), 3))
    geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(cols.info), 4))
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(cols.tint), 1))
    geo.instanceCount = cols.tint.length
    return geo
  }, [path, count, views, aspect, fov, width, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(
    () => ({
      uGlyphs: { value: map },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uRange: { value: new THREE.Vector4(3, 8, 50, FAR) },
      uA: { value: color(fs.accent) },
      uB: { value: color(fs['accent-2']) },
      uInk: { value: color(COLD) },
    }),
    [map],
  )
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002 && geometry.instanceCount > 0
    const u = mat.current.uniforms
    u.uOpacity.value = v
    if (!reduced) u.uTime.value += dt
  })
  return (
    <group ref={group}>
      <mesh geometry={geometry} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={mat} vertexShader={rainVertex} fragmentShader={rainFragment} uniforms={uniforms} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

const KEYWORDS = /^(class|public|return|const|export|function|async|await|var|new|import|from|if|SELECT|FROM|JOIN|ON|WHERE|GROUP|BY|ORDER|DESC|AS|COUNT|GET|POST|PUT|PATCH|DELETE|INSERT|UPDATE|COMMIT|git|npm|docker|Task|interface|extends|type|WORKDIR|COPY|RUN|EXPOSE|CMD|describe|expect|jobs|steps)$/
const TOKEN = /(\/\/.*|--.*)|('[^']*'|"[^"]*"|`[^`]*`)|(@\w+|\[\w+)|(\b\d[\d.,]*%?)|(\w+)|([^\w'"`@[]+|\[)/g

/** Separa uma linha de código ou de log em trechos coloridos (realce de sintaxe simples, só para o desenho). */
function tokenize(line) {
  return [...line.matchAll(TOKEN)].map(([t, comment, str, deco, num, word]) => [
    t,
    t.includes('✓') ? 'ok' : t.includes('▸') ? 'keyword' : comment ? 'comment' : str ? 'string' : deco ? 'deco' : num ? 'number' : word && KEYWORDS.test(word) ? 'keyword' : 'text',
  ])
}

/** Quadro de um painel no atlas (px) e altura de uma linha de texto. */
const TILE = { w: 512, h: 256, head: 64, line: 26 }

/**
 * Atlas dos painéis: trechos de código (4 × 2 quadros com cabeçalho) e, abaixo, cabeçalhos e colunas de
 * linhas dos terminais de log. Devolve as janelas de cada um em UV e o que os shaders precisam para digitar
 * (caracteres por linha, largura do caractere) e rolar (número de linhas).
 */
function screenAtlas(snippets, logs) {
  const c = colors('fullstack')
  const ink = { comment: c.muted, string: c['accent-2'], deco: c['accent-2'], number: c['accent-2'], ok: c['accent-2'], keyword: c.accent, text: c.body }
  const cols = 4
  const logTop = Math.ceil(snippets.length / cols) * TILE.h
  const bodyTop = logTop + TILE.head
  const canvas = document.createElement('canvas')
  canvas.width = TILE.w * cols
  canvas.height = bodyTop + Math.max(...logs.map((l) => l.lines.length)) * TILE.line
  const W = canvas.width
  const H = canvas.height
  const win = (x, y, w, h) => [x / W, 1 - (y + h) / H, w / W, h / H]
  const ctx = canvas.getContext('2d')
  const mono = font('code')
  const header = (x0, y0, title) => {
    TRAFFIC.forEach((dot, k) => {
      ctx.fillStyle = dot
      ctx.beginPath()
      ctx.arc(x0 + 30 + k * 18, y0 + 26, 5.5, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.font = `500 17px ${mono}`
    ctx.fillStyle = c.muted
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, x0 + TILE.w - 26, y0 + 27)
    ctx.fillStyle = c['hairline-strong']
    ctx.fillRect(x0 + 14, y0 + 48, TILE.w - 28, 2)
    ctx.textAlign = 'left'
  }
  // a fonte encolhe para a linha mais longa caber
  const fit = (lines, size) => {
    ctx.font = `500 ${size}px ${mono}`
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    if (widest > TILE.w - 52) size = Math.floor((size * (TILE.w - 52)) / widest)
    ctx.font = `500 ${size}px ${mono}`
  }
  const paint = (line, x, y) => {
    for (const [text, kind] of tokenize(line)) {
      ctx.fillStyle = ink[kind]
      ctx.fillText(text, x, y)
      x += ctx.measureText(text).width
    }
  }
  const code = snippets.map((sn, i) => {
    const x0 = (i % cols) * TILE.w
    const y0 = Math.floor(i / cols) * TILE.h
    header(x0, y0, sn.lang)
    fit(sn.lines, 21)
    sn.lines.forEach((line, j) => paint(line, x0 + 26, y0 + 76 + j * TILE.line))
    return { kind: 0, tile: win(x0, y0, TILE.w, TILE.h), body: [ctx.measureText('M').width / TILE.w, 0, 0, 0], chars: sn.lines.map((l) => [...l].length) }
  })
  const log = logs.map((lg, i) => {
    const x0 = i * TILE.w
    header(x0, logTop, lg.title)
    fit(lg.lines, 19)
    lg.lines.forEach((line, j) => paint(line, x0 + 26, bodyTop + (j + 0.5) * TILE.line))
    return { kind: 1, tile: win(x0, logTop, TILE.w, TILE.head), body: [x0 / W, 1 - bodyTop / H, TILE.w / W, TILE.line / H], lines: lg.lines.length }
  })
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.premultiplyAlpha = true
  map.anisotropy = 4
  // código e log alternados (os logs se repetem), para os painéis vizinhos nunca repetirem o tipo
  const contents = code.flatMap((item, i) => [item, log[i % log.length]])
  return { map, contents }
}

const screenVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aRight;
  attribute vec3 aUp;
  attribute vec4 aTile; // janela no atlas: quadro do código ou cabeçalho do log
  attribute vec4 aBody; // código: largura do caractere; log: coluna de linhas (u, v do topo, largura, altura da linha)
  attribute vec4 aData; // semente, brilho, tipo (0 código, 1 log), total de caracteres ou de linhas
  attribute vec4 aShow; // estações em que aparece (acende) e some
  attribute vec4 aC0; // caracteres das linhas 0–3 e 4–7 (código)
  attribute vec4 aC1;
  uniform vec4 uRange;
  uniform float uStation;
  uniform float uTime;
  varying vec2 vUv;
  varying vec4 vTile;
  varying vec4 vBody;
  varying vec4 vData;
  varying vec4 vC0;
  varying vec4 vC1;
  varying float vFade;
  void main() {
    // flutua de leve
    vec3 c = aCenter + aUp * sin(uTime * 0.5 + aData.x * 6.283) * 0.04;
    vec3 p = c + aRight * position.x * 2.0 + aUp * position.y * 2.0;
    // o painel inteiro acende e apaga junto (profundidade do centro); some perto da câmera para atravessar
    float dist = -(viewMatrix * vec4(c, 1.0)).z;
    float show = smoothstep(aShow.x, aShow.y, uStation) * (1.0 - smoothstep(aShow.z, aShow.w, uStation));
    vFade = smoothstep(uRange.x, uRange.y, dist) * (1.0 - smoothstep(uRange.z, uRange.w, dist)) * show;
    vUv = position.xy + 0.5;
    vTile = aTile;
    vBody = aBody;
    vData = aData;
    vC0 = aC0;
    vC1 = aC1;
    gl_Position = vFade < 0.001 ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const screenFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uStill;
  uniform vec3 uA; uniform vec3 uGlass;
  varying vec2 vUv;
  varying vec4 vTile;
  varying vec4 vBody;
  varying vec4 vData;
  varying vec4 vC0;
  varying vec4 vC1;
  varying float vFade;
  ${HELPERS}
  const float X0 = 26.0 / 512.0;
  const float TOP = 63.0 / 256.0;
  const float LH = 26.0 / 256.0;
  const float CPS = 0.035; // segundos por caractere digitado
  float rbox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.0, 1.0);
    float d = rbox(p, vec2(0.98, 0.48), 0.06);
    float aa = fwidth(d);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    float border = 1.0 - smoothstep(0.0, aa * 1.5 + 0.004, abs(d + 0.006));
    float py = 1.0 - vUv.y;
    float seed = vData.x;
    float row = (py - TOP) / LH;
    vec3 text = vec3(0.0);
    float lit = 0.0;
    if (vData.z < 0.5) {
      // código sendo digitado: caractere por caractere, segura uns segundos com o cursor piscando e apaga
      text = texture2D(uMap, vTile.xy + vUv * vTile.zw).rgb;
      float total = vData.w;
      float period = total * CPS + 5.0;
      float tl = mod(uTime + seed * 47.0, period);
      float prog = mix(min(total, tl / CPS), total, uStill);
      float erase = smoothstep(period - 0.6, period, tl) * (1.0 - uStill);
      float j = floor(row);
      float before = 0.0;
      float chars = 0.0;
      for (int k = 0; k < 4; k++) {
        float fk = float(k);
        before += (fk < j ? vC0[k] : 0.0) + (fk + 4.0 < j ? vC1[k] : 0.0);
        chars += (fk == j ? vC0[k] : 0.0) + (fk + 4.0 == j ? vC1[k] : 0.0);
      }
      float rev = clamp(prog - before, 0.0, chars);
      float col = (vUv.x - X0) / vBody.x;
      float body = step(TOP - 0.02, py);
      text *= mix(1.0, step(floor(col) + 0.5, rev) * (1.0 - erase), body);
      // cursor em bloco logo depois do último caractere digitado
      bool here = prog >= before && (prog < before + chars || (prog >= total && before + chars >= total - 0.5)) && chars > 0.0;
      float blink = mix(step(0.5, fract(uTime * 1.6)), 1.0, step(prog, total - 0.5));
      lit = here ? band(col, floor(rev) + 0.08, floor(rev) + 0.72, fwidth(col)) * band(fract(row), 0.16, 0.84, fwidth(row)) * blink * (1.0 - erase) : 0.0;
    } else {
      float n = vData.w;
      if (py < TOP - 0.02) {
        // cabeçalho do terminal (o quadro do atlas tem 64 px: o quarto de cima do painel)
        text = texture2D(uMap, vTile.xy + vec2(vUv.x, clamp((vUv.y - 0.75) * 4.0, 0.0, 1.0)) * vTile.zw).rgb * step(0.75, vUv.y);
      } else {
        // log rolando: uma linha nova sobe a cada passo e acende quando chega
        float tt = uTime * (0.45 + fract(seed * 7.3) * 0.5) * (1.0 - uStill) + seed * n;
        float scroll = floor(tt) + smoothstep(0.7, 1.0, fract(tt));
        float L = row + scroll;
        float idx = mod(floor(L), n);
        vec2 cont = vec2(vBody.x + vUv.x * vBody.z, vBody.y - L * vBody.w);
        vec2 uv = vec2(cont.x, vBody.y - (idx + fract(L)) * vBody.w);
        text = textureGrad(uMap, uv, dFdx(cont), dFdy(cont)).rgb;
        float yb = row / 7.0;
        text *= smoothstep(0.0, 0.05, yb) * (1.0 - smoothstep(0.93, 1.0, yb));
        float fresh = step(6.0, floor(row)) * (1.0 - smoothstep(0.0, 0.5, fract(tt))) * step(fract(tt), 0.7) * (1.0 - uStill);
        text *= 1.0 + fresh * 1.4;
      }
    }
    // varredura de leitura descendo pelo painel
    float scan = fract(uTime * 0.16 + seed);
    float sweep = exp(-pow((py - scan) * 14.0, 2.0)) * inside;
    vec3 col = uGlass * inside + text * (1.3 + sweep * 0.5) + uA * (border * 1.3 + sweep * 0.1 + lit * 1.8);
    // vidro quase opaco: com os painéis desenhados de trás para frente, o da frente esconde o de trás
    float a = inside * 0.9 + border * 0.1;
    gl_FragColor = vec4(col, a) * vFade * uOpacity * vData.y;
  }
`

const UP = new THREE.Vector3(0, 1, 0)

/** Eixos (meia largura, meia altura) de um painel de `w` × `h` cuja frente aponta para `N`, girado `roll` no próprio plano. */
function facing(N, w, h, roll = 0) {
  const right = new THREE.Vector3().crossVectors(UP, N).normalize()
  const up = new THREE.Vector3().crossVectors(N, right).normalize()
  const r = right.clone().multiplyScalar(Math.cos(roll)).addScaledVector(up, Math.sin(roll))
  const u = up.clone().multiplyScalar(Math.cos(roll)).addScaledVector(right, -Math.sin(roll))
  return { right: r.multiplyScalar(w / 2), up: u.multiplyScalar(h / 2) }
}

/**
 * Painéis num trecho de voo, em volta da trilha: `arc` é o ângulo em volta da direção de viagem (0 = direita,
 * π/2 = alto, π = esquerda). Cada um encara quem chega, um pouco virado para o eixo. Nunca no chão nem
 * dentro das fileiras de racks; com `aisle` eles ficam pendurados no corredor do datacenter, entre as fileiras.
 */
function flightScreens(path, { from, to, count, arc, radius, size, show, aisle = false, face = 0.4 }, r, out) {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const t = new THREE.Vector3()
  for (let i = 0, tries = 0; i < count && tries < count * 20; tries++) {
    const s = from + (to - from) * (((tries % count) + r() * 0.8) / count)
    path.sample(s, a, b)
    path.sample(s + 0.01, t, b)
    const T = t.sub(a).normalize()
    const U = UP.clone().addScaledVector(T, -UP.dot(T)).normalize()
    const R = new THREE.Vector3().crossVectors(T, U)
    const ang = arc[0] + r() * (arc[1] - arc[0])
    const rad = radius[0] + r() * (radius[1] - radius[0])
    const off = R.clone().multiplyScalar(Math.cos(ang) * rad).addScaledVector(U, Math.sin(ang) * rad)
    const c = a.clone().add(off)
    const w = size[0] + r() * (size[1] - size[0])
    const racks = !aisle && s > RACK_S[0] - 0.05 && s < RACK_S[1] + 0.05
    if (c.y - w / 4 < (racks ? FLOOR_Y + RACK.h + 1.2 : FLOOR_Y + 0.6)) continue
    if (aisle && Math.abs(Math.cos(ang) * rad) + (w / 2) * Math.abs(Math.sin(ang)) > RACK.aisle - 0.2) continue
    const N = T.clone().negate().addScaledVector(off.clone().normalize(), -face).normalize()
    out.push({ center: c, ...facing(N, w, w / 2, (r() - 0.5) * 0.25), show })
    i++
  }
}

/**
 * Painéis parados numa estação, nos vãos que sobram entre as zonas de texto: procura posições na tela onde
 * o painel cabe inteiro (com folga, longe dos outros e dos de `placed`, que recebe os novos), confere de novo
 * no fim da parada e o põe numa profundidade de `depth` em que ele tem `px` de largura, virado um pouco para o centro.
 */
function stationScreens(path, j, { max, px, depth: [d0, d1] = [13, 20], aspect, fov, width, height, views, show, placed = [] }, r, out) {
  const mine = views.filter((v) => v.j === j)
  if (!mine.length) return
  const hw = px / width
  const hh = px / 2 / height
  const padX = 32 / width
  const padY = 32 / height
  const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const cands = []
  for (let y = 1 - hh - padY; y > -1 + hh + padY; y -= 0.04) for (let x = -1 + hw + padX; x < 1 - hw - padX; x += 0.04) cands.push([x, y])
  for (let i = cands.length - 1; i > 0; i--) {
    const k = Math.floor(r() * (i + 1))
    ;[cands[i], cands[k]] = [cands[k], cands[i]]
  }
  let n = 0
  for (const [x, y] of cands) {
    if (n >= max) break
    const rect = [x - hw, y - hh, x + hw, y + hh]
    if (placed.some((p) => touches(rect, p, padX * 2, padY * 2))) continue
    if (mine[0].zones.some((z) => touches(rect, z, padX, padY))) continue
    const depth = d0 + r() * (d1 - d0)
    const center = placeOnPath(path, j, [x, y], depth, aspect, fov)
    const h = (px / 2 / height) * 2 * depth * tanH
    const N = mine[0].cam.position.clone().sub(center).normalize().applyAxisAngle(UP, -Math.sign(x) * 0.22)
    const f = facing(N, h * 2, h, (r() - 0.5) * 0.06)
    const corners = [1, -1].flatMap((sx) => [1, -1].map((sy) => center.clone().addScaledVector(f.right, sx).addScaledVector(f.up, sy)))
    const free = mine.every((v) => {
      const rr = screenRect(v.cam, corners)
      return rr && rr[0] > -1 + padX / 2 && rr[2] < 1 - padX / 2 && rr[1] > -1 + padY / 2 && rr[3] < 1 - padY / 2 && !v.zones.some((z) => touches(rr, z, padX / 2, padY / 2))
    })
    if (!free) continue
    placed.push(rect)
    out.push({ center, ...f, show })
    n++
  }
}

const SCREEN_ATTRS = [
  ['aCenter', 3],
  ['aRight', 3],
  ['aUp', 3],
  ['aTile', 4],
  ['aBody', 4],
  ['aData', 4],
  ['aShow', 4],
  ['aC0', 4],
  ['aC1', 4],
]

/**
 * Painéis de vidro com código: trechos sendo digitados (cursor piscando) e terminais de log rolando.
 * Vêm de `items` (posição, eixos, estações em que aparecem, conteúdo do atlas). São quase opacos e
 * reordenados de trás para frente a cada frame, então um painel na frente esconde o de trás.
 */
function Screens({ items, atlas, active, reduced }) {
  const group = useRef()
  const mat = useRef()
  const fade = useFade(active, reduced)
  const sorted = useRef([])
  const { geometry, base, depth } = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.attributes.position)
    const base = {}
    for (const [name, size] of SCREEN_ATTRS) {
      base[name] = new Float32Array(items.length * size)
      items.forEach((it, i) => base[name].set(it[name], i * size))
      geo.setAttribute(name, new THREE.InstancedBufferAttribute(base[name].slice(), size).setUsage(THREE.DynamicDrawUsage))
    }
    geo.instanceCount = items.length
    sorted.current = items.map((_, i) => i)
    return { geometry: geo, base, depth: new Float32Array(items.length) }
  }, [items])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(
    () => ({
      uMap: { value: atlas.map },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uStill: { value: 0 },
      uStation: { value: 0 },
      uRange: { value: new THREE.Vector4(3.5, 7, 42, 58) },
      uA: { value: color(fs.accent) },
      uGlass: { value: color(GLASS) },
    }),
    [atlas],
  )
  const dir = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002 && items.length > 0
    const u = mat.current.uniforms
    u.uOpacity.value = v
    u.uStation.value = world.camera.station
    u.uStill.value = reduced ? 1 : 0
    if (!reduced) u.uTime.value += dt
    if (!group.current.visible) return
    // de trás para frente: só reescreve os atributos quando a ordem muda
    camera.getWorldDirection(dir)
    const c = base.aCenter
    for (let i = 0; i < items.length; i++) depth[i] = (c[i * 3] - camera.position.x) * dir.x + (c[i * 3 + 1] - camera.position.y) * dir.y + (c[i * 3 + 2] - camera.position.z) * dir.z
    const next = [...sorted.current].sort((a, b) => depth[b] - depth[a])
    if (next.every((k, i) => k === sorted.current[i])) return
    sorted.current = next
    for (const [name, size] of SCREEN_ATTRS) {
      const attr = geometry.attributes[name]
      next.forEach((k, i) => attr.array.set(base[name].subarray(k * size, k * size + size), i * size))
      attr.needsUpdate = true
    }
  })
  return (
    <group ref={group}>
      <mesh geometry={geometry} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={mat} vertexShader={screenVertex} fragmentShader={screenFragment} uniforms={uniforms} {...premultiplied} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Atributos de um painel: posição e eixos de `place`, conteúdo `content` do atlas. */
function screenItem(place, content, r) {
  const chars = content.kind === 0 ? content.chars : []
  const c8 = Array.from({ length: 8 }, (_, k) => chars[k] ?? 0)
  return {
    aCenter: place.center.toArray(),
    aRight: place.right.toArray(),
    aUp: place.up.toArray(),
    aTile: content.tile,
    aBody: content.body,
    aData: [r(), 0.75 + r() * 0.25, content.kind, content.kind === 0 ? chars.reduce((a, b) => a + b, 0) : content.lines],
    aShow: place.show,
    aC0: c8.slice(0, 4),
    aC1: c8.slice(4),
  }
}

/* ---------- paredões de código no fundo ---------- */

/** Listagem dos paredões: 128 linhas de 16 px numa faixa de 512 px (trechos e logs em sequência, numerados). */
const LISTING = { w: 512, rows: 128, line: 16 }

function listingAtlas(snippets, logs) {
  const c = colors('fullstack')
  const ink = { comment: c.muted, string: c['accent-2'], deco: c['accent-2'], number: c['accent-2'], ok: c['accent-2'], keyword: c.accent, text: c.body }
  const lines = []
  for (let k = 0; lines.length < LISTING.rows; k++) {
    const sn = snippets[k % snippets.length]
    lines.push(`// ${sn.lang}`, ...sn.lines, '', ...logs[k % logs.length].lines.slice(0, 4), '')
  }
  const canvas = document.createElement('canvas')
  canvas.width = LISTING.w
  canvas.height = LISTING.rows * LISTING.line
  const ctx = canvas.getContext('2d')
  ctx.font = `500 12px ${font('code')}`
  ctx.textBaseline = 'middle'
  lines.slice(0, LISTING.rows).forEach((line, i) => {
    const y = (i + 0.5) * LISTING.line
    ctx.fillStyle = c.muted
    ctx.globalAlpha = 0.45
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), 30, y)
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    let x = 44
    for (const [text, kind] of tokenize(line)) {
      ctx.fillStyle = ink[kind]
      ctx.fillText(text, x, y)
      x += ctx.measureText(text).width
    }
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** Resolução de cada faixa da máscara de texto (uma por estação, empilhadas). */
const MASK = { w: 96, h: 64 }

/**
 * Máscara das zonas ocupadas (NDC) de cada estação, borrada, numa textura de quatro faixas empilhadas: os
 * paredões apagam atrás do texto enquanto a câmera está parada na estação.
 */
function textMask(lists) {
  const { w, h } = MASK
  const data = new Uint8Array(w * h * 4)
  const a = new Float32Array(w * h)
  const b = new Float32Array(w * h)
  const clampI = (v, n) => Math.min(n - 1, Math.max(0, v))
  lists.slice(0, 4).forEach((list, j) => {
    a.fill(0)
    for (const [x0, y0, x1, y1] of list) {
      const i0 = clampI(Math.floor(((x0 + 1) / 2) * w) - 2, w)
      const i1 = clampI(Math.ceil(((x1 + 1) / 2) * w) + 2, w)
      const k0 = clampI(Math.floor(((y0 + 1) / 2) * h) - 2, h)
      const k1 = clampI(Math.ceil(((y1 + 1) / 2) * h) + 2, h)
      for (let k = k0; k <= k1; k++) a.fill(1, k * w + i0, k * w + i1 + 1)
    }
    // borrão de caixa nas duas direções, duas vezes: a borda apaga aos poucos
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < h; k++)
        for (let i = 0; i < w; i++) {
          let sum = 0
          for (let d = -2; d <= 2; d++) sum += a[k * w + clampI(i + d, w)]
          b[k * w + i] = sum / 5
        }
      for (let k = 0; k < h; k++)
        for (let i = 0; i < w; i++) {
          let sum = 0
          for (let d = -2; d <= 2; d++) sum += b[clampI(k + d, h) * w + i]
          a[k * w + i] = sum / 5
        }
    }
    for (let i = 0; i < w * h; i++) data[j * w * h + i] = Math.round(Math.min(1, a[i]) * 255)
  })
  const tex = new THREE.DataTexture(data, w, h * 4, THREE.RedFormat, THREE.UnsignedByteType)
  tex.minFilter = tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const wallVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aRight;
  attribute vec3 aUp;
  attribute vec4 aInfo; // semente, tipo (0 chuva, 1 listagem), tamanho da célula ou da linha, velocidade
  attribute vec4 aShow; // estações em que acende e apaga
  attribute vec3 aTone; // brilho, névoa (começo, fim)
  uniform float uStation;
  varying vec2 vUv;
  varying vec2 vGrid;
  varying vec2 vCells;
  varying vec4 vInfo;
  varying vec3 vTone;
  varying vec3 vWorld;
  varying float vShow;
  void main() {
    vec3 p = aCenter + aRight * position.x * 2.0 + aUp * position.y * 2.0;
    vec2 size = vec2(length(aRight), length(aUp)) * 2.0;
    vUv = position.xy + 0.5;
    // em células, a partir do canto de cima
    vGrid = vec2(vUv.x * size.x, (1.0 - vUv.y) * size.y) / aInfo.z;
    vCells = size / aInfo.z;
    vInfo = aInfo;
    vTone = aTone;
    vWorld = p;
    vShow = smoothstep(aShow.x, aShow.y, uStation) * (1.0 - smoothstep(aShow.z, aShow.w, uStation));
    gl_Position = vShow < 0.001 ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const wallFragment = /* glsl */ `
  uniform sampler2D uGlyphs;
  uniform sampler2D uListing;
  uniform sampler2D uMask;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uStation;
  uniform vec2 uRes;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uInk;
  varying vec2 vUv;
  varying vec2 vGrid;
  varying vec2 vCells;
  varying vec4 vInfo;
  varying vec3 vTone;
  varying vec3 vWorld;
  varying float vShow;
  ${HELPERS}
  ${RAIN}
  void main() {
    float seed = vInfo.x;
    vec3 col;
    if (vInfo.y < 0.5) {
      // Matrix: colunas de caracteres caindo, duas gotas por coluna
      float gx = floor(vGrid.x);
      float cell = floor(vGrid.y);
      float lane = step(0.18, hash12(vec2(gx, seed * 7.3)));
      float sp = (5.0 + hash12(vec2(gx, seed)) * 9.0) * vInfo.w;
      vec2 tr = max(rain(cell, vCells.y, hash12(vec2(gx, seed + 1.7)), sp), rain(cell, vCells.y, hash12(vec2(gx, seed + 9.1)), sp * 0.85));
      float g = glyph(uGlyphs, vGrid, cell, seed + gx * 3.1, 1.0 + tr.y * 10.0);
      vec3 tint = mix(uA, uB, step(0.72, hash12(vec2(gx, seed * 3.1))));
      col = lane * g * (tint * (0.06 + tr.x * 0.8) + uInk * tr.y * 1.3);
    } else {
      // listagem: colunas de código subindo uma linha por vez, cada uma num trecho, com a linha atual acesa
      vec2 cont = vec2(vGrid.x / 32.0, vGrid.y / 128.0);
      float column = floor(cont.x);
      float tt = uTime * vInfo.w + seed * 3.7 + column * 1.3;
      float scroll = floor(tt) + smoothstep(0.75, 1.0, fract(tt)) + floor(hash12(vec2(column, seed)) * 128.0);
      vec2 tc = vec2(cont.x, -(vGrid.y + scroll) / 128.0);
      vec4 t = textureGrad(uListing, tc, dFdx(cont) * vec2(1.0, -1.0), dFdy(cont) * vec2(1.0, -1.0));
      float at = floor(vCells.y * 0.62);
      float cur = band(vGrid.y, at, at + 1.0, fwidth(vGrid.y)) * step(fract(cont.x), 0.68);
      col = t.rgb * t.a * (0.6 + cur * 1.4) + uA * cur * 0.05;
    }
    // bordas macias: o paredão some no escuro em vez de terminar num retângulo
    float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(0.0, 0.1, 1.0 - vUv.x) * smoothstep(0.0, 0.14, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
    float fog = 1.0 - smoothstep(vTone.y, vTone.z, distance(cameraPosition, vWorld));
    // parada numa estação: apaga atrás do texto dela
    float j = clamp(floor(uStation + 0.2), 0.0, 3.0);
    float d = uStation - j;
    float calm = smoothstep(-0.2, -0.04, d) * (1.0 - smoothstep(0.14, 0.32, d));
    vec2 sc = gl_FragCoord.xy / uRes;
    float m = texture2D(uMask, vec2(sc.x, (j + clamp(sc.y, 0.01, 0.99)) * 0.25)).r;
    float keep = 1.0 - m * calm * 0.96;
    gl_FragColor = vec4(col * vTone.x * edge * fog * keep * vShow * uOpacity, 1.0);
  }
`

/**
 * Onde ficam os paredões: um cânion dos dois lados da viagem (de Trabalhos ao fim, voltados para a trilha e
 * um pouco para quem chega) e paredões de frente para a câmera no fundo de cada estação, ancorados na tela.
 * 62% são chuva Matrix e o resto listagens de código. `k` (qualidade) abre buracos no cânion.
 */
function wallItems(path, { aspect, fov, k }, r) {
  const out = []
  const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const info = (scale) => {
    const listing = r() < 0.38 ? 1 : 0
    return [r() * 100, listing, (listing ? 1.1 + r() * 0.4 : 0.85 + r() * 0.5) * scale, listing ? 0.5 + r() * 0.5 : 0.8 + r() * 0.4]
  }
  const push = (center, f, show, tone, scale = 1) => out.push({ aCenter: center.toArray(), aRight: f.right.toArray(), aUp: f.up.toArray(), aInfo: info(scale), aShow: show, aTone: tone })
  // o cânion acompanha as curvas da trilha
  const track = Array.from({ length: 121 }, (_, i) => {
    const p = new THREE.Vector3()
    path.sample((i / 120) * 3, p, tmpV)
    return p
  })
  const xAt = (z) => track.reduce((best, p) => (Math.abs(p.z - z) < Math.abs(best.z - z) ? p : best)).x
  for (const side of [-1, 1])
    for (let z = -14 - r() * 10; z > -250; ) {
      const w = 22 + r() * 16
      const h = 40 + r() * 34
      const N = new THREE.Vector3(-side, 0, 0.45 + r() * 0.35).normalize()
      const f = facing(N, w, h)
      const along = Math.abs(f.right.z) * 2
      if (r() < Math.max(0.55, k)) push(new THREE.Vector3(xAt(z) + side * (20 + r() * 14), FLOOR_Y + h / 2 - 1, z - along / 2), f, [0.2, 0.5, 9, 10], [1, 70, 230])
      z -= along + 3 + r() * 10
    }
  // de frente, no fundo das estações: no hero atrás do skyline (apaga na descida para o datacenter)
  const backdrop = (s, ndc, [nw, nh], depth, show, tone) => {
    const c = placeOnPath(path, s, ndc, depth, aspect, fov)
    const N = cameraOnPath(path, s, aspect, fov).position.clone().sub(c).setY(0).normalize()
    push(c, facing(N, nw * depth * tanH * aspect, nh * depth * tanH), show, tone, depth / 110)
  }
  backdrop(0, [0.58, 0.32], [0.75, 1.15], 320, [-1, -0.9, 0.3, 0.7], [1.1, 300, 470])
  backdrop(0, [-0.62, 0.4], [0.65, 1.0], 340, [-1, -0.9, 0.3, 0.7], [0.7, 300, 470])
  for (const [j, show] of [
    [1, [0.5, 0.85, 1.6, 2.0]],
    [2, [1.5, 1.85, 2.6, 3.0]],
    [3, [2.5, 2.85, 9, 10]],
  ]) {
    backdrop(j, [-0.58, 0.4], [0.8, 1.25], 150 + r() * 20, show, [0.9, 150, 340])
    backdrop(j, [0.62, 0.3], [0.8, 1.25], 160 + r() * 20, show, [0.9, 150, 340])
  }
  return out
}

const WALL_ATTRS = [
  ['aCenter', 3],
  ['aRight', 3],
  ['aUp', 3],
  ['aInfo', 4],
  ['aShow', 4],
  ['aTone', 3],
]

/**
 * Paredões de código no fundo: chuva Matrix densa ou listagens de código subindo, com bordas que somem no
 * escuro. Aditivos e desenhados antes dos painéis (que os escondem); prédios e racks na frente os cobrem.
 * Parada numa estação, a máscara de texto (`mask`) os apaga atrás do texto dela.
 */
function CodeWalls({ items, glyphs, listing, mask, active, reduced }) {
  const group = useRef()
  const mat = useRef()
  const fade = useFade(active, reduced)
  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.attributes.position)
    for (const [name, size] of WALL_ATTRS) geo.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap((it) => it[name])), size))
    geo.instanceCount = items.length
    return geo
  }, [items])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(
    () => ({
      uGlyphs: { value: glyphs },
      uListing: { value: listing },
      uMask: { value: null },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uStation: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uA: { value: color(fs.accent) },
      uB: { value: color(fs['accent-2']) },
      uInk: { value: color(COLD) },
    }),
    [glyphs, listing],
  )
  useFrame(({ gl }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002 && items.length > 0 && mask !== null
    const u = mat.current.uniforms
    u.uOpacity.value = v
    u.uStation.value = world.camera.station
    u.uMask.value = mask
    gl.getDrawingBufferSize(u.uRes.value)
    if (!reduced) u.uTime.value += dt
  })
  return (
    <group ref={group}>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={-1} raycast={() => null}>
        <shaderMaterial ref={mat} vertexShader={wallVertex} fragmentShader={wallFragment} uniforms={uniforms} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- globo de rede (Contato) ---------- */

/** Fortaleza e as cidades no fim dos arcos (lat, lon). */
const HOME = [-3.73, -38.52]
const CITIES = [
  [-23.55, -46.63],
  [-34.6, -58.38],
  [38.72, -9.14],
  [51.51, -0.13],
  [52.52, 13.4],
  [40.71, -74.0],
  [43.65, -79.38],
  [25.76, -80.19],
  [19.43, -99.13],
  [6.52, 3.38],
]

/** Ponto na esfera unitária: lon 0 em +x, lon −90° em +z (de frente para quem olha de +z). */
function onSphere([lat, lon], out = new THREE.Vector3()) {
  const la = THREE.MathUtils.degToRad(lat)
  const lo = THREE.MathUtils.degToRad(lon)
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo))
}

/** Arco de círculo máximo entre dois pontos da esfera, levantado no meio (mais alto quanto mais longe). */
class GreatArc extends THREE.Curve {
  constructor(a, b) {
    super()
    this.a = a
    this.b = b
    this.angle = a.angleTo(b)
    this.lift = 0.06 + this.angle * 0.16
  }
  getPoint(t, out = new THREE.Vector3()) {
    const s = Math.sin(this.angle)
    out.copy(this.a).multiplyScalar(Math.sin((1 - t) * this.angle) / s).addScaledVector(this.b, Math.sin(t * this.angle) / s)
    return out.multiplyScalar(1.005 + this.lift * Math.sin(Math.PI * t))
  }
}

/** Pontos de terra numa esfera de Fibonacci, lidos da máscara de mar do mapa especular da Terra. */
function useLandDots(count) {
  const [geometry, setGeometry] = useState(null)
  useEffect(() => {
    let live = true
    let made = null
    new THREE.ImageLoader().load('/textures/earth/earth-specular.webp', (img) => {
      if (!live) return
      const W = 360
      const H = 180
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, W, H)
      const px = ctx.getImageData(0, 0, W, H).data
      const pos = []
      const rand = []
      const golden = Math.PI * (3 - Math.sqrt(5))
      for (let i = 0; i < count; i++) {
        const y = 1 - ((i + 0.5) / count) * 2
        const r = Math.sqrt(1 - y * y)
        const x = Math.cos(i * golden) * r
        const z = Math.sin(i * golden) * r
        const lat = Math.asin(y)
        const lon = Math.atan2(-z, x)
        const u = Math.min(W - 1, Math.floor(((lon + Math.PI) / (2 * Math.PI)) * W))
        const v = Math.min(H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * H))
        // no mapa especular o mar é claro e a terra escura
        if (px[(v * W + u) * 4] > 100) continue
        pos.push(x, y, z)
        rand.push(Math.random())
      }
      made = new THREE.BufferGeometry()
      made.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
      made.setAttribute('aRand', new THREE.BufferAttribute(new Float32Array(rand), 1))
      setGeometry(made)
    })
    return () => {
      live = false
      made?.dispose()
    }
  }, [count])
  return geometry
}

const dotVertex = /* glsl */ `
  attribute float aRand;
  uniform float uPx;
  uniform float uScale;
  uniform vec3 uHome;
  varying float vB;
  varying float vHome;
  varying float vRand;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nView = normalize(mat3(modelViewMatrix) * position);
    // de frente acende, no limbo apaga
    vB = smoothstep(-0.1, 0.55, dot(nView, normalize(-mv.xyz)));
    vHome = smoothstep(0.32, 0.0, distance(position, uHome));
    vRand = aRand;
    gl_PointSize = uPx * uScale * (1.0 + vHome * 0.5) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const dotFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uA; uniform vec3 uInk;
  varying float vB;
  varying float vHome;
  varying float vRand;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.25, d);
    float twinkle = 0.75 + 0.25 * sin(uTime * (0.6 + vRand * 1.5) + vRand * 40.0);
    vec3 c = mix(uA * 0.65, uInk, vHome * 0.6 + step(0.97, vRand) * 0.5);
    gl_FragColor = vec4(c * a * vB * twinkle * (1.0 + vHome * 1.2) * uOpacity, 1.0);
  }
`
const bodyFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uSea; uniform vec3 uA;
  varying vec3 vObj;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 col = uSea + uA * rim * 0.6;
    gl_FragColor = vec4(col * uOpacity, uOpacity);
    #include <colorspace_fragment>
  }
`
const arcFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uA; uniform vec3 uB;
  varying vec2 vUv;
  varying vec2 vInfo;
  void main() {
    // pacote saindo de Fortaleza até a cidade, com rastro; uma pausa entre uma ida e a próxima
    float head = fract(uTime * (0.16 + vInfo.x * 0.12) + vInfo.x * 5.0) * 1.5 - 0.1;
    float d = head - vUv.x;
    float trail = step(0.0, d) * exp(-d * 9.0);
    vec3 c = mix(uA, uB, step(0.7, vInfo.x));
    gl_FragColor = vec4(c * (0.1 + trail * 2.4) * uOpacity, 1.0);
  }
`
const markVertex = /* glsl */ `
  attribute float aKind; // 1 = Fortaleza
  uniform float uPx;
  uniform float uScale;
  varying float vKind;
  varying float vSeed;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vKind = aKind;
    vSeed = fract(position.x * 7.1 + position.y * 3.3);
    gl_PointSize = uPx * uScale * (aKind > 0.5 ? 2.6 : 1.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const markFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uA; uniform vec3 uInk;
  varying float vKind;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(vKind > 0.5 ? 0.14 : 0.3, vKind > 0.5 ? 0.22 : 0.45, d);
    float ripple = fract(uTime * 0.5 + vSeed);
    float ring = (1.0 - smoothstep(0.0, 0.07, abs(d - ripple))) * (1.0 - ripple) * vKind;
    vec3 c = mix(uA, uInk, vKind * 0.5);
    gl_FragColor = vec4(c * (core * 1.8 + ring * 1.4) * uOpacity, 1.0);
  }
`

/**
 * Globo de rede no Contato: continentes em pontos, mar escuro com borda acesa, arcos saindo de Fortaleza
 * para o mundo com pacotes correndo e um pulso marcando Fortaleza. Gira devagar, sempre com Fortaleza à vista.
 */
function NetGlobe({ position, radius, facing, dots, active, reduced, appear }) {
  const outer = useRef()
  const inner = useRef()
  const dotMat = useRef()
  const bodyMat = useRef()
  const arcMat = useRef()
  const markMat = useRef()
  const haloMat = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const fade = useFade(active, reduced, appear)
  const land = useLandDots(dots)
  // os pontos de terra chegam depois (a máscara carrega à parte): compila de novo quando eles entram
  usePrecompile(outer, land)
  const home = useMemo(() => onSphere(HOME), [])
  const arcs = useMemo(() => tubes(CITIES.map((c) => new GreatArc(home, onSphere(c))), 64, 0.0055), [home])
  const marks = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pts = [home, ...CITIES.map((c) => onSphere(c))].flatMap((p) => p.clone().multiplyScalar(1.01).toArray())
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array([1, ...CITIES.map(() => 0)]), 1))
    return g
  }, [home])
  useEffect(
    () => () => {
      arcs.dispose()
      marks.dispose()
    },
    [arcs, marks],
  )
  // o grupo de fora encara a câmera do Contato; o de dentro põe Fortaleza um pouco à esquerda do centro
  const quaternion = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.copy(position)
    o.lookAt(facing)
    return o.quaternion.clone()
  }, [position, facing])
  const spin = THREE.MathUtils.degToRad(-90 - 14 - HOME[1])
  const dotU = useMemo(() => ({ uPx: { value: 1 }, uScale: { value: 1 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uHome: { value: home }, uA: { value: color(fs.accent) }, uInk: { value: color(COLD) } }), [home])
  const bodyU = useMemo(() => ({ uOpacity: { value: 0 }, uSea: { value: color(SEA) }, uA: { value: color(fs.accent) } }), [])
  const arcU = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uA: { value: color(fs.accent) }, uB: { value: color(fs['accent-2']) } }), [])
  const markU = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPx: { value: 1 }, uScale: { value: 1 }, uA: { value: color(fs.accent) }, uInk: { value: color(COLD) } }), [])
  const haloU = useMemo(() => ({ uColor: { value: color(fs.accent) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uRays: { value: 0 }, uSpin: { value: 0 } }), [])
  const t = useRef(0)
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt, land !== null)
    outer.current.visible = v > 0.002
    if (!reduced) t.current += dt
    inner.current.rotation.y = spin + Math.sin(t.current * 0.07) * 0.32
    if (dotMat.current) {
      const du = dotMat.current.uniforms
      du.uOpacity.value = v
      du.uPx.value = dpr
      du.uScale.value = radius * 20
      du.uTime.value = t.current
    }
    bodyMat.current.uniforms.uOpacity.value = v
    arcMat.current.uniforms.uOpacity.value = v
    arcMat.current.uniforms.uTime.value = t.current
    const mu = markMat.current.uniforms
    mu.uOpacity.value = v
    mu.uTime.value = t.current
    mu.uPx.value = dpr
    mu.uScale.value = radius * 70
    haloMat.current.uniforms.uOpacity.value = v * 0.3
  })
  return (
    <group ref={outer} position={position} quaternion={quaternion}>
      <mesh scale={radius * 2.9} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={haloMat} vertexShader={billboardVertex} fragmentShader={glowFragment} uniforms={haloU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group rotation={[0.38, 0, 0]} scale={radius}>
        <group ref={inner}>
          {/* antes dos pontos e arcos: o depth do mar esconde o que fica do outro lado */}
          <mesh scale={0.985} renderOrder={-1} raycast={() => null}>
            <sphereGeometry args={[1, 64, 48]} />
            <shaderMaterial ref={bodyMat} vertexShader={objVertex} fragmentShader={bodyFragment} uniforms={bodyU} transparent />
          </mesh>
          {land && (
            <points geometry={land} raycast={() => null}>
              <shaderMaterial ref={dotMat} vertexShader={dotVertex} fragmentShader={dotFragment} uniforms={dotU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
            </points>
          )}
          <mesh geometry={arcs} raycast={() => null}>
            <shaderMaterial ref={arcMat} vertexShader={cableVertex} fragmentShader={arcFragment} uniforms={arcU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <points geometry={marks} raycast={() => null}>
            <shaderMaterial ref={markMat} vertexShader={markVertex} fragmentShader={markFragment} uniforms={markU} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </points>
        </group>
      </group>
    </group>
  )
}

/* ---------- a viagem ---------- */

/** Zonas de texto do DOM (world.zones), relidas quando mudam; com um respiro, porque a página mede várias vezes seguidas. */
function useZones(active) {
  const [list, setList] = useState(() => world.zones.list)
  const seen = useRef(world.zones.version)
  const timer = useRef(0)
  // a troca de modo muda o texto no meio da transição: mede de novo depois dela
  useEffect(() => {
    if (!active) return
    const id = setTimeout(measureAnchors, 900)
    return () => clearTimeout(id)
  }, [active])
  useEffect(() => () => clearTimeout(timer.current), [])
  useFrame(() => {
    if (world.zones.version === seen.current) return
    seen.current = world.zones.version
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setList(world.zones.list), 250)
  })
  return list
}

/**
 * Marcos da trilha do modo Fullstack: skyline no horizonte do hero, corredor de datacenter até Trabalhos,
 * núcleo de banco de dados em Sobre e o globo no fim; paredões, chuva e painéis de código pelo caminho todo.
 * `detail` (0–1, do nível de qualidade) reduz as contagens.
 */
export function Infra({ active, reduced, narrow, detail }) {
  const { width, height } = useThree((s) => s.size)
  const fov = useThree((s) => s.camera.fov)
  const phone = narrow && width < 768
  const path = useMemo(() => buildPaths(narrow).fullstack, [narrow])
  const m = useMemo(() => {
    const aspect = width / height
    const fit = Math.min(1, aspect / 1.2)
    const at = (s, ndc, depth) => placeOnPath(path, s, ndc, depth, aspect, fov)
    return {
      aspect,
      // em telas estreitas o texto ocupa quase a largura toda: o núcleo fica ao lado do título "Sobre" e o
      // globo no vão entre os links do Contato e o rodapé, os dois menores (no tablet os links cabem numa linha,
      // então o globo vai mais para a direita; no voo até o Contato ele cruza o título, por isso acende mais tarde)
      core: narrow ? { position: at(2, [0.55, 0.62], 40), radius: 1.1 } : { position: at(2, [0.6, 0.5], 40), radius: 2.4 * Math.max(0.6, fit) },
      globe: {
        position: narrow ? at(3, [phone ? 0.35 : 0.62, -0.45], 60) : at(3, [0.5, 0.12], 60),
        radius: narrow ? 3.4 * Math.max(1, fit * 1.6) : 8 * Math.max(0.55, fit),
        facing: cameraOnPath(path, 3, aspect, fov).position.clone(),
      },
    }
  }, [path, narrow, phone, width, height, fov])
  // a janela do minigame, o núcleo e o globo também ocupam a tela nas estações deles: chuva e painéis passam longe
  const extra = useMemo(
    () => ({
      0: [heroWindowRect(width, height, fov, narrow)],
      2: [sphereRect(path, 2, m.core.position, m.core.radius * 1.5, m.core.radius * 1.8, m.aspect, fov)],
      3: [sphereRect(path, 3, m.globe.position, m.globe.radius * 1.35, m.globe.radius * 1.35, m.aspect, fov)],
    }),
    [path, m, fov, width, height, narrow],
  )
  const zones = useZones(active)
  const views = useMemo(() => (zones.length ? stationViews(path, m.aspect, fov, zones, extra) : []), [path, m.aspect, fov, zones, extra])
  const glyphs = useMemo(() => glyphAtlas(), [])
  const atlas = useMemo(() => screenAtlas(SNIPPETS, LOGS), [])
  const listing = useMemo(() => listingAtlas(SNIPPETS, LOGS), [])
  useEffect(
    () => () => {
      glyphs.dispose()
      atlas.map.dispose()
      listing.dispose()
    },
    [glyphs, atlas, listing],
  )
  const mask = useMemo(() => (zones.length ? textMask(zones.map((list, j) => [...list, ...(extra[j] ?? [])])) : null), [zones, extra])
  useEffect(() => () => mask?.dispose(), [mask])
  const k = phone ? detail * 0.65 : detail
  const walls = useMemo(() => wallItems(path, { aspect: m.aspect, fov, k }, rng(51)), [path, m.aspect, fov, k])
  const screens = useMemo(() => {
    if (!views.length) return []
    const r = rng(23)
    const out = []
    const n = (x) => Math.round(x * Math.max(0.6, k))
    // nos voos a câmera passa entre eles; entre Sobre e Contato vira um túnel
    for (const arc of [[-0.3, 0.75], [2.4, 3.45]]) flightScreens(path, { from: 0.2, to: 0.5, count: n(4), arc, radius: [5, 7.5], size: [3.6, 4.6], show: [0.1, 0.22, 0.7, 0.9] }, r, out)
    flightScreens(path, { from: 0.62, to: 0.95, count: n(5), arc: [1.1, 2.05], radius: [1.3, 2.0], size: [1.9, 2.5], show: [0.15, 0.3, 0.92, 0.99], aisle: true }, r, out)
    flightScreens(path, { from: 1.15, to: 1.6, count: n(7), arc: [1.1, 2.05], radius: [1.3, 2.0], size: [1.9, 2.5], show: [1.13, 1.25, 1.85, 1.97], aisle: true }, r, out)
    // monitores na meia altura dos racks, virados para quem vem pelo corredor: acendem quando a parada de
    // Trabalhos acaba; ficam abaixo da câmera para aparecer sob os cards que ainda sobem
    for (const arc of [[-0.8, -0.45], [Math.PI + 0.45, Math.PI + 0.8]])
      flightScreens(path, { from: 1.2, to: 1.64, count: n(6), arc, radius: [2.2, 2.5], size: [1.4, 1.8], show: [1.13, 1.26, 1.68, 1.86], aisle: true, face: 0.8 }, r, out)
    flightScreens(path, { from: 1.72, to: 1.97, count: n(8), arc: [-0.3, 2.4], radius: [4.5, 7.5], size: [4, 5.2], show: [1.6, 1.72, 1.88, 1.98] }, r, out)
    flightScreens(path, { from: 2.12, to: 2.92, count: n(36), arc: [-0.5, 2.2], radius: [4, 8], size: [4.4, 5.6], show: [2.06, 2.2, 2.82, 2.97] }, r, out)
    // parados nos vãos livres de cada estação: uma camada perto e, atrás dela, janelas menores mais ao fundo
    // (no hero só estas, entre os prédios)
    const px = Math.min(460, Math.max(240, width * 0.24))
    const show = (j) => (j === 0 ? [-1, -0.9, 0.13, 0.3] : j === 3 ? [2.93, 2.995, 9, 10] : [j - 0.08, j - 0.005, j + 0.13, j + 0.22])
    for (const [j, near, far] of [
      [0, 0, 3],
      [1, 2, 3],
      [2, 2, 3],
      [3, 3, 3],
    ]) {
      const placed = []
      const common = { aspect: m.aspect, fov, width, height, views, show: show(j), placed }
      stationScreens(path, j, { ...common, max: near, px }, r, out)
      stationScreens(path, j, { ...common, max: far, px: Math.max(150, px * 0.55), depth: [26, 36] }, r, out)
    }
    return out.map((place, i) => screenItem(place, atlas.contents[i % atlas.contents.length], r))
  }, [views, path, k, width, height, m.aspect, fov, atlas])
  const root = useRef()
  usePrecompile(root, phone)
  return (
    <group ref={root}>
      {/* no celular o horizonte cai atrás do parágrafo do hero: sem skyline; no tablet ele fica baixo e à direita */}
      {!phone && (
        <Skyline count={Math.round(150 * k)} narrow={narrow} aspect={m.aspect} fov={fov} ceiling={narrow ? 0.3 : 0.55} clear={narrow ? [0.3, 0.75] : [-0.2, 0.35]} glyphs={glyphs} active={active} reduced={reduced} leave={[0.35, 0.85]} />
      )}
      <DataCenter path={path} brightness={narrow ? 0.6 : 1} active={active} reduced={reduced} appear={[0.25, 0.6]} leave={[1.7, 2.0]} />
      <DatabaseCore {...m.core} particles={Math.round(600 * k)} active={active} reduced={reduced} appear={[1.3, 1.85]} leave={[2.2, 2.45]} />
      <NetGlobe {...m.globe} dots={Math.round(16000 * k)} active={active} reduced={reduced} appear={narrow ? [2.55, 2.95] : [2.3, 2.9]} />
      <CodeWalls items={walls} glyphs={glyphs} listing={listing} mask={mask} active={active} reduced={reduced} />
      <CodeRain path={path} count={Math.round(440 * k)} views={views} aspect={m.aspect} fov={fov} map={glyphs} active={active} reduced={reduced} />
      <Screens items={screens} atlas={atlas} active={active} reduced={reduced} />
    </group>
  )
}

