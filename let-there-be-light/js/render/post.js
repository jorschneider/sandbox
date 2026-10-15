// A small HDR post chain written against three's core (no examples/jsm):
//
//   scene -> HDR target -> bright pass -> 3 blur levels -> composite
//
// The composite does the tone mapping, so bloom is gathered in linear light
// before the curve is applied — which is the whole reason highlights bloom
// like light instead of like a white smear. Then grade, vignette, a touch of
// chromatic aberration at the edges, and FXAA.

import * as THREE from 'three';

const QUAD = new THREE.PlaneGeometry(2, 2);
const ORTHO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function pass(fragmentShader, uniforms) {
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(QUAD, mat);
  mesh.frustumCulled = false;
  const s = new THREE.Scene();
  s.add(mesh);
  return { scene: s, mat, uniforms };
}

const BRIGHT = `
  uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = max(c.r, max(c.g, c.b));
    // soft knee so the bloom eases in instead of clipping on
    float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-5);
    float w = max(soft, l - uThreshold) / max(l, 1e-5);
    gl_FragColor = vec4(c * w, 1.0);
  }`;

const BLUR = `
  uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
  void main(){
    // 9-tap gaussian, linear-sampled
    vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
    s += texture2D(tDiffuse, vUv + uDir * 1.3846).rgb * 0.316216;
    s += texture2D(tDiffuse, vUv - uDir * 1.3846).rgb * 0.316216;
    s += texture2D(tDiffuse, vUv + uDir * 3.2308).rgb * 0.070270;
    s += texture2D(tDiffuse, vUv - uDir * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(s, 1.0);
  }`;

const COMPOSITE = `
  uniform sampler2D tDiffuse, tBloom0, tBloom1, tBloom2;
  uniform float uBloom, uExposure, uVignette, uAberration, uSaturation, uContrast;
  uniform vec3 uLift, uGain;
  uniform float uToneMap;
  varying vec2 vUv;

  // Full ACES fit, with the input/output colour matrices. The cheap
  // Narkowicz approximation drains saturation badly — which reads as haze
  // over the whole frame no matter how the scene is lit.
  const mat3 ACES_IN = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777);
  const mat3 ACES_OUT = mat3(
     1.60475, -0.10208, -0.00327,
    -0.53108,  1.10813, -0.07276,
    -0.07367, -0.00605,  1.07602);
  vec3 rrt(vec3 v){
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 aces(vec3 x){
    return clamp(ACES_OUT * rrt(ACES_IN * x), 0.0, 1.0);
  }
  vec3 toSRGB(vec3 c){
    return mix(c * 12.92, 1.055 * pow(max(c, 1e-5), vec3(0.41666)) - 0.055,
               step(0.0031308, c));
  }

  void main(){
    vec2 d = vUv - 0.5;
    float r2 = dot(d, d);
    // chromatic aberration grows toward the corners only
    float ab = uAberration * r2;
    vec3 col;
    col.r = texture2D(tDiffuse, vUv - d * ab).r;
    col.g = texture2D(tDiffuse, vUv).g;
    col.b = texture2D(tDiffuse, vUv + d * ab).b;

    vec3 bloom = texture2D(tBloom0, vUv).rgb * 0.5
               + texture2D(tBloom1, vUv).rgb * 0.32
               + texture2D(tBloom2, vUv).rgb * 0.18;
    col += bloom * uBloom;

    col *= uExposure;
    col = mix(col, aces(col), uToneMap);

    // grade: lift shadows, tint highlights, then saturation and contrast
    col = col + uLift * (1.0 - col);
    col = col * uGain;
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, uSaturation);
    col = (col - 0.5) * uContrast + 0.5;

    col *= 1.0 - uVignette * smoothstep(0.15, 0.85, r2);
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(toSRGB(col), 1.0);
  }`;

const FXAA = `
  uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
  float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main(){
    vec3 rgbM = texture2D(tDiffuse, vUv).rgb;
    float lNW = lum(texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uTexel).rgb);
    float lNE = lum(texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * uTexel).rgb);
    float lSW = lum(texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * uTexel).rgb);
    float lSE = lum(texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * uTexel).rgb);
    float lM = lum(rgbM);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcp, -8.0, 8.0) * uTexel;
    vec3 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb
                  + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv + dir * -0.5).rgb
                             + texture2D(tDiffuse, vUv + dir * 0.5).rgb);
    float lB = lum(b);
    gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
  }`;

