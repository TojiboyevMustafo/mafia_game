// Mafia stol o'yini uslubidagi rol kartalari (original SVG rasmlar)
const PAL = {
  mafia: { a: '#ff3b4e', b: '#7f1d2d', c: '#1a050c', name: 'MAFIYA', fs: 19, lines: ['Tunda yashirincha o‘ldirasiz.', 'Fosh bo‘lmang!'] },
  doctor: { a: '#34d399', b: '#0f766e', c: '#031a17', name: 'SHIFOKOR', fs: 19, lines: ['Har tun bir kishini davolaysiz.', 'O‘zingizni ham qutqarasiz.'] },
  cop: { a: '#60a5fa', b: '#1e3a8a', c: '#070b22', name: 'KOMISSAR', fs: 19, lines: ['Har tun bir kishini tekshirasiz.', 'Mafiyani toping!'] },
  civil: { a: '#fbbf24', b: '#92400e', c: '#1d0f05', name: 'TINCH AHOLI', fs: 16, lines: ['Kunduz muhokama qilasiz.', 'Ovoz bilan mafiyani toping.'] },
};
const SKIN = '#e2b48c';

const Bust = ({ suit }) => (
  <>
    <path d="M42 262 C42 208 82 192 120 192 C158 192 198 208 198 262 Z" fill={suit} />
    <rect x="108" y="172" width="24" height="26" fill="#c99a74" />
    <ellipse cx="120" cy="150" rx="29" ry="33" fill={SKIN} />
    <circle cx="91" cy="152" r="5" fill="#d3a07a" /><circle cx="149" cy="152" r="5" fill="#d3a07a" />
  </>
);
const Eyes = ({ c = '#2b1a12' }) => (
  <>
    <circle cx="108" cy="152" r="2.5" fill={c} /><circle cx="132" cy="152" r="2.5" fill={c} />
  </>
);

