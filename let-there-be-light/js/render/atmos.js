// Aerial perspective.
//
// Three's built-in fog is a flat lerp toward one colour. Real distance does
// three things at once: it drains contrast, it shifts colour toward the sky,
// and it glows warm when you look toward the sun. This replaces the fog
// shader chunks globally so every lit material in the scene gets all three,
// driven by one set of shared uniforms.

import * as THREE from 'three';

export const uniforms = {
  uFogColor: { value: new THREE.Color('#cfd9e6') },
  uSunFogColor: { value: new THREE.Color('#ffd9a8') },
  uSunDir: { value: new THREE.Vector3(0.45, 0.62, -0.64).normalize() },
  uFogDensity: { value: 0.0042 },
  uFogHeight: { value: 26 },      // fog thins above this height
  uFogFalloff: { value: 0.021 },
  uDesat: { value: 0.55 },        // how much distance drains colour
  uCamPos: { value: new THREE.Vector3() },
  uAtmos: { value: 1 },           // global on/off (0 = plain, for flat styles)
};

let patched = false;

function patch() {
  if (patched) return;
  patched = true;

  THREE.ShaderChunk.fog_pars_vertex = `
    #ifdef USE_FOG
      varying float vFogDepth;
      varying vec3 vFogWorld;
    #endif`;

  // World position is derived from mvPosition rather than `transformed`,
  // because sprites and other special-cased shaders never declare it. The
  // view matrix is rigid, so its inverse rotation is its transpose.
  THREE.ShaderChunk.fog_vertex = `
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      {
        mat3 fogR = mat3(viewMatrix);
        vec3 fogP = mvPosition.xyz;
        vFogWorld = cameraPosition
          + vec3(dot(fogR[0], fogP), dot(fogR[1], fogP), dot(fogR[2], fogP));
      }
    #endif`;

  THREE.ShaderChunk.fog_pars_fragment = `
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying vec3 vFogWorld;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
      uniform vec3 uFogColor;
      uniform vec3 uSunFogColor;
      uniform vec3 uSunDir;
      uniform vec3 uCamPos;
      uniform float uFogDensity;
      uniform float uFogHeight;
      uniform float uFogFalloff;
      uniform float uDesat;
      uniform float uAtmos;
    #endif`;

  THREE.ShaderChunk.fog_fragment = `
    #ifdef USE_FOG
      {
        vec3 toFrag = vFogWorld - uCamPos;
        float rawDist = length(toFrag);
        vec3 viewDir = toFrag / max(rawDist, 1e-4);
        // the near field stays crisp; haze only accumulates past arm's reach
        float dist = max(rawDist - 45.0, 0.0);

        // fog lies low: thick in the valleys, thin over the peaks
        float hCam = max(uCamPos.y - uFogHeight, 0.0);
        float hFrag = max(vFogWorld.y - uFogHeight, 0.0);
        float dh = hFrag - hCam;
        float dens;
        if (abs(dh) < 0.001) {
          dens = uFogDensity * exp(-hCam * uFogFalloff) * dist;
        } else {
          // analytic integral of exponential height fog along the view ray
          dens = uFogDensity * dist / (dh * uFogFalloff)
               * (exp(-hCam * uFogFalloff) - exp(-hFrag * uFogFalloff));
        }
        float f = clamp(1.0 - exp(-max(dens, 0.0)), 0.0, 1.0) * uAtmos;

        // looking toward the sun, the haze catches fire
        float sunAmt = max(dot(viewDir, uSunDir), 0.0);
        vec3 haze = mix(uFogColor, uSunFogColor, pow(sunAmt, 5.0) * 0.85);

        // distance drains saturation before it drains value
        float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(lum),
          clamp(f * uDesat, 0.0, 1.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, haze, f);
      }
    #endif`;
}

const seen = new WeakSet();

export function register(material) {
  if (!material || seen.has(material) || material.fog === false) return;
  seen.add(material);
  patch();
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    for (const k of Object.keys(uniforms)) shader.uniforms[k] = uniforms[k];
  };
  material.needsUpdate = true;
}

// Register everything already in a scene (call once after building it).
export function registerScene(scene) {
  patch();
  scene.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(register);
    else register(m);
  });
}

export function update(camPos, cfg = {}) {
  uniforms.uCamPos.value.copy(camPos);
  if (cfg.fogColor) uniforms.uFogColor.value.copy(cfg.fogColor);
  if (cfg.sunFogColor) uniforms.uSunFogColor.value.copy(cfg.sunFogColor);
  if (cfg.sunDir) uniforms.uSunDir.value.copy(cfg.sunDir);
  if (cfg.density !== undefined) uniforms.uFogDensity.value = cfg.density;
  if (cfg.height !== undefined) uniforms.uFogHeight.value = cfg.height;
  if (cfg.falloff !== undefined) uniforms.uFogFalloff.value = cfg.falloff;
  if (cfg.desat !== undefined) uniforms.uDesat.value = cfg.desat;
  if (cfg.amount !== undefined) uniforms.uAtmos.value = cfg.amount;
}
