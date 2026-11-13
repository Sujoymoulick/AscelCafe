/**
 * Footer: tostadas, mugs & churros rain down and pile up (tiny 2D physics).
 * Pointer pushes them around; a click tosses one back up.
 */
export function initRain(state, sprites) {
	const canvas = document.querySelector('[data-rain]');
	const section = canvas?.closest('.s-end');
	if (!canvas || !section) return;
	const ctx = canvas.getContext('2d');
	const dpr = Math.min(devicePixelRatio, 2);
	let W = 0, H = 0, R = 60;
	const bodies = [];
	const pointer = { x: -999, y: -999, vx: 0, vy: 0, on: false };

	if (!sprites?.length) sprites = fallbackSprites();

	const resize = () => {
		W = section.clientWidth;
		H = section.clientHeight;
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		R = Math.max(34, Math.min(80, W / 18));
	};
	resize();
	new ResizeObserver(resize).observe(section);

	const max = () => (W < 700 ? 18 : 34);
	let spawnT = 0;
	const spawn = () => {
		const s = sprites[(Math.random() * sprites.length) | 0];
		const r = R * (0.8 + Math.random() * 0.4);
		bodies.push({ x: r + Math.random() * (W - 2 * r), y: -r * 2, vx: (Math.random() - 0.5) * 2, vy: 0, a: Math.random() * 6, va: 0, r, s });
	};
	state.rain.reset = () => (bodies.length = 0);

	section.addEventListener('pointermove', (e) => {
		const b = section.getBoundingClientRect();
		const x = e.clientX - b.left;
		const y = e.clientY - b.top;
		pointer.vx = x - pointer.x;
		pointer.vy = y - pointer.y;
		pointer.x = x;
		pointer.y = y;
		pointer.on = true;
	});
	section.addEventListener('pointerleave', () => (pointer.on = false));
	section.addEventListener('pointerdown', (e) => {
		const b = section.getBoundingClientRect();
		const x = e.clientX - b.left;
		const y = e.clientY - b.top;
		bodies.forEach((o) => {
			const d = Math.hypot(o.x - x, o.y - y);
			if (d < o.r * 1.6) {
				o.vy = -18 - Math.random() * 6;
				o.vx += (o.x - x) * 0.2;
				o.va = (Math.random() - 0.5) * 0.6;
			}
		});
	});

	let visible = false;
	new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(section);

	const step = () => {
		requestAnimationFrame(step);
		if (!visible) return;
		if (state.rain.active && bodies.length < max() && (spawnT -= 1) <= 0) {
			spawn();
			spawnT = 9 + Math.random() * 10;
		}
		const g = 0.55;
		for (const o of bodies) {
			o.vy += g;
			o.vx *= 0.995;
			o.x += o.vx;
			o.y += o.vy;
			o.a += o.va;
			o.va *= 0.98;
			if (pointer.on) {
				const dx = o.x - pointer.x;
				const dy = o.y - pointer.y;
				const d = Math.hypot(dx, dy);
				if (d < o.r * 1.3 && d > 0.01) {
					const f = (o.r * 1.3 - d) / (o.r * 1.3);
					o.vx += (dx / d) * f * 3 + pointer.vx * 0.05;
					o.vy += (dy / d) * f * 3 + pointer.vy * 0.05;
					o.va += pointer.vx * 0.002;
				}
			}
			if (o.y > H - o.r) {
				o.y = H - o.r;
				o.vy *= -0.32;
				o.vx *= 0.9;
				o.va = o.vx / o.r;
			}
			if (o.x < o.r) { o.x = o.r; o.vx *= -0.5; }
			if (o.x > W - o.r) { o.x = W - o.r; o.vx *= -0.5; }
		}
		// circle-circle collisions
		for (let k = 0; k < 2; k++) {
			for (let i = 0; i < bodies.length; i++) {
				for (let j = i + 1; j < bodies.length; j++) {
					const a = bodies[i], b = bodies[j];
					const dx = b.x - a.x, dy = b.y - a.y;
					const min = (a.r + b.r) * 0.86;
					const d2 = dx * dx + dy * dy;
					if (d2 < min * min && d2 > 0.0001) {
						const d = Math.sqrt(d2);
						const o = (min - d) / 2;
						const nx = dx / d, ny = dy / d;
						a.x -= nx * o; a.y -= ny * o;
						b.x += nx * o; b.y += ny * o;
						const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
						if (rv < 0) {
							const imp = -rv * 0.6;
							a.vx -= nx * imp; a.vy -= ny * imp;
							b.vx += nx * imp; b.vy += ny * imp;
							a.va -= ny * imp * 0.01; b.va += ny * imp * 0.01;
						}
					}
				}
			}
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		for (const o of bodies) {
			const size = o.r / o.s.r;
			ctx.save();
			ctx.translate(o.x, o.y);
			ctx.rotate(o.a);
			ctx.drawImage(o.s.img, -size / 2, -size / 2, size, size);
			ctx.restore();
		}
	};
	requestAnimationFrame(step);
}

function fallbackSprites() {
	const mk = (draw) => {
		const c = document.createElement('canvas');
		c.width = c.height = 200;
		draw(c.getContext('2d'));
		return { img: c, r: 0.42 };
	};
	return [
		mk((g) => {
			g.fillStyle = '#d99a4e';
			g.beginPath(); g.roundRect(30, 50, 140, 100, 24); g.fill();
			g.fillStyle = '#93bf3a';
			g.beginPath(); g.ellipse(100, 100, 50, 30, 0, 0, 7); g.fill();
			g.fillStyle = '#fff'; g.beginPath(); g.arc(100, 100, 22, 0, 7); g.fill();
			g.fillStyle = '#ffa10f'; g.beginPath(); g.arc(100, 100, 11, 0, 7); g.fill();
		}),
		mk((g) => {
			g.fillStyle = '#f3eee2'; g.beginPath(); g.roundRect(55, 50, 90, 110, 16); g.fill();
			g.fillStyle = '#b4173a'; g.fillRect(55, 95, 90, 22);
		}),
	];
}
