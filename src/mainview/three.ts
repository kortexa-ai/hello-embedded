import * as THREE from "three";

const stats = document.querySelector<HTMLSpanElement>("#stats");

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040812);
  scene.fog = new THREE.Fog(0x040812, 7, 15);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(3.6, 2.25, 5.2);
  camera.lookAt(0, 0.35, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xb9ddff, 0x221006, 2.3));

  const keyLight = new THREE.DirectionalLight(0xffb35c, 5);
  keyLight.position.set(4, 5, 3);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x3f8cff, 16, 10);
  rimLight.position.set(-3, 1.5, -2);
  scene.add(rimLight);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.15, 0.34, 144, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff6a1a,
      metalness: 0.38,
      roughness: 0.24,
    }),
  );
  knot.position.y = 0.65;
  scene.add(knot);

  const floor = new THREE.GridHelper(18, 36, 0x2968aa, 0x18324f);
  floor.position.y = -1.05;
  scene.add(floor);

  const clock = new THREE.Clock();
  let frames = 0;
  let sampleStartedAt = performance.now();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render() {
    const elapsed = clock.getElapsedTime();
    knot.rotation.x = elapsed * 0.28;
    knot.rotation.y = elapsed * 0.52;
    knot.position.y = 0.65 + Math.sin(elapsed * 1.4) * 0.08;

    renderer.render(scene, camera);
    frames += 1;

    const now = performance.now();
    const sampleDuration = now - sampleStartedAt;
    if (sampleDuration >= 1000) {
      const fps = (frames * 1000) / sampleDuration;
      if (stats) {
        stats.textContent =
          `${fps.toFixed(0)} fps · ${renderer.info.render.triangles.toLocaleString()} triangles`;
      }
      frames = 0;
      sampleStartedAt = now;
    }

    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  resize();

  const gl = renderer.getContext();
  console.log("[three] renderer:", gl.getParameter(gl.RENDERER));
  console.log("[three] version:", THREE.REVISION);
  requestAnimationFrame(render);
} catch (error) {
  console.error("[three] failed to start:", error);
  const message = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = `<div class="error">Three.js could not start:<br>${message}</div>`;
}
