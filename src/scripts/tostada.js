/**
 * Refined procedural tostada:
 * sourdough slice (porous crumb, toasted edge, rounded crust) · smashed tomato
 * spread + cherry-tomato halves · fanned avocado crescents with skin · fried egg
 * (domed white, crispy lace edge, glossy yolk) · microgreens · chives, flaky salt,
 * cracked pepper, chili flakes.
 *
 * Local origin: bottom of the bread at y = -0.3, crumb surface at y ≈ 0.
 */
import * as THREE from 'three';

const { smoothstep, clamp } = THREE.MathUtils;
const C = (h) => new THREE.Color(h);
const mix = (a, b, t) => a.clone().lerp(b, clamp(t, 0, 1));

/* ---------- tiny deterministic noise ---------- */
function hash(x, y) {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}
function vnoise(x, y) {
	const xi = Math.floor(x), yi = Math.floor(y);
	const xf = x - xi, yf = y - yi;
	const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
	const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
	return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

/* ---------- canvas textures ---------- */
function canvasTex(size, draw, { color = true, repeat = 1 } = {}) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	draw(c.getContext('2d'), size);
	const t = new THREE.CanvasTexture(c);
	if (color) t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(repeat, repeat);
	t.anisotropy = 8;
	return t;
}

/** Sourdough crumb: irregular open pores, tinted map + matching bump. */
function crumbTextures() {
	const S = 1024;
	const pores = [];
	let seed = 11;
	const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
	for (let i = 0; i < 1500; i++) {
		const big = r() < 0.12;
		pores.push({ x: r() * S, y: r() * S, rx: big ? 7 + r() * 16 : 1.5 + r() * 6, k: 0.35 + r() * 0.5, a: r() * Math.PI });
	}
	const drawPores = (g, base, dark, light) => {
		g.fillStyle = base;
		g.fillRect(0, 0, S, S);
		// soft fibrous streaks
		for (let i = 0; i < 900; i++) {
			g.strokeStyle = light;
			g.globalAlpha = 0.18;
			g.lineWidth = 1 + r() * 2;
			const x = r() * S, y = r() * S, a = r() * Math.PI;
			g.beginPath();
			g.moveTo(x, y);
			g.quadraticCurveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a + 0.4) * 22, y + Math.sin(a + 0.4) * 22);
			g.stroke();
		}
		for (const p of pores) {
			g.globalAlpha = 0.9;
			g.fillStyle = dark;
			g.beginPath();
			g.ellipse(p.x, p.y, p.rx, p.rx * p.k, p.a, 0, Math.PI * 2);
			g.fill();
			g.globalAlpha = 0.5;
			g.fillStyle = light;
			g.beginPath();
			g.ellipse(p.x - p.rx * 0.2, p.y - p.rx * 0.25, p.rx * 0.7, p.rx * p.k * 0.5, p.a, 0, Math.PI * 2);
			g.fill();
		}
		g.globalAlpha = 1;
	};
	const map = canvasTex(S, (g) => drawPores(g, '#fff4dd', '#b98447', '#fffaf0'), { repeat: 1 });
	const bump = canvasTex(S, (g) => drawPores(g, '#d0d0d0', '#202020', '#ffffff'), { color: false, repeat: 1 });
	return { map, bump };
}

/** Crust: fine flour dust + tiny blisters (no big pores, so stretching on the sides is invisible). */
function crustTex(color = true) {
	return canvasTex(512, (g, S) => {
		g.fillStyle = color ? '#ffffff' : '#808080';
		g.fillRect(0, 0, S, S);
		for (let i = 0; i < 5000; i++) {
			const light = Math.random() < 0.35;
			g.fillStyle = color ? (light ? 'rgba(255,240,215,.55)' : 'rgba(90,40,10,.35)') : light ? '#ffffff' : '#303030';
			g.beginPath();
			g.arc(Math.random() * S, Math.random() * S, 0.6 + Math.random() * 1.8, 0, Math.PI * 2);
			g.fill();
		}
	}, { color, repeat: 3 });
}

