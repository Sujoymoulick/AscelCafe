/**
 * Procedural 3D food (Three.js): a tostada that builds itself, a mug of hot
 * chocolate with churros, and little floating ingredients for the hero.
 * GSAP writes progress values into `state`; each frame reads them.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeTostada as buildTostada, avocadoSlice } from './tostada.js';

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const E = {
	bounce: gsap.parseEase('bounce.out'),
	back: gsap.parseEase('back.out(1.8)'),
	out: gsap.parseEase('power3.out'),
	inout: gsap.parseEase('power2.inOut'),
};

/* ---------- textures ---------- */
function canvasTex(w, h, draw, repeat = 1) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	draw(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(repeat, repeat);
	t.anisotropy = 4;
	return t;
}
function speckle(base, dots, n = 1400, size = [0.6, 2.6]) {
	return canvasTex(256, 256, (g, w, h) => {
		g.fillStyle = base;
		g.fillRect(0, 0, w, h);
		for (let i = 0; i < n; i++) {
			g.fillStyle = dots[i % dots.length];
			g.globalAlpha = 0.2 + Math.random() * 0.55;
			const r = size[0] + Math.random() * (size[1] - size[0]);
			g.beginPath();
			g.ellipse(Math.random() * w, Math.random() * h, r, r * (0.4 + Math.random() * 0.6), Math.random() * 3, 0, Math.PI * 2);
			g.fill();
		}
	});
}
function blobShadow() {
	return canvasTex(128, 128, (g) => {
		const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
		r.addColorStop(0, 'rgba(20,10,10,.55)');
		r.addColorStop(1, 'rgba(20,10,10,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, 128, 128);
	});
}

/* ---------- materials (shared) ---------- */
function materials() {
	const breadTex = speckle('#f4dcae', ['#c98a46', '#a8652b', '#fff1d0', '#8a4d1c'], 2200, [0.5, 2.2]);
	return {
		bread: new THREE.MeshStandardMaterial({ vertexColors: true, map: breadTex, bumpMap: breadTex, bumpScale: 3, roughness: 0.88 }),
		tomato: new THREE.MeshPhysicalMaterial({ map: speckle('#d8321f', ['#ff6a3d', '#a51b12', '#ffb347'], 900, [1, 4]), roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.4 }),
		avo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 }),
		white: new THREE.MeshPhysicalMaterial({ color: '#fbf8f0', roughness: 0.35, clearcoat: 0.4 }),
		yolk: new THREE.MeshPhysicalMaterial({ color: '#ffa10f', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#5a2a00', emissiveIntensity: 0.15 }),
		flake: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
		stick: new THREE.MeshStandardMaterial({ color: '#e6c78e', roughness: 0.7 }),
		slate: new THREE.MeshStandardMaterial({ map: speckle('#2f3237', ['#45494f', '#1f2125', '#5a5e64'], 3000, [0.4, 1.8]), roughness: 0.92 }),
		mug: new THREE.MeshPhysicalMaterial({ color: '#f3eee2', roughness: 0.3, clearcoat: 0.7, side: THREE.DoubleSide }),
		mugBand: new THREE.MeshPhysicalMaterial({ color: '#b4173a', roughness: 0.3, clearcoat: 0.7 }),
		cocoa: new THREE.MeshPhysicalMaterial({ color: '#4a1d0b', roughness: 0.18, clearcoat: 1 }),
		churro: new THREE.MeshStandardMaterial({ map: speckle('#c67a33', ['#fff7e6', '#fff', '#9b5520'], 1600, [0.6, 2]), roughness: 0.7 }),
		bean: new THREE.MeshPhysicalMaterial({ color: '#3d1e0f', roughness: 0.35, clearcoat: 0.6 }),
		cherry: new THREE.MeshPhysicalMaterial({ color: '#d92e1d', roughness: 0.2, clearcoat: 1 }),
		leaf: new THREE.MeshStandardMaterial({ color: '#3f7d23', roughness: 0.5 }),
		sugar: new THREE.MeshStandardMaterial({ map: speckle('#fffdf7', ['#e9e2d2', '#ffffff'], 800, [0.5, 1.5]), roughness: 0.75 }),
		shadow: new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false }),
	};
}

/* ---------- geometry builders ---------- */
function churroGeo(len = 1.9) {
	const s = new THREE.Shape();
	const n = 8;
	for (let i = 0; i <= n * 2; i++) {
		const a = (i / (n * 2)) * Math.PI * 2;
		const r = i % 2 ? 0.115 : 0.165;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		i ? s.lineTo(x, y) : s.moveTo(x, y);
	}
	const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.03, bevelSegments: 3 });
	g.translate(0, 0, -len / 2);
	return g;
}
function flagTex() {
	return canvasTex(512, 280, (g, w, h) => {
		g.fillStyle = '#b4173a';
		g.fillRect(0, 0, w, h);
		g.fillStyle = '#f1ede2';
		g.font = '900 104px Archivo, "Arial Black", sans-serif';
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.save();
		g.translate(w / 2, h / 2 + 8);
		g.scale(0.78, 1.15);
		g.fillText('ASCELCAFE', 0, 0);
		g.restore();
	});
}

