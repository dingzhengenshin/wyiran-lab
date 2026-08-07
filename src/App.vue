<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ThreeHero from "./components/ThreeHero.vue";

let teardown: (() => void) | undefined;

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const context = gsap.context(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".site-nav", { y: -24, opacity: 0, duration: 0.9 })
      .from(".hero-kicker", { y: 24, opacity: 0, duration: 0.85 }, "-=0.5")
      .from(".hero-title span", { yPercent: 110, duration: 1.15, stagger: 0.08 }, "-=0.55")
      .from(".hero-copy, .hero-actions, .scroll-cue", { y: 20, opacity: 0, duration: 0.8, stagger: 0.09 }, "-=0.65");

    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
      gsap.from(element, {
        y: 64,
        opacity: 0,
        duration: 1.15,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 86%", once: true },
      });
    });

    gsap.to(".hero-content", {
      yPercent: 22,
      opacity: 0.16,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });

    const media = gsap.matchMedia();
    media.add("(min-width: 900px)", () => {
      const track = document.querySelector<HTMLElement>(".work-track");
      if (!track) return;
      const distance = () => Math.max(track.scrollWidth - window.innerWidth + 80, 0);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: ".work-stage",
          start: "top top",
          end: () => `+=${Math.max(distance() * 1.15, 900)}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    teardown = () => {
      media.revert();
      context.revert();
    };
  });
});

onBeforeUnmount(() => teardown?.());
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-nav">
    <a class="brand" href="#top" aria-label="WYIRAN LAB home">WYIRAN <span>LAB</span></a>
    <nav aria-label="Primary navigation">
      <a href="#work">Work</a>
      <a href="#approach">Approach</a>
      <a href="#contact">Contact</a>
    </nav>
    <span class="nav-status"><i></i> Available for ideas</span>
  </header>

  <main id="main">
    <section id="top" class="hero">
      <ThreeHero />
      <div class="hero-noise"></div>
      <div class="hero-content">
        <p class="hero-kicker">Independent digital practice · 31.23°N / 121.47°E</p>
        <h1 class="hero-title" aria-label="WYIRAN LAB">
          <span>WYIRAN</span>
          <span class="title-accent">LAB</span>
        </h1>
        <div class="hero-lower">
          <p class="hero-copy">Digital experiments at the edge of<br />design, code and spatial computing.</p>
          <div class="hero-actions">
            <a class="button button-light" href="#work">Explore studies <b>↘</b></a>
            <a class="text-link" href="#contact">Start a conversation <span>↗</span></a>
          </div>
        </div>
      </div>
      <p class="scroll-cue"><span></span> Scroll to enter the lab</p>
    </section>

    <section class="manifesto section-shell">
      <p class="section-index" data-reveal>01 — Intent</p>
      <div class="manifesto-copy" data-reveal>
        <p>We build the invisible layer</p>
        <p>between <em>people</em> and systems.</p>
      </div>
      <div class="manifesto-note" data-reveal>
        <span>WYIRAN LAB is a personal practice exploring interfaces that feel precise, quiet and alive.</span>
        <span class="orbit-mark">W · 24</span>
      </div>
    </section>

    <section id="work" class="work-stage">
      <div class="work-heading section-shell">
        <p class="section-index">02 — Selected studies</p>
        <h2>Experiments<br />in motion.</h2>
      </div>
      <div class="work-track">
        <article class="work-card card-one">
          <div class="card-meta"><span>Spatial interface</span><span>01 / 03</span></div>
          <div class="card-visual visual-orbit"><i></i><i></i><i></i></div>
          <div class="card-bottom"><h3>Field / One</h3><p>WebGL · Interaction · 2026</p></div>
        </article>
        <article class="work-card card-two">
          <div class="card-meta"><span>Generative identity</span><span>02 / 03</span></div>
          <div class="card-visual visual-signal"><span>W</span><span>L</span></div>
          <div class="card-bottom"><h3>Signal / 02</h3><p>Systems · Motion · 2026</p></div>
        </article>
        <article class="work-card card-three">
          <div class="card-meta"><span>Ambient system</span><span>03 / 03</span></div>
          <div class="card-visual visual-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="card-bottom"><h3>Soft Machine</h3><p>Prototype · Sound · 2026</p></div>
        </article>
      </div>
    </section>

    <section id="approach" class="approach section-shell">
      <p class="section-index" data-reveal>03 — Method</p>
      <div class="approach-grid">
        <h2 data-reveal>Think in systems.<br />Craft in details.</h2>
        <div class="principles">
          <article data-reveal><span>01</span><h3>Clarity first</h3><p>Strip away noise until the essential interaction becomes obvious.</p></article>
          <article data-reveal><span>02</span><h3>Motion with purpose</h3><p>Animation carries hierarchy, direction and a sense of physical response.</p></article>
          <article data-reveal><span>03</span><h3>Prototype in reality</h3><p>Ideas become code early, where behavior can be felt rather than imagined.</p></article>
        </div>
      </div>
    </section>

    <section class="signal-band" aria-label="Capabilities">
      <div class="signal-line"><span>WEBGL</span><i></i><span>CREATIVE CODE</span><i></i><span>INTERACTION</span><i></i><span>PROTOTYPING</span></div>
    </section>

    <section id="contact" class="contact section-shell">
      <p class="section-index" data-reveal>04 — Open channel</p>
      <div class="contact-copy" data-reveal>
        <p>Have a strange idea?</p>
        <a href="mailto:hello@wyiranw.xyz">Let’s make it real. <span>↗</span></a>
      </div>
      <footer>
        <a class="brand" href="#top">WYIRAN <span>LAB</span></a>
        <p>© 2026 · Built between pixels and space.</p>
        <a href="#top">Back to orbit ↑</a>
      </footer>
    </section>
  </main>
</template>
