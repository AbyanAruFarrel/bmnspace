// Input jam format 24 jam (00–23) yang konsisten di semua perangkat, tanpa AM/PM.
// Dua pilihan: jam dan menit. Nilai selalu berbentuk "HH:MM" (atau "" jika belum dipilih).
// min/max membatasi pilihan; step = kelipatan menit yang ditawarkan.
const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };

export default function TimeInput24({ value = "", onChange, min = "00:00", max = "23:59", step = 5, required = false, disabled = false, name }) {
  const [h, m] = value ? value.split(":") : ["", ""];
  const lo = toMin(min), hi = toMin(max);
  const minutesFor = (hh) => {
    const out = [];
    for (let mm = 0; mm < 60; mm += step) {
      const t = Number(hh) * 60 + mm;
      if (t >= lo && t <= hi) out.push(pad(mm));
    }
    return out;
  };
  const hours = [];
  for (let hh = Math.floor(lo / 60); hh <= Math.floor(hi / 60); hh++) if (minutesFor(hh).length) hours.push(pad(hh));

  const emit = (hh, mm) => onChange(hh && mm ? `${hh}:${mm}` : hh ? `${hh}:${minutesFor(hh)[0] ?? "00"}` : "");
  const changeHour = (e) => {
    const hh = e.target.value;
    if (!hh) return onChange("");
    const ok = minutesFor(hh);
    emit(hh, ok.includes(m) ? m : ok[0]);
  };

  return (
    <div className="t24" role="group">
      <select name={name} aria-label="Jam" value={hours.includes(h) ? h : ""} onChange={changeHour} required={required} disabled={disabled}>
        <option value="">--</option>
        {hours.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label="Menit" value={h && minutesFor(h).includes(m) ? m : ""} onChange={(e) => emit(h, e.target.value)} required={required} disabled={disabled || !h}>
        {!h && <option value="">--</option>}
        {h && minutesFor(h).map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}
