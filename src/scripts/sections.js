/**
 * Scroll animations for every section (GSAP + ScrollTrigger + SplitText).
 * Values needed by the 3D scenes are written into `state`.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

export function initSections(state) {
	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => [...c.querySelectorAll(s)];

	/* ---------- Titles: chars rise out of a line mask ---------- */
	$$('[data-split-chars]').forEach((el) => {
		SplitText.create(el, {
			type: 'lines,chars',
			mask: 'lines',
			linesClass: 'split-line',
			charsClass: 'split-char',
			autoSplit: true,
			onSplit: (self) =>
				gsap.from(self.chars, {
					yPercent: 115,
					rotation: 'random(-14, 14)',
					duration: 1.1,
					ease: 'back.out(1.4)',
					stagger: { each: 0.025 },
					scrollTrigger: { trigger: el, start: 'top 85%', once: true },
					onComplete: () => {
						(self.masks || []).forEach((m) => (m.style.overflow = 'visible'));
						self.lines.forEach((l) => (l.style.overflow = 'visible'));
					},
				}),
		});
	});

	/* ---------- "Jelly" titles: each letter hops under the pointer ---------- */
	$$('[data-jelly]').forEach((el) => {
		el.addEventListener('pointermove', (e) => {
			const ch = e.target.closest('.split-char');
			if (!ch || gsap.isTweening(ch)) return;
			gsap.fromTo(ch, { y: 0, scaleY: 1 }, { y: '-0.22em', scaleY: 1.12, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 100%', color: '#FFBB1C', clearProps: 'color' });
		});
	});

	/* ---------- Generic parallax ---------- */
	$$('[data-parallax]').forEach((el) => {
		const amt = parseFloat(el.dataset.parallax) || 10;
		gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
	});

	/* ---------- Script lettering: revealed like a brush stroke ---------- */
	$$('[data-sign]').forEach((el) => {
		const wipe = document.createElement('span');
		wipe.className = 'wipe';
		const inner = document.createElement('span');
		inner.className = 'wipe__in';
		el.replaceWith(wipe);
		wipe.appendChild(inner);
		inner.appendChild(el);
		gsap.timeline({ scrollTrigger: { trigger: wipe, start: 'top 85%', once: true } })
			.fromTo(wipe, { xPercent: -100 }, { xPercent: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
			.fromTo(inner, { xPercent: 100 }, { xPercent: 0, duration: 1.6, ease: 'power2.inOut' }, 0);
	});

	/* ---------- 01 Hero ---------- */
	const hero = $('.s-hero');
	if (hero) {
		const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
		ScrollTrigger.create({ ...st, onUpdate: (s) => (state.hero.p = s.progress) });
		gsap.to('.s-hero__title', { yPercent: 30, scale: 0.86, ease: 'none', scrollTrigger: st });
		gsap.to('.s-hero__motif', { rotate: -6, scale: 1.2, ease: 'none', scrollTrigger: st });
		gsap.to('.s-hero__kicker, .s-hero__foot, .s-hero__scroll', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true } });
		addEventListener('pointermove', (e) => {
			state.hero.mx = (e.clientX / innerWidth) * 2 - 1;
			state.hero.my = (e.clientY / innerHeight) * 2 - 1;
		});
		addEventListener('deviceorientation', (e) => {
			if (e.gamma == null) return;
			state.hero.mx = gsap.utils.clamp(-1, 1, e.gamma / 30);
			state.hero.my = gsap.utils.clamp(-1, 1, (e.beta - 45) / 30);
		});
	}

	/* ---------- Topbar badge spins with scroll velocity ---------- */
	const badge = $('.topbar__logo');
	if (badge) {
		const rot = gsap.quickTo(badge, 'rotation', { duration: 0.6, ease: 'power3' });
		ScrollTrigger.create({ onUpdate: (s) => rot(-8 + gsap.utils.clamp(-20, 20, s.getVelocity() / 120)) });
	}

	/* ---------- Infinite marquees, boosted by scroll speed ---------- */
	const loops = [];
	const loop = (row, dir, speed) => {
		const track = row.firstElementChild;
		const kids = [...track.children];
		const half = kids.length / 2;
		const w = half >= 1 ? kids[half].offsetLeft - kids[0].offsetLeft : 0;
		if (!w) return;
		gsap.set(track, { x: dir > 0 ? 0 : -w });
		loops.push(gsap.to(track, { x: dir > 0 ? -w : 0, duration: w / speed, ease: 'none', repeat: -1 }));
	};
	$$('[data-marquee]').forEach((m) => loop(m, Number(m.dataset.marquee), 90));
	$$('[data-names-row]').forEach((m) => loop(m, Number(m.dataset.namesRow), 70));
	if (loops.length) {
		let boost = 1;
		ScrollTrigger.create({ onUpdate: (s) => (boost = 1 + Math.min(5, Math.abs(s.getVelocity()) / 300)) });
		gsap.ticker.add(() => {
			boost += (1 - boost) * 0.05;
			loops.forEach((l) => l.timeScale(boost));
		});
	}
	gsap.from('.marquee--a', { rotate: -10, ease: 'none', scrollTrigger: { trigger: '.s-marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
	gsap.from('.marquee--b', { rotate: 6, ease: 'none', scrollTrigger: { trigger: '.s-marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

	/* ---------- 03 Definition: words light up while reading ---------- */
	const words = $('[data-words]');
	if (words) {
		const split = SplitText.create(words, { type: 'words', wordsClass: 'split-word' });
		gsap.fromTo(split.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: words, start: 'top 78%', end: 'bottom 50%', scrub: true } });
	}
	gsap.from('[data-stamp]', { scale: 0.82, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.s-def', start: 'top bottom', end: 'center center', scrub: true } });

	/* ---------- 04 The tostada builds itself (pinned) ---------- */
	const buildPin = $('[data-build-pin]');
	if (buildPin) {
		const steps = $$('.s-build__step');
		const bar = $('[data-build-bar]');
		const result = $('[data-build-result]');
		const twist = $('[data-build-twist]');
		const stepsEl = $('.s-build__steps');
		const intro = $('.s-build__intro');
		const marks = [0.02, 0.14, 0.36, 0.46, 0.57, 0.66];
		const show = (el, on) => gsap.to(el, { autoAlpha: on ? 1 : 0, y: on ? 0 : 24, duration: 0.5, overwrite: true });
		const small = matchMedia('(max-width: 760px)');
		let rOn = false, tOn = false, hidden = false, introOff = false;
		gsap.set([result, twist], { autoAlpha: 0, y: 24 });
		ScrollTrigger.create({
			trigger: buildPin,
			start: 'top top',
			end: () => '+=' + innerHeight * 4,
			pin: true,
			anticipatePin: 1,
			scrub: true,
			onUpdate: (s) => {
				const p = s.progress;
				state.build.p = p;
				if (bar) bar.style.transform = `scaleX(${p})`;
				steps.forEach((li, i) => {
					li.classList.toggle('is-active', p >= marks[i] && p < marks[i + 1]);
					li.classList.toggle('is-done', p >= marks[i + 1]);
				});
				const r = p > 0.7 && p < 0.82;
				const t = p > 0.9;
				if (r !== rOn) show(result, (rOn = r));
				if (t !== tOn) show(twist, (tOn = t));
				const off = small.matches && p > 0.015;
				if (off !== introOff) gsap.to(intro, { autoAlpha: (introOff = off) ? 0 : 1, duration: 0.45, overwrite: true });
				const hide = p > 0.68;
				if (hide !== hidden) gsap.to(stepsEl, { autoAlpha: (hidden = hide) ? 0 : 1, duration: 0.3, overwrite: true });
			},
		});
	}

	/* ---------- 05 Horizontal gallery (pinned) ---------- */
	const gPin = $('[data-gallery-pin]');
	const track = $('[data-gallery-track]');
	if (gPin && track) {
		const dist = () => track.scrollWidth - innerWidth;
		const tl = gsap.timeline({
			scrollTrigger: { trigger: gPin, start: 'top top', end: () => '+=' + dist(), pin: true, anticipatePin: 1, scrub: true, invalidateOnRefresh: true },
		});
		tl.to(track, { x: () => -dist(), ease: 'none' }, 0).to('[data-gallery-giant]', { xPercent: -45, ease: 'none' }, 0);
		$$('[data-card]', track).forEach((card) => {
			const img = $('[data-card-img]', card);
			const media = $('.card__media', card);
			gsap.fromTo(media, { rotate: 6, scale: 0.86 }, { rotate: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left right', end: 'center center', scrub: true } });
			if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left right', end: 'right left', scrub: true } });
			const title = $('.card__title', card);
			if (title) gsap.from(title, { yPercent: 60, opacity: 0, rotate: -6, ease: 'back.out(2)', duration: 0.9, scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left 70%', toggleActions: 'play none none reverse' } });
			const num = $('.card__num', card);
			if (num) gsap.from(num, { scale: 0, rotate: -90, ease: 'back.out(3)', duration: 0.7, scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left 75%', toggleActions: 'play none none reverse' } });
		});
	}

	/* ---------- 06 Names: CTA bounce ---------- */
	gsap.from('.s-names__cta > *', { y: 50, opacity: 0, rotate: -6, stagger: 0.12, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.s-names__cta', start: 'top 90%', once: true } });

	/* ---------- 07 Amigos: drawing becomes photo ---------- */
	const duo = $('[data-duo]');
	if (duo) {
		const illu = $('[data-duo-illu]', duo);
		const illuIn = $('[data-duo-in]', illu);
		const line = $('[data-duo-line]', duo);
		const frame = $('.duo__frame', duo);
		gsap.timeline({
			scrollTrigger: { trigger: duo, start: 'center center', end: () => '+=' + innerHeight * 1.2, pin: true, anticipatePin: 1, scrub: true, invalidateOnRefresh: true },
		})
			.set(line, { opacity: 1 })
			.fromTo(illu, { xPercent: 0 }, { xPercent: 100, ease: 'none' }, 0)
			.fromTo(illuIn, { xPercent: 0 }, { xPercent: -100, ease: 'none' }, 0)
			.fromTo(line, { x: 0 }, { x: () => frame.offsetWidth, ease: 'none' }, 0)
			.to(line, { opacity: 0, duration: 0.05 });
	}
	gsap.from('.s-amigos__how > span', { y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.s-amigos__how', start: 'top 90%', once: true } });

	/* ---------- 08 Hours + clinking cups ---------- */
	const hours = $('.s-hours');
	if (hours) {
		gsap.from('[data-hours-row]', { xPercent: -30, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.hours', start: 'top 85%', once: true } });
		gsap.fromTo('.s-hours__disc', { scale: 0.5, rotate: -30 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: hours, start: 'top bottom', end: 'center center', scrub: true } });
		gsap.timeline({ scrollTrigger: { trigger: hours, start: 'top 85%', end: 'center center', scrub: true } })
			.fromTo('[data-drink-l]', { x: -160, y: 120, rotate: -28 }, { x: 0, y: 0, rotate: 12, ease: 'power2.out' }, 0)
			.fromTo('[data-drink-r]', { x: 160, y: 140, rotate: 28 }, { x: 0, y: 0, rotate: -12, ease: 'power2.out' }, 0)
			.fromTo('[data-splash]', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, ease: 'back.out(3)', duration: 0.25 }, 0.8);
	}

	/* ---------- 09 Visit ---------- */
	gsap.from('.s-visit__pictos li, .s-visit__actions > *', { y: 30, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: '.s-visit__actions', start: 'top 90%', once: true } });
	gsap.fromTo('.s-visit__illu', { rotate: -25, scale: 0.6 }, { rotate: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: '.s-visit', start: 'top bottom', end: 'bottom top', scrub: true } });
	gsap.fromTo('[data-visit-marquee]', { xPercent: 0 }, { xPercent: -33.333, ease: 'none', scrollTrigger: { trigger: '.s-visit', start: 'top bottom', end: 'bottom top', scrub: true } });
	const map = $('[data-map]');
	if (map && matchMedia('(pointer: fine)').matches) {
		const wrap = map.parentElement;
		const rx = gsap.quickTo(map, 'rotationX', { duration: 0.6, ease: 'power3' });
		const ry = gsap.quickTo(map, 'rotationY', { duration: 0.6, ease: 'power3' });
		wrap.addEventListener('pointermove', (e) => {
			const r = wrap.getBoundingClientRect();
			ry(((e.clientX - r.left) / r.width - 0.5) * 9);
			rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
		});
		wrap.addEventListener('pointerleave', () => {
			rx(0);
			ry(0);
		});
	}

	/* ---------- 10 Finale: ¡VAAAAMOS! + falling food ---------- */
	const big = $('[data-end-big] > span');
	if (big) {
		const split = SplitText.create(big, { type: 'chars', charsClass: 'split-char' });
		gsap.from(split.chars, {
			yPercent: 120,
			rotation: 'random(-30, 30)',
			stagger: 0.04,
			duration: 1.2,
			ease: 'elastic.out(1, 0.5)',
			scrollTrigger: { trigger: '.s-end', start: 'top 55%', toggleActions: 'play none none reverse' },
		});
		big.addEventListener('pointermove', (e) => {
			const c = e.target.closest('.split-char');
			if (c && !gsap.isTweening(c)) gsap.fromTo(c, { y: 0 }, { y: -40, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' });
		});
	}
	gsap.from('.s-end__card', { y: -60, rotate: -6, opacity: 0, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.s-end', start: 'top 60%', toggleActions: 'play none none reverse' } });
	const end = $('.s-end');
	const meta = $('.s-end__meta');
	if (end && meta) {
		const setMeta = () => end.style.setProperty('--meta-h', meta.offsetHeight + 24 + 'px');
		setMeta();
		ScrollTrigger.addEventListener('refreshInit', setMeta);
	}
	ScrollTrigger.create({
		trigger: '.s-end',
		start: 'top 60%',
		end: 'bottom top',
		onToggle: (s) => (state.rain.active = s.isActive),
		onLeaveBack: () => state.rain.reset?.(),
	});
}
