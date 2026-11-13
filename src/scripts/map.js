/** Map: roads draw themselves on scroll, blocks pop in, pin drops & bobs. */
import gsap from 'gsap';

export function initMap({ reduced }) {
	const map = document.querySelector('[data-map]');
	if (!map || reduced) return;
	const roads = [...map.querySelectorAll('[data-road]')];
	roads.forEach((p) => {
		const len = p.getTotalLength();
		p.style.strokeDasharray = `${len} ${len}`;
		p.style.strokeDashoffset = len;
	});
	gsap.timeline({ scrollTrigger: { trigger: map, start: 'top 85%', end: 'center 45%', scrub: 0.6 } })
		.to(roads, { strokeDashoffset: 0, stagger: 0.04, ease: 'none' }, 0)
		.from(map.querySelectorAll('.vmap__b'), { scale: 0, transformOrigin: '50% 50%', transformBox: 'fill-box', stagger: { each: 0.004, from: 'center' }, ease: 'back.out(3)' }, 0.1);

	const tl = gsap.timeline({ scrollTrigger: { trigger: map, start: 'top 55%', once: true } });
	tl.from('.vmap__pin', { y: -400, duration: 1, ease: 'bounce.out' })
		.from('.vmap__here > g:last-child', { scale: 0, rotate: -30, transformOrigin: '100% 100%', duration: 0.7, ease: 'back.out(2.5)' }, '-=0.3')
		.from('.vmap__label', { scale: 0, transformOrigin: '0% 50%', stagger: 0.08, duration: 0.6, ease: 'back.out(2.5)' }, '-=0.4')
		.add(() => gsap.to('.vmap__pin', { y: -14, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
}
