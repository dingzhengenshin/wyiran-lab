/**
 * Naiwa — layered 3D Gaussian Splatting.
 *
 *   Scenes 0–1  clouds    — split volumetric cloud sea (background)
 *   Scene 2     subject   — masked frog + bench + soft close cloud
 *
 * The cloud sea stays dense; the unified subject is background-masked so the
 * two reconstructions can composite correctly without sorting blue splats.
 */

import { NaiwaViewer } from './viewer.js';

const $container = document.getElementById('canvas-container');
const $loading = document.getElementById('loading');
const $progressFill = document.getElementById('progress-fill');
const $progressLabel = document.getElementById('progress-label');
const $loadingText = document.getElementById('loading-text');
const $bottomUi = document.getElementById('bottom-ui');
const $notice = document.getElementById('notice');
const $noticeText = document.getElementById('notice-text');
const $btnReset = document.getElementById('btn-reset');
const $btnDrift = document.getElementById('btn-drift');
const $btnRetry = document.getElementById('btn-retry');

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setProgress(pct, label) {
  const clamped = Math.round(Math.max(0, Math.min(100, pct)));
  $progressFill.style.width = `${clamped}%`;
  $progressLabel.textContent = label ? `${clamped}%  ${label}` : `${clamped}%`;
}

function showNotice(text, showRetry = false) {
  $noticeText.textContent = text;
  if (showRetry) show($btnRetry); else hide($btnRetry);
  show($notice);
}

async function fetchSceneMeta() {
  try {
    const res = await fetch('scene-meta.json', { method: 'GET' });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/html')) return null;
    const data = await res.json();
    if (data && Array.isArray(data.scenes) && data.scenes.length > 0) return data;
    return null;
  } catch {
    return null;
  }
}

let viewer = null;

async function bootstrap() {
  show($loading);
  $loadingText.textContent = '寻找奶蛙…';
  setProgress(0, '');

  const meta = await fetchSceneMeta();
  if (!meta) {
    hide($loading);
    showNotice('3D 场景准备中 — 请先生成云海与统一主体高斯资源', false);
    return;
  }

  $loadingText.textContent = '唤醒云端…';
  setProgress(2, '初始化渲染器');

  try {
    viewer = new NaiwaViewer($container);
    viewer.init();

    const sceneDescriptors = meta.scenes.map((s) => ({
      url: s.ply,
      position: s.position,
      scale: s.scale,
      alphaThreshold: s.alphaThreshold ?? 5,
      label: s.label,
    }));

    await viewer.loadScenes(
      sceneDescriptors,
      (pct, label) => setProgress(pct, label),
      {
        focalLengthPx: meta.focal_length_px,
        width: meta.width,
        height: meta.height,
      },
    );

    setProgress(100, '完成');
    setTimeout(() => {
      hide($loading);
      $container.classList.add('visible');
      show($bottomUi);
    }, 500);

    $btnReset?.addEventListener('click', () => viewer?.resetView());
    $btnDrift?.classList.toggle('active', viewer.isIdleEnabled());
    $btnDrift?.addEventListener('click', () => {
      const active = $btnDrift.classList.toggle('active');
      viewer?.setIdleEnabled(active);
    });
  } catch (err) {
    console.error('[naiwa] Failed to load scenes:', err);
    hide($loading);
    showNotice('3D 场景加载失败 — 请重试', true);
  }
}

bootstrap();

window.__naiwa = {
  get viewer() { return viewer; },
  resetView: () => viewer?.resetView(),
};