/* ---------- objects ---------- */
const makeTostada = (M, opts = {}) => buildTostada({ ...opts, flagTex: opts.pick ? flagTex() : null });

function makeMug(M) {
	const g = new THREE.Group();
	const pts = [
		[0, 0], [0.62, 0], [0.7, 0.04], [0.74, 0.2], [0.8, 1.3], [0.84, 1.36], [0.76, 1.36], [0.7, 0.24], [0.6, 0.14], [0, 0.14],
	].map(([x, y]) => new THREE.Vector2(x, y));
	const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.mug);
	const band = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.765, 0.26, 48, 1, true), M.mugBand);
	band.position.y = 0.95;
	const cocoa = new THREE.Mesh(new THREE.CircleGeometry(0.77, 48), M.cocoa);
	cocoa.rotation.x = -Math.PI / 2;
	cocoa.position.y = 1.18;
	const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.085, 14, 30, Math.PI * 1.1), M.mug);
	handle.rotation.z = -Math.PI / 2 - 0.05;
	handle.position.set(0.8, 0.68, 0);
	g.add(body, band, cocoa, handle);
	const churros = [];
	const cg = churroGeo(2);
	[[-0.18, 0.15, -0.4, 0.35], [0.2, -0.12, 0.3, -0.25]].forEach(([x, z, rx, rz]) => {
		const c = new THREE.Mesh(cg, M.churro);
		c.rotation.set(Math.PI / 2 + rx, 0, rz);
		c.userData.target = new THREE.Vector3(x, 1.7, z);
		c.position.copy(c.userData.target);
		g.add(c);
		churros.push(c);
	});
	return { root: g, churros };
}

function makeFloaters(M) {
	const list = [];
	const add = (mesh, x, y, z, s, speed) => {
		mesh.userData = { base: new THREE.Vector3(x, y, z), s, speed, ph: Math.random() * 6, spin: (Math.random() - 0.5) * 0.8 };
		mesh.scale.setScalar(s);
		list.push(mesh);
	};
	const bean = new THREE.SphereGeometry(0.2, 24, 16);
	bean.scale(1, 0.62, 1.45);
	const cherry = new THREE.SphereGeometry(0.22, 24, 16);
	const sugar = new RoundedBoxGeometry(0.34, 0.34, 0.34, 3, 0.05);
	const ch = churroGeo(1.1);

	add(new THREE.Mesh(bean, M.bean), -3.6, 1.4, 0.4, 1.2, 0.9);
	add(new THREE.Mesh(bean, M.bean), 3.9, -0.4, 0.8, 1, 1.1);
	add(new THREE.Mesh(bean, M.bean), 2.6, 2.3, -1, 0.9, 0.7);
	const tom = (x, y, z, s) => {
		const g = new THREE.Group();
		g.add(new THREE.Mesh(cherry, M.cherry));
		const l = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 5), M.leaf);
		l.position.y = 0.22;
		g.add(l);
		add(g, x, y, z, s, 0.8);
	};
	tom(-4.2, -1.2, 1, 1.3);
	tom(4.4, 1.6, 0.2, 1.1);
	add(avocadoSlice(), -2.9, -2.1, 1.6, 1.2, 0.6);
	add(new THREE.Mesh(sugar, M.sugar), 3.2, -2.2, 1.4, 1, 0.75);
	add(new THREE.Mesh(sugar, M.sugar), -4.6, 0.3, -0.8, 0.8, 1);
	add(new THREE.Mesh(ch, M.churro), 4.9, 0.4, -1.2, 1, 0.5);
	return list;
}

/* ---------- views ---------- */
function makeView(el, { fov = 30 } = {}) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.08;
	el.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environmentIntensity = 0.55;
	scene.add(new THREE.HemisphereLight('#fff6e8', '#8a4a2a', 1.05));
	const key = new THREE.DirectionalLight('#fff1dc', 2.6);
	key.position.set(4, 7, 5);
	const fill = new THREE.DirectionalLight('#ffcfa0', 0.9);
	fill.position.set(-5, 2, 3);
	const rim = new THREE.DirectionalLight('#ffffff', 1.4);
	rim.position.set(0, 4, -6);
	scene.add(key, fill, rim);

	const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
	const view = { el, renderer, scene, camera, visible: false, aspect: 1 };
	const size = () => {
		const w = el.clientWidth || 1;
		const h = el.clientHeight || 1;
		renderer.setSize(w, h, false);
		camera.aspect = view.aspect = w / h;
		camera.updateProjectionMatrix();
		view.onResize?.();
	};
	size();
	new ResizeObserver(size).observe(el);
	new IntersectionObserver(([e]) => (view.visible = e.isIntersecting), { rootMargin: '100px' }).observe(el);
	return view;
}