function Mafia() {
  return (
    <g>
      <Bust suit="#1b1030" />
      <path d="M120 192 L94 202 L108 258 L120 236Z M120 192 L146 202 L132 258 L120 236Z" fill="#2c1a52" />
      <path d="M107 192 L120 236 L133 192Z" fill="#f1f5f9" />
      <path d="M120 204 L113 218 L120 252 L127 218Z" fill="#c1121f" />
      <ellipse cx="120" cy="170" rx="14" ry="3" fill="#000" opacity=".12" />
      <path d="M92 142 Q120 164 148 142 L148 128 L92 128Z" fill="#000" opacity=".5" />
      <circle cx="108" cy="152" r="2.8" fill="#ff3b4e" /><circle cx="132" cy="152" r="2.8" fill="#ff3b4e" />
      <circle cx="108" cy="152" r="7" fill="#ff3b4e" opacity=".18" /><circle cx="132" cy="152" r="7" fill="#ff3b4e" opacity=".18" />
      <path d="M110 170 H130" stroke="#7a4a3a" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="130" y="168" width="22" height="3.4" rx="1.6" fill="#f1f5f9" transform="rotate(-8 130 168)" />
      <circle cx="152" cy="164.6" r="2.4" fill="#ff7a3b" />
      <path d="M154 160 C160 150 150 144 158 134" stroke="#fff" strokeOpacity=".28" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="120" cy="129" rx="55" ry="10" fill="#0b0b10" />
      <path d="M90 129 C88 92 152 92 150 129Z" fill="#14141c" />
      <path d="M90 124 C100 131 140 131 150 124 L150 118 C140 125 100 125 90 118Z" fill="#c1121f" />
    </g>
  );
}
function Doctor() {
  return (
    <g>
      <Bust suit="#eef2f7" />
      <path d="M120 192 L98 204 L110 262 L120 238Z M120 192 L142 204 L130 262 L120 238Z" fill="#cbd5e1" />
      <path d="M106 192 L120 238 L134 192Z" fill="#14b8a6" opacity=".55" />
      <rect x="140" y="216" width="22" height="22" rx="5" fill="#0f766e" />
      <path d="M151 220 V234 M144 227 H158" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 194 C92 238 148 238 140 194" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <circle cx="140" cy="240" r="6" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
      <Eyes />
      <circle cx="108" cy="152" r="8" fill="none" stroke="#334155" strokeWidth="1.6" /><circle cx="132" cy="152" r="8" fill="none" stroke="#334155" strokeWidth="1.6" />
      <path d="M116 152 H124" stroke="#334155" strokeWidth="1.6" />
      <path d="M110 168 Q120 175 130 168" stroke="#7a3b2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M89 142 C86 108 154 108 151 142 C140 133 100 133 89 142Z" fill="#14b8a6" />
      <circle cx="120" cy="123" r="6.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
    </g>
  );
}
function Cop() {
  return (
    <g>
      <Bust suit="#13265a" />
      <path d="M120 192 L98 204 L110 262 L120 238Z M120 192 L142 204 L130 262 L120 238Z" fill="#1d3a86" />
      <path d="M108 192 L120 232 L132 192Z" fill="#e5e7eb" />
      <path d="M120 200 L115 214 L120 246 L125 214Z" fill="#0b1020" />
      <rect x="54" y="214" width="26" height="10" rx="2" fill="#fbbf24" /><rect x="160" y="214" width="26" height="10" rx="2" fill="#fbbf24" />
      {[236, 250].map((y) => <circle key={y} cx="120" cy={y} r="2.6" fill="#fbbf24" />)}
      <path d="M99 145 L115 148 M141 145 L125 148" stroke="#3b2a20" strokeWidth="3" strokeLinecap="round" />
      <Eyes />
      <path d="M111 169 H129" stroke="#7a3b2a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M85 132 C85 96 155 96 155 132Z" fill="#0f2150" />
      <rect x="85" y="123" width="70" height="9" fill="#070b1d" />
      <path d="M90 132 H150 Q120 146 90 132Z" fill="#04060e" />
      <path d="M120 103 L123.5 111 L132 112 L126 118 L127.5 126 L120 122 L112.5 126 L114 118 L108 112 L116.5 111Z" fill="#fbbf24" />
    </g>
  );
}
function Civil() {
  return (
    <g>
      <Bust suit="#6b4423" />
      <path d="M120 194 L100 206 L106 262 L120 240Z M120 194 L140 206 L134 262 L120 240Z" fill="#8a5a2c" />
      <path d="M106 194 L120 240 L134 194Z" fill="#e7d9b8" />
      <path d="M94 186 Q120 208 146 186 L150 200 Q120 220 90 200Z" fill="#b91c1c" />
      {[224, 240].map((y) => <circle key={y} cx="120" cy={y} r="2.4" fill="#d4a94c" />)}
      <circle cx="101" cy="163" r="5" fill="#f08a7a" opacity=".35" /><circle cx="139" cy="163" r="5" fill="#f08a7a" opacity=".35" />
      <Eyes />
      <path d="M108 166 Q120 180 132 166" stroke="#7a3b2a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M88 136 C86 106 154 106 152 136 Q120 126 88 136Z" fill="#7a4e28" />
      <path d="M88 136 Q120 131 152 136 L160 142 Q120 137 80 142Z" fill="#4a2f17" />
      <circle cx="120" cy="113" r="3" fill="#4a2f17" />
    </g>
  );
}
const ART = { mafia: Mafia, doctor: Doctor, cop: Cop, civil: Civil };