/** Cut face of a cherry tomato: flesh ring + seed chambers. */
function tomatoFaceTex() {
	return canvasTex(256, (g, S) => {
		const c = S / 2;
		g.fillStyle = '#c81d14';
		g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
		g.fillStyle = '#e8432a';
		g.beginPath(); g.arc(c, c, c * 0.9, 0, Math.PI * 2); g.fill();
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2 + 0.3;
			g.save();
			g.translate(c + Math.cos(a) * c * 0.45, c + Math.sin(a) * c * 0.45);
			g.rotate(a);
			g.fillStyle = '#f7a35b';
			g.globalAlpha = 0.85;
			g.beginPath(); g.ellipse(0, 0, c * 0.33, c * 0.22, 0, 0, Math.PI * 2); g.fill();
			g.globalAlpha = 1;
			g.fillStyle = '#f6e3a0';
			for (let s = 0; s < 6; s++) {
				g.beginPath();
				g.ellipse((s - 2.5) * c * 0.09, Math.sin(s) * c * 0.06, c * 0.05, c * 0.03, 0.4, 0, Math.PI * 2);
				g.fill();
			}
			g.restore();
		}
		g.fillStyle = '#f08a63';
		g.beginPath(); g.arc(c, c, c * 0.14, 0, Math.PI * 2); g.fill();
	});
}

/** Avocado slice face: pale yellow core → bright green → thin dark rim. */
function avoFaceTex() {
	return canvasTex(256, (g, S) => {
		const gr = g.createLinearGradient(0, S, 0, 0);
		gr.addColorStop(0, '#b0bb2c');
		gr.addColorStop(0.35, '#8db024');
		gr.addColorStop(0.7, '#4e8817');
		gr.addColorStop(0.88, '#2b5810');
		gr.addColorStop(1, '#162d07');
		g.fillStyle = gr;
		g.fillRect(0, 0, S, S);
		for (let i = 0; i < 400; i++) {
			g.fillStyle = 'rgba(255,255,220,.12)';
			g.fillRect(Math.random() * S, Math.random() * S, 2, 1);
		}
	});
}