/* ---------- stage ---------- */
export function createStage(state) {
	const M = materials();
	const views = [];

	/* HERO */
	const heroEl = document.querySelector('[data-view="hero"]');
	if (heroEl) {
		const v = makeView(heroEl);
		const t = makeTostada(M, { pick: true });
		const g = new THREE.Group();
		g.add(t.root);
		v.scene.add(g);
		const floaters = makeFloaters(M);
		floaters.forEach((f) => v.scene.add(f));
		v.onResize = () => {
			const d = Math.max(12, 12.5 / Math.max(v.aspect, 0.4));
			v.camera.position.set(0, 2.4, d);
			v.camera.lookAt(0, 0.4, 0);
		};
		v.onResize();
		v.update = (time) => {
			const h = state.hero;
			const e = h.enter;
			const eb = E.back(clamp(e, 0, 1));
			g.scale.setScalar(1.4 * Math.max(0.001, eb));
			g.position.y = -0.85 + (1 - E.out(e)) * -3 + h.p * 3.2;
			g.rotation.y = (1 - E.out(e)) * -2.6 + Math.sin(time * 0.35) * 0.25 + h.mx * 0.45 + h.p * 1.5;
			g.rotation.x = 0.28 + h.my * 0.12;
			g.rotation.z = Math.sin(time * 0.6) * 0.03;
			if (t.flag) t.flag.rotation.y = Math.sin(time * 2.2) * 0.12;
			floaters.forEach((f, i) => {
				const u = f.userData;
				const k = clamp(e * 1.4 - i * 0.04, 0, 1);
				f.scale.setScalar(u.s * Math.max(0.001, E.back(k)));
				f.position.set(
					u.base.x + h.mx * (0.3 + u.base.z * 0.25),
					u.base.y + Math.sin(time * u.speed + u.ph) * 0.18 - h.my * 0.2 + h.p * (2 + i * 0.25),
					u.base.z,
				);
				f.rotation.x = time * u.spin + u.ph;
				f.rotation.y = time * u.spin * 0.7;
			});
		};
		views.push(v);
	}

	/* BUILD */
	const buildEl = document.querySelector('[data-view="build"]');
	if (buildEl) {
		const v = makeView(buildEl, { fov: 32 });
		const board = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.16, 2.9, 4, 0.05), M.slate);
		board.position.y = -0.38;
		board.rotation.y = -0.12;
		const boardShadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), M.shadow);
		boardShadow.rotation.x = -Math.PI / 2;
		boardShadow.position.y = -0.62;
		boardShadow.material = M.shadow.clone();
		boardShadow.material.opacity = 0.5;
		v.scene.add(board, boardShadow);

		const t = makeTostada(M);
		const tg = new THREE.Group();
		tg.add(t.root);
		const tShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8), M.shadow.clone());
		tShadow.rotation.x = -Math.PI / 2;
		tShadow.position.y = -0.29;
		tg.add(tShadow);
		v.scene.add(tg);

		const mug = makeMug(M);
		const mg = new THREE.Group();
		mg.add(mug.root);
		mug.root.position.y = -0.3;
		const mShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), M.shadow.clone());
		mShadow.rotation.x = -Math.PI / 2;
		mShadow.position.y = -0.29;
		mg.add(mShadow);
		v.scene.add(mg);

		const dummy = new THREE.Object3D();
		v.onResize = () => {
			const small = v.aspect < 1;
			const d = Math.max(8, 10.5 / Math.max(v.aspect, 0.4));
			v.camera.position.set(small ? 0 : -0.6, 4.4, d);
			v.camera.lookAt(small ? 0 : -0.6, 0.1, 0);
			v.scene.position.set(small ? 0 : 0.9, small ? 0.2 : -0.1, 0);
		};
		v.onResize();

		v.update = (time) => {
			const p = state.build.p;
			// bread drops with a bounce
			const kb = seg(p, 0.02, 0.12);
			t.bread.visible = kb > 0;
			t.bread.position.y = (1 - E.bounce(kb)) * 6;
			tShadow.material.opacity = kb * 0.75;
			// tomato spreads
			const kt = seg(p, 0.14, 0.3);
			t.tomato.visible = kt > 0;
			const st = E.out(kt);
			t.tomato.scale.set(0.12 + 0.88 * st, 1, 0.12 + 0.88 * st);
			t.tomato.position.y = t.tomato.userData.y + (1 - st) * 0.6;
			// avocado slices fan in
			t.slices.forEach((s, i) => {
				const k = seg(p, 0.36 + i * 0.012, 0.42 + i * 0.012);
				s.visible = k > 0;
				s.position.y = s.userData.target.y + (1 - E.back(k)) * 4;
				s.rotation.z = (1 - k) * 1.2;
			});
			// egg drops & wobbles
			const ke = seg(p, 0.46, 0.56);
			t.egg.visible = ke > 0;
			t.egg.position.y = t.egg.userData.y + (1 - E.bounce(ke)) * 5;
			const wob = Math.sin(ke * Math.PI * 3) * (1 - ke) * 0.25;
			t.egg.scale.set(1 + wob, 1 - wob, 1 + wob);
			// salt & pepper rain
			const ks = seg(p, 0.57, 0.67);
			t.fData.forEach((f, i) => {
				const k = clamp((ks - f.d * 0.6) / 0.4, 0, 1);
				dummy.position.set(f.t.x, lerp(f.t.y + 3, f.t.y, E.out(k)), f.t.z);
				dummy.rotation.set(f.r * (1 - k), f.r, 0);
				dummy.scale.copy(f.s).multiplyScalar(k > 0 ? 1 : 0.0001);
				dummy.updateMatrix();
				t.flakes.setMatrixAt(i, dummy.matrix);
			});
			t.flakes.instanceMatrix.needsUpdate = true;
			const kg = E.back(seg(p, 0.6, 0.68));
			t.garnish.visible = kg > 0;
			t.garnish.children.forEach((g) => g.scale.setScalar(Math.max(0.001, kg)));
			// whole tostada: showcase spin, then exit left for the twist
			const kx = E.inout(seg(p, 0.8, 0.88));
			tg.position.x = -kx * 9;
			tg.rotation.y = -0.35 + E.inout(seg(p, 0.64, 0.8)) * Math.PI * 2 + Math.sin(time * 0.5) * 0.06;
			tg.rotation.z = kx * 0.4;
			tg.visible = kx < 1;
			// mug slides in, churros drop
			const km = seg(p, 0.83, 0.92);
			mg.visible = km > 0;
			mg.position.x = (1 - E.back(km)) * 9;
			mg.rotation.y = -0.6 + (1 - km) * -1.2 + Math.sin(time * 0.6) * 0.08;
			mug.churros.forEach((c, i) => {
				const k = seg(p, 0.9 + i * 0.025, 0.96 + i * 0.025);
				c.visible = k > 0;
				c.position.y = c.userData.target.y + (1 - E.bounce(k)) * 4;
			});
		};
		views.push(v);
	}

	const sprites = makeSprites(M);

	gsap.ticker.add((time) => {
		for (const v of views) {
			if (!v.visible) continue;
			v.update?.(time);
			v.renderer.render(v.scene, v.camera);
		}
	});

	return { views, sprites };
}

