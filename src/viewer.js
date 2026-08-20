/**
 * Naiwa 3D Gaussian Splatting — ambient background viewer.
 *
 * Layered compositing:
 *   Scenes 0–1 — split cloud reconstruction (full-bleed background)
 *   Scene 2    — masked frog + bench + soft foreground cloud (one subject)
 *
 * The cloud scene keeps its dense SHARP reconstruction. The subject PLY is
 * masked offline so the flat blue source backdrop never enters the sort. The
 * close cloud is reconstructed with the frog and bench so their occlusion and
 * depth stay coherent instead of relying on a cropped background patch.
 *
 * This is intentionally NOT an interactive 3D model viewer.  It is a
 * full-bleed cinematic background with:
 *
 *   1. "cover"-style camera framing so splats fill every edge of the viewport.
 *   2. Layer-revealing mouse parallax with a small depth push and a dead zone.
 *   3. A near-imperceptible sinusoidal breathing drift.
 *   4. No zoom, no drag, no touch rotation — the scene is a backdrop.
 *
 * Coordinate convention:
 *   SHARP outputs OpenCV coords (x right, y down, z forward).
 *   Three.js is Y-up, camera looks down -z.
 *   A 180° rotation about X maps one to the other: quaternion [1,0,0,0] (xyzw).
 */

import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

// ── Platform detection ────────────────────────────────

const isMobile =
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  navigator.userAgentData?.mobile === true;

const isLowPower =
  (navigator.hardwareConcurrency ?? 8) <= 4 ||
  (navigator.deviceMemory ?? 8) <= 4;

function pickPixelRatio() {
  if (isLowPower) return 1;
  return Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
}

// ── Tunables ──────────────────────────────────────────

/** 180° about X — maps OpenCV → Three.js. */
const SCENE_ROTATION = [1, 0, 0, 0];

/** Extra crop keeps the stronger camera move from exposing reconstruction edges. */
const OVERSCAN = 1.12;

/** Mouse parallax limits (radians). */
const YAW_LIMIT = THREE.MathUtils.degToRad(isMobile ? 1.25 : 2.25);
const PITCH_LIMIT = THREE.MathUtils.degToRad(isMobile ? 0.72 : 1.18);

/** Tiny forward move at the edge of the viewport adds depth without feeling like zoom. */
const DOLLY_LIMIT = isMobile ? 0.025 : 0.065;

/** Parallax smoothing: higher = snappier, lower = floatier. */
const PARALLAX_LERP = 0.032;

/** Cursor position dead-zone fraction around screen centre. */
const DEAD_ZONE = 0.12;

/** Breathing drift amplitude (radians) and period (seconds). */
const BREATH_YAW = THREE.MathUtils.degToRad(0.12);
const BREATH_PITCH = THREE.MathUtils.degToRad(0.08);
const BREATH_PERIOD_Y = 28;
const BREATH_PERIOD_X = 37;

/** A slow background only needs 24–30 camera/sort updates per second. */
const CAMERA_UPDATE_INTERVAL = 1000 / (isLowPower ? 24 : 30);

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── Viewer ────────────────────────────────────────────

export class NaiwaViewer {
  constructor(container) {
    this.container = container;
    this.viewer = null;
    this.camera = null;
    this.renderer = null;
    this.splatMesh = null;

    // SHARP reconstructs in the input camera coordinate system. Keep the
    // camera at that exact origin so separately generated scenes still align.
    this._basePosition = new THREE.Vector3(0, 0, 0);
    // Orbit around the cloud mid-depth, not the foreground subject. This keeps
    // the distant environment stable while the nearby frog and board travel
    // farther across the image — genuine depth parallax, not a 2D layer shift.
    this._baseTarget = new THREE.Vector3(0, 0, -4.15);
    this._cameraMeta = null;

    // Smoothed parallax offset target / current.
    this._pointerX = 0;
    this._pointerY = 0;
    this._curYaw = 0;
    this._curPitch = 0;
    this._tgtYaw = 0;
    this._tgtPitch = 0;
    this._cameraOffset = new THREE.Vector3();
    this._cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    this._time = 0;
    this._breathingEnabled = !isLowPower && !prefersReducedMotion;
    this._raf = null;
    this._lastCameraUpdate = 0;
    this._disposed = false;

    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
  }

