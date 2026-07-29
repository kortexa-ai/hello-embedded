import * as THREE from "three";

const stats = document.querySelector<HTMLSpanElement>("#stats");
const tuner = document.querySelector<HTMLSpanElement>("#tuner");

const STARTING_INSTANCES = 32;
const MAX_INSTANCES = 8192;
const SEARCH_RESOLUTION = 1;
const TARGET_FPS = 58.8;
const MAX_P95_FRAME_MS = 20.5;
const WARMUP_MS = 650;
const SEARCH_SAMPLE_MS = 1800;
const VERIFY_SAMPLE_MS = 6000;

type TestKind = "search" | "verify";
type TestStage = "warmup" | "measure" | "settled";

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040716);
  scene.fog = new THREE.FogExp2(0x040716, 0.038);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0.35, 12);
  camera.lookAt(0, 0.15, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8ecbff, 0x18030c, 2.1));

  const keyLight = new THREE.DirectionalLight(0xff9b45, 4.8);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const blueLight = new THREE.PointLight(0x2d7dff, 28, 16);
  blueLight.position.set(-4.5, 1.8, 3);
  scene.add(blueLight);

  const pinkLight = new THREE.PointLight(0xff267e, 22, 14);
  pinkLight.position.set(5, -1.4, -1);
  scene.add(pinkLight);

  const world = new THREE.Group();
  scene.add(world);

  const hero = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.05, 0.28, 96, 14, 2, 3),
    new THREE.MeshPhongMaterial({
      color: 0xff681f,
      emissive: 0x250500,
      specular: 0xffd5b5,
      shininess: 86,
    }),
  );
  world.add(hero);

  const knotGeometry = new THREE.TorusKnotGeometry(
    0.24,
    0.075,
    24,
    6,
    2,
    3,
  );
  const knotMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x08030c,
    specular: 0xffffff,
    shininess: 72,
    vertexColors: true,
    flatShading: true,
  });
  const swarm = new THREE.InstancedMesh(
    knotGeometry,
    knotMaterial,
    MAX_INSTANCES,
  );
  swarm.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  swarm.frustumCulled = false;
  world.add(swarm);

  // Deterministic confetti: each candidate count is directly comparable, and
  // every prefix remains spread across the whole viewport.
  let randomState = 0x5eedc0de;
  const random = () => {
    randomState |= 0;
    randomState = (randomState + 0x6d2b79f5) | 0;
    let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < MAX_INSTANCES; index += 1) {
    transform.position.set(
      (random() - 0.5) * 15,
      (random() - 0.5) * 4.4,
      (random() - 0.5) * 6 + 0.5,
    );
    transform.rotation.set(
      random() * Math.PI,
      random() * Math.PI,
      random() * Math.PI,
    );
    const scale = 0.55 + random() * 0.75;
    transform.scale.setScalar(scale);
    transform.updateMatrix();
    swarm.setMatrixAt(index, transform.matrix);

    color.setHSL(0.02 + random() * 0.62, 0.94, 0.64);
    swarm.setColorAt(index, color);
  }
  swarm.instanceMatrix.needsUpdate = true;
  if (swarm.instanceColor) {
    swarm.instanceColor.needsUpdate = true;
  }

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(1400 * 3);
  for (let index = 0; index < starPositions.length; index += 3) {
    starPositions[index] = (random() - 0.5) * 30;
    starPositions[index + 1] = (random() - 0.5) * 12;
    starPositions[index + 2] = -4 - random() * 16;
  }
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0x9dc9ff,
        size: 0.048,
        transparent: true,
        opacity: 0.82,
        sizeAttenuation: true,
      }),
    ),
  );

  const trianglesPerKnot = knotGeometry.index
    ? knotGeometry.index.count / 3
    : knotGeometry.attributes.position.count / 3;

  let candidate = STARTING_INSTANCES;
  let bestPassing = 0;
  let firstFailing = MAX_INSTANCES + SEARCH_RESOLUTION;
  let testKind: TestKind = "search";
  let testStage: TestStage = "warmup";
  let stageStartedAt = performance.now();
  let previousFrameAt = stageStartedAt;
  let measuredFrameTimes: number[] = [];
  let settledMessage = "";

  let displayFrames = 0;
  let displayStartedAt = stageStartedAt;
  let displayedFps = 0;

  const triangleCount = () =>
    Math.round(hero.geometry.index!.count / 3 + candidate * trianglesPerKnot);

  const describeTest = () => {
    if (testStage === "settled") {
      return settledMessage;
    }
    const action = testKind === "verify" ? "verifying" : "searching";
    return `${action} · ${candidate.toLocaleString()} knots · ${testStage}`;
  };

  const beginTest = (count: number, kind: TestKind) => {
    candidate = Math.max(1, Math.min(MAX_INSTANCES, Math.round(count)));
    swarm.count = candidate;
    testKind = kind;
    testStage = "warmup";
    stageStartedAt = performance.now();
    measuredFrameTimes = [];
    if (tuner) {
      tuner.textContent = describeTest();
    }
  };

  const beginVerification = () => {
    beginTest(Math.max(bestPassing, 1), "verify");
  };

  const nextBinaryCandidate = () => {
    const gap = firstFailing - bestPassing;
    if (gap <= SEARCH_RESOLUTION) {
      beginVerification();
      return;
    }

    let next = Math.floor((bestPassing + firstFailing) / 2);
    next = Math.floor(next / SEARCH_RESOLUTION) * SEARCH_RESOLUTION;
    if (next <= bestPassing) {
      beginVerification();
      return;
    }
    beginTest(next, "search");
  };

  const finishSample = () => {
    const sorted = [...measuredFrameTimes].sort((a, b) => a - b);
    const totalMs = measuredFrameTimes.reduce((sum, value) => sum + value, 0);
    const fps =
      totalMs > 0 ? (measuredFrameTimes.length * 1000) / totalMs : 0;
    const p95Index = Math.min(
      sorted.length - 1,
      Math.floor(sorted.length * 0.95),
    );
    const p95 = sorted[Math.max(0, p95Index)] ?? Number.POSITIVE_INFINITY;
    const passed = fps >= TARGET_FPS && p95 <= MAX_P95_FRAME_MS;

    console.log(
      `[three-stress] ${testKind} count=${candidate} ` +
        `triangles=${triangleCount()} fps=${fps.toFixed(2)} ` +
        `p95=${p95.toFixed(2)}ms result=${passed ? "PASS" : "FAIL"}`,
    );

    if (testKind === "verify") {
      if (passed || candidate === 1) {
        testStage = "settled";
        settledMessage =
          `locked · ${candidate.toLocaleString()} knots · p95 ${p95.toFixed(1)} ms`;
        console.log(
          `[three-stress] SETTLED count=${candidate} ` +
            `triangles=${triangleCount()} fps=${fps.toFixed(2)} ` +
            `p95=${p95.toFixed(2)}ms`,
        );
        return;
      }

      // A longer verification window exposed instability. Leave some thermal
      // headroom instead of balancing the Pi on the lip of Mount Doom.
      const backedOff = Math.max(
        1,
        Math.floor((candidate * 0.875) / SEARCH_RESOLUTION) *
          SEARCH_RESOLUTION,
      );
      bestPassing = backedOff;
      beginTest(backedOff, "verify");
      return;
    }

    if (passed) {
      bestPassing = Math.max(bestPassing, candidate);
      if (candidate >= MAX_INSTANCES) {
        beginVerification();
      } else if (firstFailing <= MAX_INSTANCES) {
        nextBinaryCandidate();
      } else {
        beginTest(Math.min(MAX_INSTANCES, candidate * 2), "search");
      }
      return;
    }

    firstFailing = Math.min(firstFailing, candidate);
    if (bestPassing > 0) {
      nextBinaryCandidate();
    } else if (candidate > 1) {
      beginTest(Math.max(1, Math.floor(candidate / 2)), "search");
    } else {
      bestPassing = 1;
      beginVerification();
    }
  };

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render(now: number) {
    const elapsed = now / 1000;
    const frameTime = now - previousFrameAt;
    previousFrameAt = now;

    hero.rotation.x = elapsed * 0.23;
    hero.rotation.y = elapsed * 0.41;
    hero.position.y = Math.sin(elapsed * 0.9) * 0.12;
    swarm.rotation.y = elapsed * 0.045;
    swarm.rotation.x = Math.sin(elapsed * 0.12) * 0.08;
    blueLight.position.x = Math.sin(elapsed * 0.7) * 5;
    pinkLight.position.y = Math.cos(elapsed * 0.55) * 2.2;

    renderer.render(scene, camera);

    displayFrames += 1;
    const displayDuration = now - displayStartedAt;
    if (displayDuration >= 500) {
      displayedFps = (displayFrames * 1000) / displayDuration;
      if (stats) {
        stats.textContent =
          `${displayedFps.toFixed(1)} fps · ` +
          `${renderer.info.render.triangles.toLocaleString()} triangles · ` +
          `${renderer.info.render.calls} draws`;
      }
      if (tuner) {
        tuner.textContent = describeTest();
      }
      displayFrames = 0;
      displayStartedAt = now;
    }

    if (testStage === "warmup" && now - stageStartedAt >= WARMUP_MS) {
      testStage = "measure";
      stageStartedAt = now;
      measuredFrameTimes = [];
    } else if (testStage === "measure") {
      measuredFrameTimes.push(frameTime);
      const sampleMs =
        testKind === "verify" ? VERIFY_SAMPLE_MS : SEARCH_SAMPLE_MS;
      if (now - stageStartedAt >= sampleMs) {
        finishSample();
      }
    }

    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  resize();
  beginTest(STARTING_INSTANCES, "search");

  const gl = renderer.getContext();
  console.log("[three] renderer:", gl.getParameter(gl.RENDERER));
  console.log("[three] version:", THREE.REVISION);
  console.log(
    `[three-stress] starting max=${MAX_INSTANCES} ` +
      `trianglesPerKnot=${trianglesPerKnot}`,
  );
  requestAnimationFrame(render);
} catch (error) {
  console.error("[three] failed to start:", error);
  const message = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = `<div class="error">Three.js could not start:<br>${message}</div>`;
}
