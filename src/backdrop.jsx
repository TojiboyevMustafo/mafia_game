import { useMemo } from 'react';

// Qora kino (noir) shahar: oy, binolar, ko'cha chirog'i va shlyapali mafioz siluet.
// Hammasi original SVG — tashqi rasm kerak emas, tez yuklanadi.
function Skyline({ seed, base, minH, maxH, fill, winOpacity, wins }) {
  const items = useMemo(() => {
    let s = seed;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const out = [];
    let x = -12;
    while (x < 412) {
      const w = 26 + r() * 34, h = minH + r() * (maxH - minH), win = [];
      if (wins) for (let wy = base - h + 10; wy < base - 8; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() > 0.62) win.push([wx, wy]);
      out.push({ x, w, h, win, ant: r() > 0.8 });
      x += w + r() * 3;
    }
    return out;
  }, [seed, base, minH, maxH, wins]);
  return (
    <g>
      {items.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={base - b.h} width={b.w} height={b.h + 2} fill={fill} />
          {b.ant && <path d={`M${b.x + b.w / 2} ${base - b.h} v-16`} stroke={fill} strokeWidth="1.4" />}
          {b.win.map(([wx, wy], j) => <rect key={j} x={wx} y={wy} width="3.5" height="5" fill="var(--win)" opacity={winOpacity} />)}
        </g>
      ))}
    </g>
  );
}

export function Backdrop() {
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky1)' }} /><stop offset=".55" style={{ stopColor: 'var(--sky2)' }} /><stop offset="1" style={{ stopColor: 'var(--sky3)' }} />
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%"><stop offset="0" style={{ stopColor: 'var(--moon)', stopOpacity: 0.5 }} /><stop offset="1" style={{ stopColor: 'var(--moon)', stopOpacity: 0 }} /></radialGradient>
        <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07040c" stopOpacity="0" /><stop offset="1" stopColor="#07040c" stopOpacity=".95" /></linearGradient>
        <linearGradient id="blind" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id="neon" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ff2a4d" stopOpacity=".7" /><stop offset="1" stopColor="#ff2a4d" stopOpacity="0" /></radialGradient>
        <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd98a" stopOpacity=".38" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
        <radialGradient id="ember" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ff8a3d" stopOpacity=".9" /><stop offset="1" stopColor="#ff8a3d" stopOpacity="0" /></radialGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sky)" />
      <circle cx="298" cy="175" r="150" fill="url(#moonGlow)" />
      <circle cx="298" cy="175" r="50" style={{ fill: 'var(--moon)' }} opacity=".95" />
      <circle cx="284" cy="164" r="8" fill="#000" opacity=".08" /><circle cx="312" cy="190" r="12" fill="#000" opacity=".07" />

      <Skyline seed={11} base={600} minH={90} maxH={230} fill="#1a0a24" winOpacity=".55" wins />
      <Skyline seed={29} base={660} minH={80} maxH={190} fill="#0d0513" winOpacity=".75" wins />

      {/* qizil neon belgi */}
      <circle cx="78" cy="522" r="40" fill="url(#neon)" />
      <rect x="58" y="516" width="40" height="11" rx="3" fill="#ff2a4d" opacity=".9" />

      {/* venetsian jalyuzi nuri */}
      <g opacity=".07" transform="rotate(-18 200 300)">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={-120 + i * 78} y="-80" width="30" height="720" fill="url(#blind)" />)}
      </g>

      {/* ko'cha chirog'i */}
      <g>
        <polygon points="40,300 -10,690 90,690" fill="url(#lampCone)" />
        <rect x="38" y="296" width="4" height="420" fill="#050209" />
        <path d="M40 298 q14 -22 38 -14" stroke="#050209" strokeWidth="4" fill="none" />
        <circle cx="80" cy="287" r="14" fill="#ffd98a" opacity=".25" /><circle cx="80" cy="287" r="5" fill="#ffe7ae" />
      </g>

      <rect y="620" width="400" height="180" fill="url(#fog)" />

      {/* shlyapali mafioz */}
      <g transform="translate(268 478)">
        <path d="M-62 120 C-66 66 -42 46 0 46 C42 46 66 66 62 120 L74 400 L-74 400 Z" fill="#050209" stroke="var(--rim)" strokeOpacity=".55" strokeWidth="1.2" />
        <path d="M0 46 L-24 128 L0 106 L24 128 Z" fill="#12081a" />
        <path d="M-10 48 L0 62 L10 48 Z" fill="#e9dcc3" opacity=".85" />
        <path d="M0 58 L-6 76 L0 126 L6 76 Z" fill="#8b1230" />
        <ellipse cx="0" cy="22" rx="22" ry="27" fill="#0a050f" stroke="var(--rim)" strokeOpacity=".5" strokeWidth="1" />
        <rect x="-10" y="42" width="20" height="10" fill="#0a050f" />
        <ellipse cx="0" cy="-2" rx="52" ry="9" fill="#050209" stroke="var(--rim)" strokeOpacity=".6" strokeWidth="1.2" />
        <path d="M-32 -2 C-34 -38 34 -38 32 -2Z" fill="#050209" stroke="var(--rim)" strokeOpacity=".5" strokeWidth="1" />
        <path d="M-32 -6 C-18 0 18 0 32 -6 L32 -12 C18 -6 -18 -6 -32 -12Z" fill="#8b1230" />
        <path d="M-12 20 h8 M4 20 h8" stroke="#ff2a4d" strokeWidth="2.4" strokeLinecap="round" opacity=".9" />
        <path d="M10 38 L42 42" stroke="#e9dcc3" strokeWidth="3" strokeLinecap="round" />
        <circle cx="43" cy="42" r="14" fill="url(#ember)" /><circle cx="43" cy="42" r="2.6" fill="#ff8a3d" />
        <path d="M45 36 C60 14 32 4 50 -26 C58 -40 44 -52 56 -70" stroke="#fff" strokeOpacity=".2" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