const Defs = ({ p, role }) => (
  <defs>
    <linearGradient id="goldg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e3a1" /><stop offset=".55" stopColor="#d4a94c" /><stop offset="1" stopColor="#8a6a1f" /></linearGradient>
    <linearGradient id={`bg-${role}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.b} /><stop offset="1" stopColor={p.c} /></linearGradient>
    <radialGradient id={`gl-${role}`} cx="50%" cy="38%" r="62%"><stop offset="0" stopColor={p.a} stopOpacity=".6" /><stop offset="1" stopColor={p.a} stopOpacity="0" /></radialGradient>
    <clipPath id={`win-${role}`}><path d="M28 258 V122 A92 92 0 0 1 212 122 V258 Z" /></clipPath>
  </defs>
);
const Corner = ({ x, y }) => <path d={`M${x} ${y - 7} L${x + 7} ${y} L${x} ${y + 7} L${x - 7} ${y} Z`} fill="url(#goldg)" />;

export function CardFace({ role }) {
  const p = PAL[role] || PAL.civil;
  const Art = ART[role] || Civil;
  return (
    <svg viewBox="0 0 240 360" className="block h-full w-full" role="img" aria-label={`${p.name} kartasi`}>
      <Defs p={p} role={role} />
      <rect x="2" y="2" width="236" height="356" rx="18" fill={`url(#bg-${role})`} stroke="url(#goldg)" strokeWidth="3" />
      <rect x="10" y="10" width="220" height="340" rx="12" fill="none" stroke="url(#goldg)" strokeWidth="1" opacity=".7" />
      {[[16, 16], [224, 16], [16, 344], [224, 344]].map(([x, y]) => <Corner key={x + '-' + y} x={x} y={y} />)}
      <g clipPath={`url(#win-${role})`}>
        <rect x="28" y="30" width="184" height="230" fill={`url(#gl-${role})`} />
        <circle cx="60" cy="90" r="46" fill="#fff" opacity=".04" /><circle cx="190" cy="120" r="56" fill="#fff" opacity=".05" />
        <ellipse cx="120" cy="150" rx="62" ry="78" fill={p.a} opacity=".12" />
        <Art />
        <rect x="28" y="236" width="184" height="26" fill="#000" opacity=".25" />
      </g>
      <path d="M28 258 V122 A92 92 0 0 1 212 122 V258 Z" fill="none" stroke="url(#goldg)" strokeWidth="2.5" />
      <path d="M30 268 H210 L202 298 H38 Z" fill="#0b0612" stroke="url(#goldg)" strokeWidth="1.6" />
      <text x="120" y="289" textAnchor="middle" fontSize={p.fs} fontWeight="900" letterSpacing="2.5" fill="url(#goldg)" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{p.name}</text>
      {p.lines.map((l, i) => <text key={i} x="120" y={319 + i * 15} textAnchor="middle" fontSize="10.5" fill="#eadfc8">{l}</text>)}
    </svg>
  );
}

export function CardBack() {
  return (
    <svg viewBox="0 0 240 360" className="block h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="goldg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e3a1" /><stop offset=".55" stopColor="#d4a94c" /><stop offset="1" stopColor="#8a6a1f" /></linearGradient>
        <linearGradient id="bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b0d2a" /><stop offset="1" stopColor="#14061f" /></linearGradient>
        <pattern id="lat" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 H24 M0 0 V24" stroke="#d4a94c" strokeOpacity=".16" strokeWidth="1" /></pattern>
        <radialGradient id="bkg" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ff2a4d" stopOpacity=".4" /><stop offset="1" stopColor="#ff2a4d" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="2" y="2" width="236" height="356" rx="18" fill="url(#bk)" stroke="url(#goldg)" strokeWidth="3" />
      <rect x="2" y="2" width="236" height="356" rx="18" fill="url(#lat)" />
      <rect x="14" y="14" width="212" height="332" rx="10" fill="none" stroke="url(#goldg)" strokeWidth="1.2" />
      {[[22, 22], [218, 22], [22, 338], [218, 338]].map(([x, y]) => <Corner key={x + '-' + y} x={x} y={y} />)}
      <circle cx="120" cy="180" r="92" fill="url(#bkg)" />
      <circle cx="120" cy="180" r="62" fill="#0d0614" stroke="url(#goldg)" strokeWidth="2.4" />
      <circle cx="120" cy="180" r="54" fill="none" stroke="url(#goldg)" strokeWidth=".8" opacity=".7" />
      {/* teatr niqobi */}
      <path d="M92 160 C92 140 148 140 148 160 C148 196 136 214 120 214 C104 214 92 196 92 160Z" fill="#e9dcc3" />
      <path d="M101 164 Q108 158 115 164 Q108 168 101 164Z M125 164 Q132 158 139 164 Q132 168 125 164Z" fill="#14061f" />
      <path d="M106 192 Q120 204 134 192" stroke="#8b1230" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M116 168 L120 180 L124 168" stroke="#bda57a" strokeWidth="1.4" fill="none" />
      <text x="120" y="290" textAnchor="middle" fontSize="19" fontWeight="900" letterSpacing="5" fill="url(#goldg)" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>MAFIYA</text>
      <text x="120" y="308" textAnchor="middle" fontSize="9" letterSpacing="3" fill="#d4a94c" opacity=".8">FRIENDS UZ</text>
    </svg>
  );
}

export function RoleCard({ role, flipped = true, className = '' }) {
  return (
    <div className={`card3d card-glow ${className}`}>
      <div className={`card3d-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="card3d-face"><CardBack /></div>
        <div className="card3d-face card3d-front">{role ? <CardFace role={role} /> : <CardBack />}</div>
      </div>
    </div>
  );
}