/* ---------- generic "blob" surface: radial top + optional bottom cap ---------- */
function blobGeo({ R, H, color, rings = 40, segs = 128, bottom = -0.0001, uvScale = 3.2, split = null }) {
	const pos = [], col = [], uv = [], idx = [];
	const add = (x, y, z, c) => {
		pos.push(x, y, z);
		col.push(c.r, c.g, c.b);
		uv.push(x / uvScale + 0.5, z / uvScale + 0.5);
		return pos.length / 3 - 1;
	};
	const rows = [];
	for (let i = 0; i <= rings; i++) {
		const t = 1 - Math.pow(1 - i / rings, 1.7); // denser near the rim
		const row = [];
		for (let j = 0; j < segs; j++) {
			const a = (j / segs) * Math.PI * 2;
			let r = R(a) * t;
			let x = Math.cos(a) * r, z = Math.sin(a) * r;
			let y = H(t, a, x, z);
			if (Array.isArray(y)) {
				r = R(a) * y[1];
				x = Math.cos(a) * r;
				z = Math.sin(a) * r;
				y = y[0];
			}
			row.push(add(x, y, z, color(t, a, x, z)));
		}
		rows.push(row);
	}
	let splitAt = -1;
	for (let i = 0; i < rings; i++) {
		if (split !== null && splitAt < 0 && 1 - Math.pow(1 - (i + 1) / rings, 1.7) > split) splitAt = idx.length;
		for (let j = 0; j < segs; j++) {
			const a = rows[i][j], b = rows[i][(j + 1) % segs], c = rows[i + 1][j], d = rows[i + 1][(j + 1) % segs];
			idx.push(a, b, c, b, d, c);
		}
	}
	if (bottom !== null) {
		const rim = rows[rings];
		const bc = color(1, 0, 0, 0);
		const center = add(0, bottom, 0, bc);
		const ring = rim.map((k) => add(pos[k * 3], bottom, pos[k * 3 + 2], bc));
		for (let j = 0; j < segs; j++) idx.push(center, ring[j], ring[(j + 1) % segs]);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	if (splitAt > 0) {
		g.addGroup(0, splitAt, 0);
		g.addGroup(splitAt, idx.length - splitAt, 1);
	}
	g.computeVertexNormals();
	return g;
}

/* ---------- shapes ---------- */
// Sourdough slice silhouette: wide oval, slightly squarer "shoulders", hand-cut wobble.
const breadR = (a) => {
	const ex = 1.42, ez = 1.0;
	const c = Math.cos(a), s = Math.sin(a);
	const sq = Math.pow(Math.abs(c) ** 2.6 + Math.abs(s) ** 2.6, -1 / 2.6); // superellipse
	return Math.hypot(c * ex, s * ez) * sq * 0.86 * (1 + 0.025 * Math.sin(a * 3 + 1.3) + 0.012 * Math.sin(a * 7 + 0.4));
};

function breadGeo() {
	const crumb = C('#f3d49a'), toast = C('#d38a3d'), deep = C('#9a521b'), crust = C('#7a3a12'), crustDk = C('#4e230a');
	const TH = 0.3;
	return blobGeo({
		R: breadR,
		rings: 72,
		bottom: -TH,
		split: 0.88,
		H: (t, a, x, z) => {
			const e = 0.88;
			if (t < e) return 0.022 * (1 - (t / e) ** 2) + (fbm(x * 3, z * 3) - 0.5) * 0.016;
			const k = (t - e) / (1 - e);
			const rc = 0.085;
			const wob = (fbm(a * 4, 1.7) - 0.5) * 0.02; // hand-cut irregularity
			if (k < 0.45) {
				const f = (k / 0.45) * Math.PI / 2;
				return [-(1 - Math.cos(f)) * rc + 0.012 * Math.sin(f * 2), e + (1 - e) * Math.sin(f)];
			}
			if (k < 0.88) {
				const u = (k - 0.45) / 0.43;
				return [-rc - u * (TH - rc - 0.045) + wob * u, 1 + 0.012 * Math.sin(u * Math.PI)];
			}
			const f = ((k - 0.88) / 0.12) * Math.PI / 2;
			return [-(TH - 0.045) - Math.sin(f) * 0.045, 1 - (1 - Math.cos(f)) * 0.035];
		},
		color: (t, a, x, z) => {
			const n = fbm(x * 2.2 + 3, z * 2.2);
			let c = mix(crumb, toast, smoothstep(t, 0.45, 0.84) * 0.85 + (n - 0.5) * 0.35);
			c = mix(c, deep, smoothstep(t, 0.82, 0.885));
			c = mix(c, crust, smoothstep(t, 0.885, 0.92));
			return mix(c, crustDk, smoothstep(t, 0.97, 1) * 0.7 + (n - 0.5) * 0.35);
		},
	});
}

function spreadGeo() {
	const red = C('#5e0703'), bright = C('#9a1208'), pulp = C('#b8260d'), seed = C('#c97a22');
	return blobGeo({
		R: (a) => breadR(a) * 0.78 * (1 + 0.05 * Math.sin(a * 9 + 1) + 0.03 * Math.sin(a * 17)),
		rings: 30,
		bottom: 0,
		H: (t, a, x, z) => (0.045 + (fbm(x * 5, z * 5) - 0.5) * 0.035) * Math.sqrt(Math.max(0, 1 - smoothstep(t, 0.82, 1))),
		color: (t, a, x, z) => {
			const n = fbm(x * 4 + 9, z * 4);
			let c = mix(red, bright, n);
			if (n > 0.66) c = mix(c, pulp, (n - 0.66) * 3);
			if (hash(Math.floor(x * 30), Math.floor(z * 30)) > 0.95) c = mix(c, seed, 0.55);
			return c;
		},
	});
}

function eggWhiteGeo() {
	const white = C('#fbf9f3'), cream = C('#efe4c8'), lace = C('#d39a48'), lace2 = C('#9a5420');
	return blobGeo({
		R: (a) => 0.58 + 0.06 * Math.sin(a * 3 + 0.5) + 0.04 * Math.sin(a * 5 + 2) + 0.025 * Math.sin(a * 11),
		rings: 36,
		bottom: 0,
		H: (t, a, x, z) => {
			const body = 0.035 + 0.075 * (1 - smoothstep(t, 0.05, 0.75));
			const ripple = (fbm(x * 6, z * 6) - 0.5) * 0.02;
			return (body + ripple) * Math.sqrt(Math.max(0, 1 - smoothstep(t, 0.9, 1)));
		},
		color: (t, a, x, z) => {
			const n = fbm(x * 9 + 1, z * 9);
			let c = mix(white, cream, smoothstep(t, 0.55, 0.85));
			c = mix(c, lace, smoothstep(t + (n - 0.5) * 0.3, 0.74, 0.9));
			return mix(c, lace2, smoothstep(t + (n - 0.5) * 0.2, 0.93, 1));
		},
	});
}

function avoSliceGeo() {
	// Lengthwise avocado slice: crescent with a narrow tip and full belly.
	const s = new THREE.Shape();
	const N = 32;
	for (let i = 0; i <= N; i++) {
		const u = i / N;
		const a = Math.PI * u;
		s[i ? 'lineTo' : 'moveTo'](-Math.cos(a) * 0.62, Math.sin(a) * 0.24 * (1 + 0.25 * u));
	}
	for (let i = N; i >= 0; i--) {
		const u = i / N;
		const a = Math.PI * u;
		s.lineTo(-Math.cos(a) * 0.5, Math.sin(a) * 0.07 * (1 + 0.4 * u));
	}
	const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 32 });
	// UVs of the caps follow the shape coordinates: normalise them to 0..1 for the texture
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.3 + 0.5, uv.getY(i) / 0.31);
	g.rotateX(-Math.PI / 2);
	g.translate(0, 0.0, 0.12);
	return g;
}

