/**
 * Entry point. Order: status → smooth scroll → intro (while 3D + images prepare)
 * → section animations → curtain opens.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { initStatus } from './status.js';
import { setupScroll } from './scroll.js';
import { loadIntro, revealIntro } from './intro.js';
import { initSections } from './sections.js';
import { initCursor } from './cursor.js';
import { initMap } from './map.js';
import { initRain } from './rain.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shared state: GSAP writes, 3D reads. */
const state = (window.__ascelcafe = {
	reduced,
	hero: { p: 0, mx: 0, my: 0, enter: 0 },
	build: { p: 0 },
	rain: { active: false, reset: null },
});

function webgl() {
	try {
		return !!document.createElement('canvas').getContext('webgl2');
	} catch {
		return false;
	}
}

function loadGL() {
	if (!webgl()) return Promise.resolve(null);
	return import('./gl.js')
		.then((m) => m.createStage(state))
		.catch((e) => {
			console.error('[Ascelcafe] 3D unavailable:', e);
			return null;
		});
}

function showGL(gl) {
	if (!gl || root.classList.contains('has-gl')) return;
	root.classList.add('has-gl');
	if (!reduced) gsap.fromTo('[data-view] canvas', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
}

function preloadImages(onProgress) {
	const imgs = [...document.images];
	let done = 0;
	return Promise.all(
		imgs.map((img) =>
			(img.complete ? Promise.resolve() : new Promise((r) => img.addEventListener('load', r, { once: true }) || img.addEventListener('error', r, { once: true })))
				.then(() => img.decode?.().catch(() => {}))
				.then(() => onProgress(++done / imgs.length)),
		),
	);
}

const painted = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function boot() {
	initStatus();
	gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
	window.gsap = gsap;

	if (reduced) {
		root.classList.add('reduced');
		state.build.p = 0.75;
		state.hero.enter = 1;
		root.classList.add('is-revealed');
		initMap({ reduced: true });
		loadGL().then((gl) => {
			showGL(gl);
			initRain(state, gl?.sprites);
		});
		return;
	}

	ScrollTrigger.config({ ignoreMobileResize: true });
	CustomEase.create('ascel', 'M0,0 C0.2,0.8 0.2,1 1,1');

	const lenis = setupScroll();
	lenis.stop();
	initCursor();
	await painted();

	const glReady = loadGL();
	let onImg = () => {};
	const images = preloadImages((f) => onImg(f));
	const gl = await loadIntro({ glReady, images, onImages: (cb) => (onImg = cb) });
	showGL(gl);

	initSections(state, lenis);
	initMap({});
	initRain(state, gl?.sprites);
	ScrollTrigger.refresh();
	await revealIntro(state);
	root.classList.add('is-revealed');
	lenis.start();
	const past = () => root.classList.toggle('past-hero', scrollY > innerHeight * 0.6);
	addEventListener('scroll', past, { passive: true });
	past();

	let lastW = innerWidth;
	let timer = 0;
	addEventListener('resize', () => {
		if (innerWidth === lastW) return;
		lastW = innerWidth;
		clearTimeout(timer);
		timer = setTimeout(() => ScrollTrigger.refresh(), 250);
	});
}

boot();