export function createPost(renderer) {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const dpr = renderer.getPixelRatio();
  const opts = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    colorSpace: THREE.NoColorSpace, depthBuffer: true, stencilBuffer: false,
  };
  const ldrOpts = { ...opts, type: THREE.UnsignedByteType, depthBuffer: false };

  const rtScene = new THREE.WebGLRenderTarget(1, 1, opts);
  const bloomA = [], bloomB = [];
  for (let i = 0; i < 3; i++) {
    bloomA.push(new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: false }));
    bloomB.push(new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: false }));
  }
  const rtComposite = new THREE.WebGLRenderTarget(1, 1, ldrOpts);

  const brightPass = pass(BRIGHT, {
    tDiffuse: { value: null }, uThreshold: { value: 0.85 }, uKnee: { value: 0.4 },
  });
  const blurPass = pass(BLUR, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } });
  const compositePass = pass(COMPOSITE, {
    tDiffuse: { value: null },
    tBloom0: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
    uBloom: { value: 0.55 }, uExposure: { value: 1.0 }, uVignette: { value: 0.34 },
    uAberration: { value: 0.0016 }, uSaturation: { value: 1.04 }, uContrast: { value: 1.03 },
    uLift: { value: new THREE.Color(0.012, 0.015, 0.03) },
    uGain: { value: new THREE.Color(1.02, 1.0, 0.97) },
    uToneMap: { value: 1 },
  });
  const fxaaPass = pass(FXAA, {
    tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() },
  });

  function setSize(w, h, pixelRatio) {
    const W = Math.max(2, Math.floor(w * pixelRatio));
    const H = Math.max(2, Math.floor(h * pixelRatio));
    rtScene.setSize(W, H);
    rtComposite.setSize(W, H);
    for (let i = 0; i < 3; i++) {
      const d = Math.pow(2, i + 1);
      const bw = Math.max(2, Math.floor(W / d)), bh = Math.max(2, Math.floor(H / d));
      bloomA[i].setSize(bw, bh);
      bloomB[i].setSize(bw, bh);
    }
    fxaaPass.uniforms.uTexel.value.set(1 / W, 1 / H);
  }
  setSize(size.x, size.y, dpr);

  function draw(target, p) {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(p.scene, ORTHO);
  }

  return {
    setSize,
    get grade() { return compositePass.uniforms; },
    setExposure(v) { compositePass.uniforms.uExposure.value = v; },
    // per-style look: bloom strength, grade tints, vignette, aberration…
    configure(cfg = {}) {
      const u = compositePass.uniforms;
      if (cfg.bloom !== undefined) u.uBloom.value = cfg.bloom;
      if (cfg.threshold !== undefined) brightPass.uniforms.uThreshold.value = cfg.threshold;
      if (cfg.exposure !== undefined) u.uExposure.value = cfg.exposure;
      if (cfg.vignette !== undefined) u.uVignette.value = cfg.vignette;
      if (cfg.aberration !== undefined) u.uAberration.value = cfg.aberration;
      if (cfg.saturation !== undefined) u.uSaturation.value = cfg.saturation;
      if (cfg.contrast !== undefined) u.uContrast.value = cfg.contrast;
      if (cfg.lift) u.uLift.value.set(...cfg.lift);
      if (cfg.gain) u.uGain.value.set(...cfg.gain);
      if (cfg.toneMap !== undefined) u.uToneMap.value = cfg.toneMap;
    },
    render(scene, camera) {
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, camera);

      brightPass.uniforms.tDiffuse.value = rtScene.texture;
      draw(bloomA[0], brightPass);
      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          brightPass.uniforms.tDiffuse.value = bloomA[i - 1].texture;
          draw(bloomA[i], brightPass);
        }
        const w = bloomA[i].width, h = bloomA[i].height;
        blurPass.uniforms.tDiffuse.value = bloomA[i].texture;
        blurPass.uniforms.uDir.value.set(1 / w, 0);
        draw(bloomB[i], blurPass);
        blurPass.uniforms.tDiffuse.value = bloomB[i].texture;
        blurPass.uniforms.uDir.value.set(0, 1 / h);
        draw(bloomA[i], blurPass);
      }

      const cu = compositePass.uniforms;
      cu.tDiffuse.value = rtScene.texture;
      cu.tBloom0.value = bloomA[0].texture;
      cu.tBloom1.value = bloomA[1].texture;
      cu.tBloom2.value = bloomA[2].texture;
      draw(rtComposite, compositePass);

      fxaaPass.uniforms.tDiffuse.value = rtComposite.texture;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(fxaaPass.scene, ORTHO);
    },
  };
}