function sprigGeo() {
	const leaf = new THREE.SphereGeometry(0.06, 14, 8);
	leaf.scale(1.4, 0.12, 0.7);
	leaf.translate(0.05, 0, 0);
	return leaf;
}

/* ---------- materials (built once) ---------- */
let MAT = null;
function materials() {
	if (MAT) return MAT;
	const crumb = crumbTextures();
	MAT = {
		bread: new THREE.MeshStandardMaterial({ vertexColors: true, map: crumb.map, bumpMap: crumb.bump, bumpScale: 4, roughness: 0.9 }),
		crust: new THREE.MeshStandardMaterial({ vertexColors: true, map: crustTex(), bumpMap: crustTex(false), bumpScale: 2, roughness: 0.82 }),
		spread: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 0.35 }),
		tomSkin: new THREE.MeshPhysicalMaterial({ color: '#b3140b', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 }),
		tomFace: new THREE.MeshPhysicalMaterial({ map: tomatoFaceTex(), roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.35 }),
		avoFace: new THREE.MeshPhysicalMaterial({ map: avoFaceTex(), roughness: 0.4, clearcoat: 0.3, envMapIntensity: 0.5 }),
		avoSkin: new THREE.MeshStandardMaterial({ color: '#1f3510', roughness: 0.6 }),
		white: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: C('#ffffff') }),
		yolk: new THREE.MeshPhysicalMaterial({ color: '#ff9f0a', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#6a2e00', emissiveIntensity: 0.18, transmission: 0.05 }),
		green: new THREE.MeshStandardMaterial({ color: '#2f7a17', roughness: 0.45, side: THREE.DoubleSide }),
		stem: new THREE.MeshStandardMaterial({ color: '#cfe3a0', roughness: 0.5 }),
		bits: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
		stick: new THREE.MeshStandardMaterial({ color: '#e6c78e', roughness: 0.7 }),
	};
	return MAT;
}

export function avocadoSlice() {
	const M = materials();
	return new THREE.Mesh(avoSliceGeo(), [M.avoFace, M.avoSkin]);
}

function tomatoHalf(M, r) {
	const g = new THREE.Group();
	const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.tomSkin);
	const face = new THREE.Mesh(new THREE.CircleGeometry(r, 28), M.tomFace);
	face.rotation.x = -Math.PI / 2;
	face.position.y = 0.001;
	g.add(dome, face);
	g.scale.y = 0.75;
	return g;
}

function sprig(M) {
	const g = new THREE.Group();
	const lg = sprigGeo();
	const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.14, 5), M.stem);
	stem.rotation.z = 1.2;
	stem.position.set(-0.05, 0.02, 0);
	g.add(stem);
	[[0.02, 0.05, 0.03, 0.5], [0.03, 0.045, -0.035, -0.6]].forEach(([x, y, z, ry]) => {
		const l = new THREE.Mesh(lg, M.green);
		l.position.set(x, y, z);
		l.rotation.set(0.25, ry, 0.15);
		g.add(l);
	});
	return g;
}