  init() {
    this.viewer = new GaussianSplats3D.Viewer({
      rootElement: this.container,
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 0, 3],
      initialCameraLookAt: [0, 0, 0],
      useBuiltInControls: false, // we drive the camera ourselves
      // A self-driven Viewer renders at display refresh rate. This ambient
      // background owns a capped loop below, halving sort/render work on 60 Hz.
      selfDrivenMode: false,
      sphericalHarmonicsDegree: 0,
      renderMode: GaussianSplats3D.RenderMode.Always,
      sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
      dynamicScene: false,
      sharedMemoryForWorkers: window.crossOriginIsolated === true,
      gpuAcceleratedSort: false,
      enableSIMDInSort: true,
      halfPrecisionCovariancesOnGPU: true,
      integerBasedSort: true,
      antialiased: false,
    });

    this.camera = this.viewer.camera;
    this.renderer = this.viewer.renderer;
    this.splatMesh = this.viewer.splatMesh;

    // Opaque sky-blue clear so any tiny uncovered patch matches the image.
    this.renderer.setClearColor(new THREE.Color(0xbfe3ff), 1.0);
    this.renderer.setPixelRatio(pickPixelRatio());

    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    document.addEventListener('pointerleave', this._onPointerLeave);
  }

  // ── Scene loading ──────────────────────────────────

  /**
   * Load one or more splat scenes and composite them.
   *
   * @param {Array<{url: string, position?: number[], scale?: number[], alphaThreshold?: number, label?: string}>} scenes
   * @param {(pct: number, label: string) => void} onProgress
   * @param {{focalLengthPx: number, width: number, height: number}} cameraMeta
   */
  async loadScenes(scenes, onProgress, cameraMeta) {
    this._cameraMeta = cameraMeta;
    const total = scenes.length;
    for (let i = 0; i < total; i++) {
      const s = scenes[i];
      const baseLabel = s.label ?? (i === total - 1 ? '下载奶蛙场景…' : '下载云海场景…');
      onProgress?.((i / total) * 88, baseLabel);

      const lowerUrl = s.url.toLowerCase();
      const format = lowerUrl.endsWith('.ksplat')
        ? GaussianSplats3D.SceneFormat.KSplat
        : GaussianSplats3D.SceneFormat.Ply;

      // Let the renderer stream and parse the URL itself. The old code first
      // copied every 63 MB PLY into JS chunks and then copied it again into a
      // Blob, causing a large avoidable memory spike during startup.
      let sceneProgress = 0;
      await this.viewer.addSplatScene(s.url, {
        format,
        rotation: SCENE_ROTATION,
        position: s.position ?? [0, 0, 0],
        scale: s.scale ?? [1, 1, 1],
        splatAlphaRemovalThreshold: s.alphaThreshold ?? 5,
        showLoadingUI: false,
        progressiveLoad: false,
        onProgress: (pct, label) => {
          // The loader reports a fresh 0% when it switches from download to
          // parsing. Keep the user-facing bar monotonic.
          sceneProgress = Math.max(sceneProgress, pct);
          const stage = label === '0%' && pct === 0
            ? '解析高斯点云…'
            : baseLabel;
          const globalPct = (i / total) * 88 + (sceneProgress / total) * 0.88;
          onProgress?.(globalPct, stage);
        },
      });
    }

    onProgress?.(90, '调校相机…');
    this._reframe();
    this._startTick();
    onProgress?.(100, '完成');
  }

  // ── Cover-fit framing ──────────────────────────────

  _reframe() {
    if (!this.camera || !this._cameraMeta) return;

    const { focalLengthPx, width: sourceWidth, height: sourceHeight } = this._cameraMeta;
    if (!(focalLengthPx > 0 && sourceWidth > 0 && sourceHeight > 0)) return;

    const viewportAspect = this.container.clientWidth / this.container.clientHeight;
    const sourceAspect = sourceWidth / sourceHeight;
    const sourceTanHalfV = sourceHeight / (2 * focalLengthPx);

    // CSS-background-size: cover, expressed as a camera FOV. A wider viewport
    // crops vertically; a taller viewport crops horizontally.
    const coverTanHalfV = viewportAspect > sourceAspect
      ? sourceTanHalfV * (sourceAspect / viewportAspect)
      : sourceTanHalfV;

    this.camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(coverTanHalfV / OVERSCAN),
    );
    this.camera.aspect = viewportAspect;

    this.camera.position.copy(this._basePosition);
    this.camera.lookAt(this._baseTarget);
    this.camera.near = 0.01;
    this.camera.far = 500;
    this.camera.updateProjectionMatrix();
  }

  // ── Ambient parallax + breathing ───────────────────

  _startTick() {
    if (this._raf) return;
    let last = performance.now();
    const loop = (now) => {
      if (this._disposed) return;
      this._raf = requestAnimationFrame(loop);
      if (document.hidden || now - this._lastCameraUpdate < CAMERA_UPDATE_INTERVAL) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this._lastCameraUpdate = now;
      this._time += dt;
      this._updateCamera(dt);
      this.viewer.update();
      this.viewer.render();
    };
    this._raf = requestAnimationFrame(loop);
  }

  _updateCamera(dt) {
    // Smooth the pointer values.
    this._curYaw += (this._tgtYaw - this._curYaw) * PARALLAX_LERP * (dt * 60);
    this._curPitch += (this._tgtPitch - this._curPitch) * PARALLAX_LERP * (dt * 60);

    // Breathing sinusoid — independent very slow periods.
    const breathYaw = this._breathingEnabled
      ? Math.sin(this._time * ((Math.PI * 2) / BREATH_PERIOD_Y)) * BREATH_YAW
      : 0;
    const breathPitch = this._breathingEnabled
      ? Math.sin(this._time * ((Math.PI * 2) / BREATH_PERIOD_X) + 1.3) * BREATH_PITCH
      : 0;

    const yaw = this._curYaw + breathYaw;
    const pitch = this._curPitch + breathPitch;
    const interaction = Math.min(
      1,
      Math.hypot(
        this._curYaw / YAW_LIMIT,
        this._curPitch / PITCH_LIMIT,
      ),
    );

    // Build camera pose from base frame, applying yaw/pitch around target.
    const offset = this._cameraOffset.subVectors(
      this._basePosition,
      this._baseTarget,
    );

    // Rotate around Y (yaw) and X (pitch) relative to target.
    this._cameraEuler.set(pitch, yaw, 0, 'YXZ');
    offset.applyEuler(this._cameraEuler);

    this.camera.position.copy(this._baseTarget).add(offset);
    this.camera.position.z -= interaction * DOLLY_LIMIT;
    this.camera.lookAt(this._baseTarget);
  }

  // ── Pointer handling ───────────────────────────────

  _onPointerMove(e) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let nx = (e.clientX / w) * 2 - 1; // -1 … 1
    let ny = -((e.clientY / h) * 2 - 1);

    // Circular-ish dead zone around centre.
    const mag = Math.hypot(nx, ny);
    if (mag < DEAD_ZONE) {
      this._tgtYaw = 0;
      this._tgtPitch = 0;
      return;
    }
    // Rescale so motion starts just outside the dead zone.
    const k = (mag - DEAD_ZONE) / (1 - DEAD_ZONE);
    nx = (nx / mag) * k;
    ny = (ny / mag) * k;

    this._tgtYaw = -nx * YAW_LIMIT;
    this._tgtPitch = ny * PITCH_LIMIT;
  }

  _onPointerLeave() {
    this._tgtYaw = 0;
    this._tgtPitch = 0;
  }

  // ── Resize ─────────────────────────────────────────

  _onResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setPixelRatio(pickPixelRatio());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._reframe();
  }

  // ── Public helpers (kept for main.js) ──────────────

  resetView() {
    this._tgtYaw = 0;
    this._tgtPitch = 0;
  }

  setBreathing(enabled) {
    this._breathingEnabled = enabled;
  }

  setIdleEnabled(enabled) {
    this._breathingEnabled = enabled && !prefersReducedMotion;
  }

  isIdleEnabled() {
    return this._breathingEnabled;
  }

  dispose() {
    this._disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerleave', this._onPointerLeave);
    try { this.viewer?.dispose?.(); } catch { /* noop */ }
  }
}
