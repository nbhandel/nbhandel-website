/**
 * Lightweight, first-party, opt-in-friendly motion for existing NBHandel clips.
 * Starts only when a clip is visible, avoids third-party video requests,
 * obeys data-saver/reduced-motion, and exposes per-video pause controls.
 */
const frames = [...document.querySelectorAll('[data-nbl-motion]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const smallScreen = window.matchMedia('(max-width: 767px)');
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const items = frames.map(frame => ({
  frame,
  video: frame.querySelector('video[data-src]'),
  button: frame.querySelector('.nbl-film-toggle'),
  inView: false,
  manuallyPaused: false,
}));
const active = new Set();

function enableSource(item) {
  const { video } = item;
  if (video && !video.getAttribute('src')) {
    const supportsWebm = video.canPlayType('video/webm; codecs="vp8"') !== '';
    const ref = supportsWebm ? video.dataset.webm : video.dataset.src;
    if (!/^\/media\/story\/[a-z-]+\.(mp4|webm)$/.test(ref || '')) return false;
    video.src = ref;
    video.load();
  }
  return Boolean(video?.getAttribute('src'));
}

function setButton(item, playing) {
  item.button.textContent = playing ? 'Ⅱ Pausieren' : '▶ Abspielen';
  item.button.setAttribute('aria-label', playing ? 'Video pausieren' : 'Video abspielen');
  item.button.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function stop(item) {
  if (!item.video) return;
  item.video.pause();
  active.delete(item);
  setButton(item, false);
}

function autoplayAllowed() {
  const tooSlow = ['slow-2g', '2g'].includes(connection?.effectiveType);
  return !document.hidden && !reduceMotion.matches && !connection?.saveData && !tooSlow;
}

async function play(item, manual = false) {
  if (!item.video || !enableSource(item)) return;
  if (!manual && (!autoplayAllowed() || !item.inView || item.manuallyPaused)) return;
  if (document.hidden) return;
  const maximum = smallScreen.matches ? 1 : 2;
  for (const prev of [...active]) {
    if (prev !== item && (!prev.inView || active.size >= maximum)) stop(prev);
  }
  try {
    await item.video.play();
    if (item.video.paused) { stop(item); return; }
    active.add(item);
    setButton(item, true);
  } catch {
    stop(item); // Browser can reject autoplay; poster remains functional.
  }
}

for (const item of items) {
  if (!item.video || !item.button) continue;
  setButton(item, false);
  item.video.setAttribute('muted', '');
  item.video.muted = true;
  item.video.defaultMuted = true;
  item.video.playsInline = true;
  item.video.preload = 'none';
  item.button.addEventListener('click', () => {
    if (item.video.paused) {
      item.manuallyPaused = false;
      play(item, true);
    } else {
      item.manuallyPaused = true;
      stop(item);
    }
  });
  item.video.addEventListener('pause', () => {
    active.delete(item);
    setButton(item, false);
  });
  item.video.addEventListener('error', () => {
    stop(item);
    item.button.textContent = 'Video nicht verfügbar';
    item.button.disabled = true;
  });
}

if (typeof IntersectionObserver === 'function') {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const item = items.find(i => i.frame === entry.target);
      if (!item) continue;
      item.inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      if (!item.inView) stop(item);
      else if (autoplayAllowed()) play(item);
    }
  }, { rootMargin: '100px 0px', threshold: [0, 0.15, 0.35, 0.75] });
  for (const item of items) if (item.video) observer.observe(item.frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) items.forEach(stop);
  else if (autoplayAllowed()) items.filter(i => i.inView).forEach(i => play(i));
});
reduceMotion.addEventListener?.('change', () => {
  if (reduceMotion.matches) items.forEach(stop);
});
connection?.addEventListener?.('change', () => {
  if (!autoplayAllowed()) items.forEach(stop);
});
window.addEventListener('pagehide', () => items.forEach(stop));
