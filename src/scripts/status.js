/** Live open/closed status + highlights today's row in the hours list. */
const HOURS = { 0: [9, 15], 1: [7.5, 17], 2: [7.5, 17], 3: [7.5, 17], 4: [7.5, 17], 5: [7.5, 17], 6: [9, 15] };
const fmt = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function initStatus() {
	const now = new Date();
	const d = now.getDay();
	const t = now.getHours() + now.getMinutes() / 60;
	const [o, c] = HOURS[d];
	let short, long, open = true;
	if (t < o) {
		short = `Open today from ${fmt(o)}`;
		long = `Today from ${fmt(o)}`;
	} else if (t < c) {
		short = `Open now · until ${fmt(c)}`;
		long = `Open now until ${fmt(c)}`;
	} else {
		open = false;
		const n = HOURS[(d + 1) % 7][0];
		short = `Closed · opens tomorrow ${fmt(n)}`;
		long = `Back tomorrow from ${fmt(n)}`;
	}
	document.querySelectorAll('[data-status-short]').forEach((el) => (el.textContent = short));
	document.querySelectorAll('[data-status-long]').forEach((el) => (el.textContent = long));
	document.querySelectorAll('[data-status-dot]').forEach((el) => el.classList.toggle('is-closed', !open));
	document.querySelectorAll('[data-days]').forEach((el) => el.classList.toggle('is-today', el.dataset.days.split(',').includes(String(d))));
}
