<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Material, Mesh } from "three";

const host = ref<HTMLDivElement | null>(null);
let disposeScene: (() => void) | undefined;
let cancelled = false;

onMounted(async () => {
  const container = host.value;
  if (!container) return;

  const THREE = await import("three");
  if (cancelled) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const device = navigator as Navigator & { deviceMemory?: number };
  const lowPower = Boolean(
    mobile || connection?.saveData || (device.deviceMemory && device.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4,
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xeef2f8, 0.073);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 0.08, 6.45);

  const core = new THREE.Group();
  scene.add(core);

  const bodyGeometry = new THREE.IcosahedronGeometry(1.34, lowPower ? 2 : 3);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8ea8ef,
    metalness: 0.28,
    roughness: 0.18,
    transmission: lowPower ? 0.18 : 0.48,
    thickness: 1.25,
    transparent: true,
    opacity: 0.9,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    iridescence: lowPower ? 0.2 : 0.56,
    iridescenceIOR: 1.3,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(0.92, 1.08, 0.92);
  core.add(body);

  const edgeGeometry = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.38, 2), 18);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4866ae, transparent: true, opacity: 0.16 });
  core.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x6e88d6, transparent: true, opacity: 0.26 });
  const rings: Mesh[] = [];
  [2.02, 2.38, 2.72].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.007, 6, lowPower ? 64 : 96),
      ringMaterial.clone(),
    );
    ring.rotation.set(Math.PI * (0.18 + index * 0.16), Math.PI * (0.1 + index * 0.22), Math.PI * index * 0.17);
    rings.push(ring);
    core.add(ring);
  });

  const particleCount = lowPower ? 320 : 720;
  const positions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = 3.15 + ((index * 37) % 100) / 39;
    const theta = index * 2.399963;
    const y = (((index * 53) % 200) / 100 - 1) * 3.35;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0x718bd8, size: lowPower ? 0.011 : 0.013, transparent: true, opacity: 0.4 });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c5dc, 2.25));
  const key = new THREE.PointLight(0xbdd0ff, 48, 16, 1.5);
  key.position.set(3.8, 3.2, 4.4);
  scene.add(key);
  const rim = new THREE.PointLight(0xd7c3ff, 36, 16, 1.4);
  rim.position.set(-4.2, -1.8, 1.2);
  scene.add(rim);

  let pointerX = 0;
  let pointerY = 0;
  let scrollTarget = 0;
  let scrollValue = 0;
  let frame = 0;
  let running = false;
  let inView = true;
  const clock = new THREE.Clock();

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const onPointer = (event: PointerEvent) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.46;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.3;
  };
  const onScroll = () => {
    scrollTarget = Math.min(window.scrollY / Math.max(window.innerHeight * 2.8, 1), 1);
  };
  const draw = (animated: boolean) => {
    const time = clock.getElapsedTime();
    scrollValue += (scrollTarget - scrollValue) * 0.06;
    core.rotation.x += (pointerY + scrollValue * 1.1 - core.rotation.x) * 0.045;
    core.rotation.y += (pointerX + scrollValue * Math.PI * 1.2 - core.rotation.y) * 0.04;
    core.rotation.z = (animated ? Math.sin(time * 0.2) * 0.06 : 0.03) + scrollValue * 0.15;
    core.scale.setScalar(1 + (animated ? Math.sin(time * 0.62) * 0.012 : 0) + scrollValue * 0.1);
    rings.forEach((ring, index) => {
      if (animated) ring.rotation.z += (0.00055 + index * 0.0003) * (index % 2 ? -1 : 1);
    });
    particles.rotation.y = (animated ? time * 0.008 : 0) - scrollValue * 0.36;
    particles.rotation.x = scrollValue * 0.14;
    camera.position.z = 6.45 - scrollValue * 0.58;
    renderer.render(scene, camera);
  };
  const loop = () => {
    draw(true);
    if (inView && !document.hidden && !cancelled) {
      frame = requestAnimationFrame(loop);
    } else {
      running = false;
    }
  };
  const start = () => {
    if (reducedMotion) {
      draw(false);
      return;
    }
    if (!running && inView && !document.hidden) {
      running = true;
      frame = requestAnimationFrame(loop);
    }
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    running = false;
  };
  const onVisibility = () => document.hidden ? pause() : start();

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!running) draw(false);
  });
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    inView ? start() : pause();
  }, { rootMargin: "120px" });

  resize();
  onScroll();
  draw(false);
  start();
  resizeObserver.observe(container);
  visibilityObserver.observe(container);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("scroll", onScroll, { passive: true });
  if (!lowPower && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", onPointer, { passive: true });
  }

  disposeScene = () => {
    pause();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
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
    ringMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
});

onBeforeUnmount(() => {
  cancelled = true;
  disposeScene?.();
});
</script>

<template>
  <div ref="host" class="three-host" aria-hidden="true"></div>
</template>