/* ---------- assembly ---------- */
export function makeTostada({ pick = false, flagTex = null } = {}) {
	const M = materials();
	const root = new THREE.Group();

	const bread = new THREE.Mesh(breadGeo(), [M.bread, M.crust]);
	root.add(bread);

	const tomato = new THREE.Group();
	tomato.add(new THREE.Mesh(spreadGeo(), M.spread));
	[[0.82, 0.36, 0.16], [-0.95, -0.38, 0.15], [-0.2, -0.56, 0.13]].forEach(([x, z, r], i) => {
		const h = tomatoHalf(M, r);
		h.position.set(x, 0.045 + r * 0.75 * 0.98, z);
		h.rotation.set(0.12 * (i - 1), i * 1.7, 0.1);
		tomato.add(h);
	});
	tomato.userData.y = 0;
	root.add(tomato);

	// Avocado fan along the front edge, overlapping like shingles
	const avo = new THREE.Group();
	const ag = avoSliceGeo();
	const slices = [];
	const n = 5;
	for (let i = 0; i < n; i++) {
		const m = new THREE.Mesh(ag, [M.avoFace, M.avoSkin]);
		const u = i / (n - 1);
		m.scale.setScalar(0.72);
		m.userData.target = new THREE.Vector3(-0.62 + u * 0.62, 0.075 + i * 0.008, 0.38 - u * 0.04);
		m.rotation.set(0.42, 0.5 - u * 0.75, 0);
		m.position.copy(m.userData.target);
		avo.add(m);
		slices.push(m);
	}
	root.add(avo);

	// Fried egg resting toward the back, partly over the avocado
	const egg = new THREE.Group();
	const white = new THREE.Mesh(eggWhiteGeo(), M.white);
	const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.22, 40, 28), M.yolk);
	yolk.scale.set(1, 0.6, 1);
	yolk.position.set(0.06, 0.1, -0.02);
	egg.add(white, yolk);
	egg.position.set(0.45, 0.075, -0.25);
	egg.rotation.y = 0.4;
	egg.userData.y = 0.075;
	root.add(egg);

	// Microgreens on top
	const garnish = new THREE.Group();
	[[0.85, 0, -0.55, 0.4], [-0.45, 0, -0.1, 2.1], [0.2, 0, 0.05, 4.2], [-0.7, 0, 0.42, 1]].forEach(([x, y, z, r]) => {
		const s = sprig(M);
		s.position.set(x, y, z);
		s.rotation.y = r;
		garnish.add(s);
	});
	root.add(garnish);

	// Raycast later to drop toppings exactly onto whatever surface is below
	root.updateMatrixWorld(true);
	const surfaces = [bread, ...tomato.children, ...slices, white, yolk].flatMap((o) => (o.isMesh ? [o] : o.children.filter((c) => c.isMesh)));
	const ray = new THREE.Raycaster();
	const down = new THREE.Vector3(0, -1, 0);
	const surfaceY = (x, z) => {
		ray.set(new THREE.Vector3(x, 3, z), down);
		const hit = ray.intersectObjects(surfaces, false)[0];
		return hit ? hit.point.y : 0.05;
	};
	garnish.children.forEach((s) => (s.position.y = surfaceY(s.position.x, s.position.z) + 0.012));

	// Toppings: flaky salt, cracked pepper, chili flakes, chives (instanced)
	const kinds = [
		{ n: 9, c: C('#f4f1ea'), s: [0.034, 0.008, 0.028] },
		{ n: 34, c: C('#1d1612'), s: [0.018, 0.014, 0.016] },
		{ n: 14, c: C('#d8321a'), s: [0.03, 0.007, 0.02] },
		{ n: 18, c: C('#3f8a22'), s: [0.013, 0.013, 0.09] },
	];
	const N = kinds.reduce((a, k) => a + k.n, 0);
	const flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.bits, N);
	const fData = [];
	let i = 0;
	for (const k of kinds) {
		for (let j = 0; j < k.n; j++, i++) {
			let x, z;
			do {
				x = (Math.random() - 0.5) * 2.2;
				z = (Math.random() - 0.5) * 1.5;
			} while (Math.hypot(x / 1.15, z / 0.78) > 1);
			const t = new THREE.Vector3(x, surfaceY(x, z) + k.s[1] * 0.5, z);
			const jitter = 0.75 + Math.random() * 0.5;
			fData.push({ t, d: Math.random() * 0.6, r: Math.random() * 6, s: new THREE.Vector3(k.s[0] * jitter, k.s[1], k.s[2] * jitter) });
			flakes.setColorAt(i, k.c);
		}
	}
	flakes.instanceColor.needsUpdate = true;
	const dummy = new THREE.Object3D();
	fData.forEach((f, k) => {
		dummy.position.copy(f.t);
		dummy.rotation.set(0, f.r, 0);
		dummy.scale.copy(f.s);
		dummy.updateMatrix();
		flakes.setMatrixAt(k, dummy.matrix);
	});
	root.add(flakes);

	const o = { root, bread, tomato, avo, slices, egg, yolk, garnish, flakes, fData };

	if (pick) {
		const p = new THREE.Group();
		const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 2.6, 12), M.stick);
		stick.position.y = 1.3;
		const fg = new THREE.PlaneGeometry(1.2, 0.66, 32, 6);
		const fp = fg.attributes.position;
		for (let k = 0; k < fp.count; k++) {
			const x = fp.getX(k) + 0.6;
			fp.setZ(k, Math.sin(x * 3.4) * 0.07 * x);
		}
		fg.computeVertexNormals();
		const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.6 }));
		flag.position.set(0.62, 2.22, 0);
		p.add(stick, flag);
		p.position.set(-0.42, -0.1, -0.15);
		p.rotation.z = -0.05;
		root.add(p);
		o.pick = p;
		o.flag = flag;
	}
	return o;
}