/* ---------- 2D sprites for the footer rain (rendered once) ---------- */
function makeSprites(M) {
	const S = 220;
	const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
	r.setSize(S, S, false);
	r.setPixelRatio(1);
	r.outputColorSpace = THREE.SRGBColorSpace;
	r.toneMapping = THREE.ACESFilmicToneMapping;
	const scene = new THREE.Scene();
	const pm = new THREE.PMREMGenerator(r);
	scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environmentIntensity = 0.55;
	scene.add(new THREE.HemisphereLight('#fff6e8', '#8a4a2a', 1.4));
	const key = new THREE.DirectionalLight('#fff1dc', 2.6);
	key.position.set(3, 6, 5);
	scene.add(key);
	const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
	const out = [];
	const snap = (obj, dist, rx, ry, radius) => {
		scene.add(obj);
		obj.rotation.set(rx, ry, 0);
		cam.position.set(0, 0, dist);
		cam.lookAt(0, 0, 0);
		r.render(scene, cam);
		const c = document.createElement('canvas');
		c.width = c.height = S;
		c.getContext('2d').drawImage(r.domElement, 0, 0);
		out.push({ img: c, r: radius });
		scene.remove(obj);
	};
	const t = makeTostada(M);
	t.root.position.y = -0.25;
	const tg = new THREE.Group().add(t.root);
	snap(tg, 8, 0.9, 0.4, 0.5);
	snap(tg, 8, 0.4, -0.6, 0.5);
	const mug = makeMug(M);
	mug.root.position.y = -0.9;
	snap(new THREE.Group().add(mug.root), 7.5, 0.25, -0.5, 0.42);
	const c = new THREE.Mesh(churroGeo(1.8), M.churro);
	snap(c, 6, 0.3, 1.2, 0.36);
	r.dispose();
	return out;
}
