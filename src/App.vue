<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import ThreeHero from "./components/ThreeHero.vue";

let teardown: (() => void) | undefined;
let cancelled = false;

onMounted(async () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (cancelled) return;

  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  if (cancelled) return;

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const context = gsap.context(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".site-nav", { y: -18, opacity: 0, duration: 0.75 })
      .from(".hero-kicker", { y: 18, opacity: 0, duration: 0.7 }, "-=0.38")
      .from(".hero-title span", { yPercent: 108, duration: 0.95, stagger: 0.07 }, "-=0.45")
      .from(".hero-copy, .hero-actions, .scroll-cue", { y: 16, opacity: 0, duration: 0.65, stagger: 0.07 }, "-=0.5");

    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
      gsap.from(element, {
        y: 44,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      });
    });

    gsap.to(".hero-content", {
      yPercent: 12,
      opacity: 0.28,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.7 },
    });

    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!saveData) {
      media.add("(min-width: 1024px)", () => {
        const track = document.querySelector<HTMLElement>(".work-track");
        if (!track) return;
        const distance = () => Math.max(track.scrollWidth - window.innerWidth + 72, 0);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: ".work-stage",
            start: "top top",
            end: () => `+=${Math.max(distance(), 760)}`,
            pin: true,
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });
      });
    }
  });

  teardown = () => {
    media.revert();
    context.revert();
  };
});

onBeforeUnmount(() => {
  cancelled = true;
  teardown?.();
});
</script>

<template>
  <a class="skip-link" href="#main">跳转到主要内容</a>
  <header class="site-nav">
    <a class="brand" href="#top" aria-label="WYIRAN LAB 首页">WYIRAN <span>LAB</span></a>
    <nav aria-label="主要导航">
      <a href="#work">项目</a>
      <a href="#approach">方法</a>
      <a href="#contact">联系</a>
    </nav>
    <span class="nav-status"><i></i> 保持好奇，持续创造</span>
  </header>

  <main id="main">
    <section id="top" class="hero">
      <ThreeHero />
      <div class="hero-grid"></div>
      <div class="hero-content">
        <p class="hero-kicker">独立数字实验室 · 31.23°N / 121.47°E</p>
        <h1 class="hero-title" aria-label="未然实验室">
          <span>未然</span>
          <span class="title-accent">实验室</span>
        </h1>
        <div class="hero-lower">
          <p class="hero-copy">在设计、代码与空间计算的交界处，<br />探索更自然的人机体验。</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#work">查看实验 <b>↘</b></a>
            <a class="text-link" href="#contact">发起一次对话 <span>→</span></a>
          </div>
        </div>
      </div>
      <p class="scroll-cue"><span></span> 向下进入实验室</p>
    </section>

    <section class="manifesto section-shell">
      <p class="section-index" data-reveal>01 — 初衷</p>
      <div class="manifesto-copy" data-reveal>
        <p>让复杂隐于无形，</p>
        <p>让体验<strong>自然发生。</strong></p>
      </div>
      <div class="manifesto-note" data-reveal>
        <span>WYIRAN LAB 是一间个人数字实验室，关注精确、克制且富有生命力的界面与互动。</span>
        <span class="orbit-mark">W · 24</span>
      </div>
    </section>

    <section id="work" class="work-stage">
      <div class="work-heading section-shell">
        <p class="section-index">02 — 精选实验</p>
        <h2>以运动，<br />重塑感知。</h2>
      </div>
      <div class="work-track">
        <article class="work-card card-one">
          <div class="card-meta"><span>空间界面</span><span>01 / 03</span></div>
          <div class="card-visual visual-orbit"><i></i><i></i><i></i></div>
          <div class="card-bottom"><h3>场域 / 01</h3><p>WebGL · 交互 · 2026</p></div>
        </article>
        <article class="work-card card-two">
          <div class="card-meta"><span>生成式视觉</span><span>02 / 03</span></div>
          <div class="card-visual visual-signal"><span>W</span><span>L</span></div>
          <div class="card-bottom"><h3>信号 / 02</h3><p>系统 · 动效 · 2026</p></div>
        </article>
        <article class="work-card card-three">
          <div class="card-meta"><span>环境交互</span><span>03 / 03</span></div>
          <div class="card-visual visual-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="card-bottom"><h3>柔性机器</h3><p>原型 · 声音 · 2026</p></div>
        </article>
      </div>
    </section>

    <section id="approach" class="approach section-shell">
      <p class="section-index" data-reveal>03 — 方法</p>
      <div class="approach-grid">
        <h2 data-reveal>以系统思考，<br />用细节表达。</h2>
        <div class="principles">
          <article data-reveal><span>01</span><h3>清晰先于装饰</h3><p>持续去除噪声，直到最重要的动作与信息自然浮现。</p></article>
          <article data-reveal><span>02</span><h3>让动效传递意义</h3><p>动画服务于层级、方向与反馈，让数字体验具有真实的物理感。</p></article>
          <article data-reveal><span>03</span><h3>在真实环境中验证</h3><p>尽早让想法成为可运行的代码，以体验而非想象检验设计。</p></article>
        </div>
      </div>
    </section>

    <section class="signal-band" aria-label="能力领域">
      <div class="signal-line"><span>三维网页</span><i></i><span>创意编程</span><i></i><span>交互设计</span><i></i><span>快速原型</span></div>
    </section>

    <section id="contact" class="contact section-shell">
      <p class="section-index" data-reveal>04 — 开放频道</p>
      <div class="contact-copy" data-reveal>
        <p>有一个不寻常的想法？</p>
        <a href="mailto:hello@wyiranw.xyz">一起把它变成现实。<span>↗</span></a>
      </div>
      <footer>
        <a class="brand" href="#top">WYIRAN <span>LAB</span></a>
        <p>© 2026 · 构建于像素与空间之间</p>
        <a href="#top">返回起点 ↑</a>
      </footer>
    </section>
  </main>
</template>
