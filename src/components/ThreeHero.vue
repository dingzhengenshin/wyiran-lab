<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Material, Mesh } from "three";

const host = ref<HTMLDivElement | null>(null);
let disposeScene: (() => void) | undefined;

onMounted(async () => {
  const container = host.value;
  if (!container) return;
  const THREE = await import("three");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050507, 0.085);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.1, 6.4);

  const core = new THREE.Group();
  scene.add(core);

  const bodyGeometry = new THREE.IcosahedronGeometry(1.34, 5);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8c8ff,
    metalness: 0.46,
    roughness: 0.12,
    transmission: 0.68,
    thickness: 1.8,
    transparent: true,
    opacity: 0.94,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.85,
    iridescenceIOR: 1.4,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(0.92, 1.08, 0.92);
  core.add(body);

  const edgeGeometry = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.38, 2), 18);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xe7ecff, transparent: true, opacity: 0.17 });
  core.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x9dafff, transparent: true, opacity: 0.28 });
  const rings: Mesh[] = [];
  [2.02, 2.38, 2.72].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.007, 10, 180), ringMaterial.clone());
    ring.rotation.set(Math.PI * (0.18 + index * 0.16), Math.PI * (0.1 + index * 0.22), Math.PI * index * 0.17);
    rings.push(ring);
    core.add(ring);
  });

  const particleCount = window.innerWidth < 720 ? 560 : 1100;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 3.2 + ((i * 37) % 100) / 38;
    const theta = i * 2.399963;
    const y = (((i * 53) % 200) / 100 - 1) * 3.4;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0xc7d2ff, size: 0.012, transparent: true, opacity: 0.58 });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  scene.add(new THREE.HemisphereLight(0xdce6ff, 0x12101c, 1.75));
  const key = new THREE.PointLight(0xaac4ff, 62, 18, 1.5);
  key.position.set(3.8, 3.2, 4.4);
  scene.add(key);
  const rim = new THREE.PointLight(0xa76dff, 48, 18, 1.4);
  rim.position.set(-4.2, -1.8, 1.2);
  scene.add(rim);

  let pointerX = 0;
  let pointerY = 0;
  let scrollTarget = 0;
  let scrollValue = 0;
  let frame = 0;

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const onPointer = (event: PointerEvent) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.55;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.35;
  };
  const onScroll = () => {
    scrollTarget = Math.min(window.scrollY / Math.max(window.innerHeight * 3.2, 1), 1);
  };

  const clock = new THREE.Clock();
  const render = () => {
    const time = clock.getElapsedTime();
    scrollValue += (scrollTarget - scrollValue) * 0.055;
    core.rotation.x += (pointerY + scrollValue * 1.25 - core.rotation.x) * 0.045;
    core.rotation.y += (pointerX + scrollValue * Math.PI * 1.35 - core.rotation.y) * 0.04;
    core.rotation.z = Math.sin(time * 0.24) * 0.08 + scrollValue * 0.18;
    core.scale.setScalar(1 + Math.sin(time * 0.7) * 0.018 + scrollValue * 0.14);
    rings.forEach((ring, index) => {
      ring.rotation.z += (0.0008 + index * 0.00045) * (index % 2 ? -1 : 1);
    });
    particles.rotation.y = time * 0.012 - scrollValue * 0.42;
    particles.rotation.x = scrollValue * 0.16;
    camera.position.z = 6.4 - scrollValue * 0.72;
    renderer.render(scene, camera);
    if (!reducedMotion) frame = requestAnimationFrame(render);
  };

  resize();
  onScroll();
  render();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  disposeScene = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    bodyGeometry.dispose();
    bodyMaterial.dispose();
    edgeGeometry.dispose();
    edgeMaterial.dispose();
    rings.forEach((ring) => {
      ring.geometry.dispose();
      (ring.material as Material).dispose();
    });
    particleGeometry.dispose();
    particleMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
});

onBeforeUnmount(() => disposeScene?.());
</script>

<template>
  <div ref="host" class="three-host" aria-hidden="true"></div>
</template>
