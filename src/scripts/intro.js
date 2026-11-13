/**
 * Intro in three beats:
 * 1. Preload — bouncing cup, cycling messages, real progress bar (CSS-driven).
 * 2. Ready — the ASCELCAFE letters drop one by one, then "Ready! Let's go!".
 * 3. Reveal — the five colour panels lift like a curtain onto the hero.
 */
import gsap from 'gsap';

const parts = (wm) => ({ letters: [...wm.querySelectorAll('.wm__l')], accent: wm.querySelector('.wm__a') });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function loadIntro({ glReady, images, onImages }) {
	const intro = document.querySelector('[data-intro]');
	const bar = document.querySelector('[data-intro-bar]');
	intro?.classList.add('is-run');

	const p = { fonts: 0, gl: 0, img: 0 };
	const update = () => {
		const v = Math.max(0.04, p.fonts * 0.1 + p.gl * 0.5 + p.img * 0.4);
		if (bar) bar.style.transform = `scaleX(${v.toFixed(3)})`;
	};
	onImages((f) => {
		p.img = f;
		update();
	});
	const fonts = (document.fonts?.ready || Promise.resolve()).then(() => {
		p.fonts = 1;
		update();
	});
	let gl = null;
	const glDone = glReady.then((g) => {
		gl = g;
		p.gl = 1;
		update();
	});
	await Promise.race([Promise.all([fonts, glDone, images, wait(2400)]), wait(20000)]);
	p.fonts = p.gl = p.img = 1;
	update();

	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	await wait(350);

	if (intro) {
		intro.classList.add('is-ready');
		const L = parts(intro.querySelector('[data-wm]'));
		gsap.set(L.letters, { yPercent: -160, rotation: 'random(-25, 25)', opacity: 1, transformOrigin: '50% 100%' });
		gsap.set(L.accent, { yPercent: -400, opacity: 0 });
		await new Promise((r) => {
			gsap.timeline({ onComplete: r })
				.to(L.letters, { yPercent: 0, rotation: 0, duration: 0.9, stagger: 0.07, ease: 'bounce.out' })
				.to(L.accent, { yPercent: 0, opacity: 1, rotation: 18, duration: 0.7, ease: 'back.out(3)' }, '-=0.25');
		});
		intro.classList.add('is-done');
		await wait(800);
	}
	return gl;
}

export function revealIntro(state) {
	const intro = document.querySelector('[data-intro]');
	const heroWm = document.querySelector('.s-hero [data-wm]');
	const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

	if (intro) {
		tl.to('.intro__logo', { scale: 1.6, opacity: 0, duration: 0.7, ease: 'power3.in' }, 0)
			.to('.intro__done, .intro__word', { opacity: 0, duration: 0.3 }, 0)
			.to('.intro__panels span', { yPercent: -101, duration: 1.1, stagger: 0.07, ease: 'expo.inOut' }, 0.25)
			.set(intro, { display: 'none' });
	}
	if (heroWm) {
		const H = parts(heroWm);
		tl.from(H.letters, { yPercent: 120, rotation: (k) => (k % 2 ? 12 : -12), duration: 1.3, stagger: 0.06, ease: 'back.out(1.6)' }, 0.55)
			.from(H.accent, { yPercent: -300, opacity: 0, duration: 0.9, ease: 'bounce.out' }, 0.95);
	}
	tl.to(state.hero, { enter: 1, duration: 1.8, ease: 'power2.out' }, 0.7)
		.from('.s-hero__kicker > *', { y: -30, opacity: 0, stagger: 0.08, duration: 0.9 }, 0.9)
		.from('.s-hero__foot > *', { y: 40, opacity: 0, stagger: 0.12, duration: 1 }, 1)
		.from('.s-hero__stamp', { scale: 0, rotation: -180, duration: 1.2, ease: 'back.out(1.7)' }, 1.1)
		.from('.topbar > *', { y: -60, opacity: 0, stagger: 0.08, duration: 0.9 }, 1.1)
		.from('.s-hero__scroll', { opacity: 0, y: 20, duration: 0.8 }, 1.4);
	return new Promise((r) => tl.call(r, null, 1.4));
}
