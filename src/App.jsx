import { useEffect, useMemo, useRef, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import {
  Skull, Moon, Sun, Crosshair, Stethoscope, Search, Users, Copy, Share2, LogOut, Eye, Crown, Play,
  RotateCcw, Check, Vote, Loader2, Plus, Ghost, Trophy, Hourglass, DoorOpen, ShieldCheck, Drama,
} from 'lucide-react';
import { db } from './firebase';
import { initTelegram, shareInvite, haptic } from './telegram';
import {
  ROLES, MIN_PLAYERS, createRoom, joinRoom, leaveRoom, startGame, beginNight, submitNight, submitVote,
  resolveNight, resolveDay, endGame, restart, checkWinner, tally,
} from './game';

const ROLE_ICON = { mafia: Skull, doctor: Stethoscope, cop: Search, civil: ShieldCheck };
const ROLE_COLOR = { mafia: 'text-rose-400', doctor: 'text-emerald-400', cop: 'text-sky-400', civil: 'text-amber-300' };
const AV = ['bg-rose-700', 'bg-indigo-700', 'bg-emerald-700', 'bg-amber-700', 'bg-fuchsia-700', 'bg-cyan-700'];

/* ---------- Kichik UI qismlar ---------- */
function Avatar({ p, size = 44 }) {
  const [bad, setBad] = useState(false);
  const c = AV[String(p.id).charCodeAt(String(p.id).length - 1) % AV.length];
  return (
    <div style={{ width: size, height: size }} className={`shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 ${p.alive === false ? 'opacity-40 grayscale' : ''}`}>
      {p.photo && !bad
        ? <img src={p.photo} alt="" onError={() => setBad(true)} className="h-full w-full object-cover" />
        : <div className={`flex h-full w-full items-center justify-center font-bold text-white ${c}`}>{(p.name || '?')[0].toUpperCase()}</div>}
    </div>
  );
}

const Btn = ({ children, className = '', variant = 'red', ...p }) => (
  <button
    {...p}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${
      variant === 'red' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : variant === 'amber' ? 'bg-amber-500 text-black' : 'border border-white/15 bg-white/5 text-slate-100'
    } ${className}`}
  >{children}</button>
);

const Panel = ({ children, className = '' }) => <div className={`rounded-3xl border border-white/10 bg-white/[.04] p-4 ${className}`}>{children}</div>;

function Picker({ list, sel, onSel, disabled, badge }) {
  return (
    <div className="grid gap-2">
      {list.map((p) => (
        <button key={p.id} disabled={disabled} onClick={() => { haptic(); onSel(p.id); }}
          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-default ${sel === p.id ? 'border-rose-500 bg-rose-500/15' : 'border-white/10 bg-white/5'}`}>
          <Avatar p={p} />
          <span className="flex-1 truncate font-medium">{p.name}</span>
          {badge?.(p)}
          {sel === p.id && <Check size={18} className="text-rose-400" />}
        </button>
      ))}
    </div>
  );
}

/* ---------- Bosh sahifa ---------- */
function Home({ user, onCreate, onJoin, busy, error }) {
  const [code, setCode] = useState('');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="flex items-center gap-3"><Avatar p={user} size={40} /><div className="font-medium text-slate-300">{user.name}</div></div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Drama size={72} className="text-rose-500" strokeWidth={1.5} />
        <h1 className="mt-4 text-6xl font-black tracking-tight">Mafiya</h1>
        <p className="mt-2 max-w-[18rem] text-slate-400">Do'stlaringiz bilan tunda yashiringan mafiyani toping.</p>
      </div>
      {error && <div className="mb-3 rounded-2xl bg-rose-500/15 p-3 text-center text-sm text-rose-300">{error}</div>}
      <Btn onClick={onCreate} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />} Yangi xona yaratish</Btn>
      <div className="my-4 text-center text-sm text-slate-500">yoki kod bilan kiring</div>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 xonali kod"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-xl font-bold tracking-[.3em] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal" />
        <button disabled={code.length !== 6 || busy} onClick={() => onJoin(code)} className="rounded-2xl bg-white/10 px-5 font-bold disabled:opacity-40"><DoorOpen /></button>
      </div>
    </div>
  );
}

/* ---------- Lobby ---------- */
function Lobby({ code, players, isHost }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const enough = players.length >= MIN_PLAYERS;
  return (
    <>
      <Panel className="text-center">
        <div className="text-sm text-slate-400">Xona kodi</div>
        <button onClick={copy} className="mt-1 inline-flex items-center gap-2 text-5xl font-black tracking-[.15em]">{code}{copied ? <Check className="text-emerald-400" /> : <Copy size={20} className="text-slate-500" />}</button>
      </Panel>
      <Btn variant="outline" onClick={() => shareInvite(code)}><Share2 size={18} /> Do'stlarni taklif qilish</Btn>
      <Panel>
        <div className="mb-3 flex items-center gap-2 font-bold"><Users size={18} /> O'yinchilar ({players.length})</div>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3"><Avatar p={p} /><span className="flex-1 truncate">{p.name}</span>{i === 0 && <Crown size={16} className="text-amber-400" />}</div>
          ))}
        </div>
      </Panel>
      {isHost ? (
        <Btn disabled={!enough} onClick={() => startGame(code, players)}><Play size={18} /> {enough ? "O'yinni boshlash" : `Kamida ${MIN_PLAYERS} o'yinchi kerak`}</Btn>
      ) : <div className="flex items-center justify-center gap-2 text-slate-400"><Hourglass size={16} /> Xona egasi o'yinni boshlashini kuting…</div>}
    </>
  );
}

/* ---------- Rol kartasi ---------- */
function Reveal({ me, players, isHost, onNext }) {
  const [open, setOpen] = useState(false);
  const Icon = ROLE_ICON[me.role] || Ghost;
  const mates = me.role === 'mafia' ? players.filter((p) => p.role === 'mafia' && p.id !== me.id) : [];
  return (
    <>
      <p className="text-center text-slate-400">Kartangizni bosib, rolingizni ko'ring. Hech kimga ko'rsatmang!</p>
      <button onClick={() => { setOpen(!open); haptic('medium'); }} className="mx-auto block w-full max-w-xs [perspective:800px]">
        {open ? (
          <div key="f" className="animate-pop rounded-[2rem] border border-white/15 bg-gradient-to-b from-white/10 to-white/[.02] p-8 text-center">
            <Icon size={80} className={`mx-auto ${ROLE_COLOR[me.role]}`} strokeWidth={1.4} />
            <div className={`mt-4 text-3xl font-black ${ROLE_COLOR[me.role]}`}>{ROLES[me.role].name}</div>
            <p className="mt-2 text-sm text-slate-300">{ROLES[me.role].desc}</p>
            {mates.length > 0 && <p className="mt-3 text-sm text-rose-300">Hamtovoqlar: {mates.map((m) => m.name).join(', ')}</p>}
          </div>
        ) : (
          <div key="b" className="animate-pop flex aspect-[3/4] items-center justify-center rounded-[2rem] border border-rose-500/30 bg-[repeating-linear-gradient(45deg,#1b0f1f,#1b0f1f_10px,#240f1c_10px,#240f1c_20px)]">
            <Drama size={72} className="text-rose-500/80" strokeWidth={1.3} />
          </div>
        )}
      </button>
      {isHost
        ? <Btn onClick={() => beginNight(onNext, 1)}><Moon size={18} /> Tunni boshlash</Btn>
        : <div className="flex items-center justify-center gap-2 text-slate-400"><Hourglass size={16} /> Xona egasi tunni boshlashini kuting…</div>}
    </>
  );
}

/* ---------- Voqea bannerri ---------- */
const EventBanner = ({ event, title }) => event && (
  <Panel className="border-amber-500/30 bg-amber-500/10">
    <div className="mb-1 text-sm font-medium text-amber-300">{title}</div>
    <div className="text-lg font-bold leading-snug">{event.text}</div>
  </Panel>
);

/* ---------- Tun ---------- */
const NIGHT = {
  mafia: { icon: Crosshair, title: 'Kimni yo‘q qilasiz?', btn: 'Otish' },
  doctor: { icon: Stethoscope, title: 'Kimni davolaysiz?', btn: 'Davolash' },
  cop: { icon: Search, title: 'Kimni tekshirasiz?', btn: 'Tekshirish' },
};

function Night({ code, room, players, me, spectator }) {
  const alive = players.filter((p) => p.alive);
  const night = room.night || {};
  const role = me.role;
  const [sel, setSel] = useState(null);
  const mine = role === 'mafia' ? night.mafia?.[me.id] : night[role];

  if (spectator) {
    const nm = (id) => players.find((p) => p.id === id)?.name || '…';
    return (
      <>
        <EventBanner event={room.event} title="Oxirgi voqea" />
        <Panel>
          <div className="mb-3 flex items-center gap-2 font-bold"><Eye size={18} /> Tun harakatlari (kuzatuv)</div>
          <div className="space-y-2 text-sm text-slate-300">
            {players.filter((p) => p.role === 'mafia' && p.alive).map((m) => <div key={m.id}>🔪 {m.name} → <b>{night.mafia?.[m.id] ? nm(night.mafia[m.id]) : 'tanlamoqda…'}</b></div>)}
            {players.some((p) => p.role === 'doctor' && p.alive) && <div>🩺 Shifokor → <b>{night.doctor ? nm(night.doctor) : 'tanlamoqda…'}</b></div>}
            {players.some((p) => p.role === 'cop' && p.alive) && <div>🔎 Komissar → <b>{night.cop ? nm(night.cop) : 'tanlamoqda…'}</b></div>}
          </div>
        </Panel>
      </>
    );
  }

  const cfg = NIGHT[role];
  if (!cfg) return (
    <>
      <EventBanner event={room.event} title="Kechagi kun natijasi" />
      <Panel className="py-12 text-center"><Moon size={56} className="mx-auto text-indigo-300" strokeWidth={1.4} /><div className="mt-4 text-xl font-bold">Tun o'tishini kuting...</div><p className="mt-1 text-sm text-slate-400">Shahar uxlamoqda. Mafiya ish boshladi.</p></Panel>
    </>
  );

  const Icon = cfg.icon;
  const list = role === 'doctor' ? alive : alive.filter((p) => p.id !== me.id);
  const picked = players.find((p) => p.id === mine);
  return (
    <>
      <EventBanner event={room.event} title="Kechagi kun natijasi" />
      <div className="flex items-center gap-3"><Icon className={ROLE_COLOR[role]} /><h2 className="text-xl font-bold">{cfg.title}</h2></div>
      <Picker list={list} sel={mine || sel} onSel={setSel} disabled={!!mine}
        badge={(p) => role === 'mafia' ? Object.entries(night.mafia || {}).filter(([k, t]) => t === p.id && k !== me.id).map(([k]) => <Skull key={k} size={16} className="text-rose-400" />) : null} />
      {mine ? (
        <Panel className="text-center">
          {role === 'cop' && picked && (
            <div className={`mb-2 text-lg font-bold ${picked.role === 'mafia' ? 'text-rose-400' : 'text-emerald-400'}`}>{picked.name} — {picked.role === 'mafia' ? 'MAFIYA!' : 'mafiya emas'}</div>
          )}
          <div className="flex items-center justify-center gap-2 text-slate-300"><Hourglass size={16} /> Tanlov qabul qilindi. Boshqalarni kuting…</div>
        </Panel>
      ) : <Btn disabled={!sel} onClick={() => submitNight(code, role, me.id, sel)}><Icon size={18} /> {cfg.btn}</Btn>}
    </>
  );
}

/* ---------- Kun ---------- */
function Day({ code, room, players, me, spectator }) {
  const alive = players.filter((p) => p.alive);
  const votes = room.votes || {};
  const counts = tally(votes);
  const mine = votes[me.id];
  const [sel, setSel] = useState(null);
  const nm = (id) => players.find((p) => p.id === id)?.name || '?';
  return (
    <>
      <EventBanner event={room.event} title="Tun natijasi" />
      <div className="flex items-center gap-3"><Vote className="text-amber-400" /><h2 className="text-xl font-bold">Kimni chiqaramiz?</h2></div>
      <Picker list={spectator ? alive : alive.filter((p) => p.id !== me.id)} sel={spectator ? null : mine || sel} onSel={setSel} disabled={spectator || !!mine}
        badge={(p) => counts[p.id] ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-300">{counts[p.id]}</span> : null} />
      {Object.keys(votes).length > 0 && (
        <Panel className="space-y-1 text-sm text-slate-300">
          <div className="mb-1 font-medium text-slate-400">Ovozlar</div>
          {Object.entries(votes).map(([v, t]) => <div key={v}>{nm(v)} → <b>{nm(t)}</b></div>)}
        </Panel>
      )}
      {!spectator && (mine
        ? <div className="flex items-center justify-center gap-2 text-slate-300"><Hourglass size={16} /> Ovoz berdingiz. Boshqalarni kuting…</div>
        : <Btn variant="amber" disabled={!sel} onClick={() => submitVote(code, me.id, sel)}><Vote size={18} /> Ovoz berish</Btn>)}
    </>
  );
}

/* ---------- Yakun ---------- */
function Ended({ code, room, players, isHost }) {
  const mafiaWon = room.winner === 'mafia';
  return (
    <>
      <EventBanner event={room.event} title="So'nggi voqea" />
      <Panel className={`py-8 text-center ${mafiaWon ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
        <Trophy size={64} className={`mx-auto ${mafiaWon ? 'text-rose-400' : 'text-emerald-400'}`} strokeWidth={1.4} />
        <div className="mt-3 text-4xl font-black">{mafiaWon ? 'Mafiya yutdi!' : 'Tinch aholi yutdi!'}</div>
        <p className="mt-1 text-slate-300">{mafiaWon ? 'Shahar mafiya qo‘liga o‘tdi.' : 'Barcha mafiyalar fosh etildi.'}</p>
      </Panel>
      <Panel className="space-y-2">
        {players.map((p) => { const I = ROLE_ICON[p.role] || Ghost; return (
          <div key={p.id} className="flex items-center gap-3"><Avatar p={p} size={36} /><span className="flex-1 truncate">{p.name}</span><span className={`flex items-center gap-1 text-sm ${ROLE_COLOR[p.role]}`}><I size={14} />{ROLES[p.role]?.name}</span></div>
        ); })}
      </Panel>
      {isHost
        ? <Btn onClick={() => restart(code, players)}><RotateCcw size={18} /> Qayta o'ynash</Btn>
        : <div className="flex items-center justify-center gap-2 text-slate-400"><Hourglass size={16} /> Xona egasi qayta boshlashini kuting…</div>}
    </>
  );
}

/* ---------- Xona (asosiy o'yin ekrani) ---------- */
function Room({ code, user, room, onExit }) {
  const players = useMemo(() => Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt), [room.players]);
  const me = room.players?.[user.id];
  const isHost = room.host === user.id;
  const inGame = ['night', 'day'].includes(room.phase);
  const spectator = !!me && !me.alive && room.phase !== 'lobby';
  const [watch, setWatch] = useState(false);
  const guard = useRef('');

  useEffect(() => { if (me?.alive) setWatch(false); }, [me?.alive]);

  // Xona egasi o'yin mantiqini yuritadi (backend yo'q)
  useEffect(() => {
    if (!isHost || !inGame) return;
    const alive = players.filter((p) => p.alive);
    const w = checkWinner(players);
    const n = room.night || {};
    const ready = room.phase === 'night'
      ? alive.filter((p) => p.role === 'mafia').every((p) => n.mafia?.[p.id])
        && (!alive.some((p) => p.role === 'doctor') || n.doctor)
        && (!alive.some((p) => p.role === 'cop') || n.cop)
      : alive.every((p) => room.votes?.[p.id]);
    const key = `${room.phase}-${room.round}-${w ? 'w' : ready ? 'r' : 'n'}`;
    if (key === guard.current || !(w || ready)) return;
    guard.current = key;
    if (w) endGame(code, w);
    else if (room.phase === 'night') resolveNight(code, room, players);
    else resolveDay(code, room, players);
  }, [room, players, isHost, inGame, code]);

  if (!me) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const exit = async () => { try { await leaveRoom(code, room, user.id); } finally { onExit(); } };
  const confirmExit = () => { if (window.confirm('Xonadan chiqasizmi?')) exit(); };
  const forceNext = () => (room.phase === 'night' ? resolveNight(code, room, players) : resolveDay(code, room, players));
  const day = room.phase === 'day';
  const RIcon = ROLE_ICON[me.role];

  return (
    <div className={`min-h-dvh text-slate-100 ${day ? 'bg-day' : 'bg-night'}`}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-4">
        <header className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 text-sm text-slate-300">
            {day ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-300" />}
            <span className="font-bold">
              {room.phase === 'lobby' ? 'Kutish xonasi' : room.phase === 'reveal' ? 'Rollar' : room.phase === 'ended' ? 'O‘yin tugadi' : `${room.round}-${day ? 'kun' : 'tun'}`}
            </span>
            {room.phase !== 'lobby' && RIcon && <span className={`flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 ${ROLE_COLOR[me.role]}`}><RIcon size={12} />{ROLES[me.role].name}</span>}
          </div>
          <button onClick={confirmExit} aria-label="Chiqish" className="rounded-xl bg-white/10 p-2"><LogOut size={18} /></button>
        </header>

        {spectator && room.phase !== 'ended' && watch && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-500/15 px-3 py-2 text-sm text-slate-300"><Eye size={16} /> Siz tomoshabinsiz — harakat qila olmaysiz</div>
        )}

        <main className="mt-4 flex-1 space-y-4 animate-fade" key={room.phase + room.round}>
          {room.phase === 'lobby' && <Lobby code={code} players={players} isHost={isHost} />}
          {room.phase === 'reveal' && <Reveal me={me} players={players} isHost={isHost} onNext={code} />}
          {room.phase === 'night' && <Night code={code} room={room} players={players} me={me} spectator={spectator} />}
          {room.phase === 'day' && <Day code={code} room={room} players={players} me={me} spectator={spectator} />}
          {room.phase === 'ended' && <Ended code={code} room={room} players={players} isHost={isHost} />}

          {inGame && (
            <Panel>
              <div className="mb-2 text-sm text-slate-400">Tirik: {players.filter((p) => p.alive).length} / {players.length}</div>
              <div className="flex flex-wrap gap-2">{players.map((p) => <div key={p.id} title={p.name} className="relative"><Avatar p={p} size={34} />{!p.alive && <Skull size={14} className="absolute -bottom-1 -right-1 rounded-full bg-black p-0.5 text-rose-400" />}</div>)}</div>
              {isHost && <button onClick={forceNext} className="mt-3 text-xs text-slate-500 underline">Kutmasdan davom ettirish (xona egasi)</button>}
            </Panel>
          )}
        </main>
      </div>

      {spectator && inGame && !watch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="animate-fade w-full max-w-sm rounded-3xl border border-rose-500/30 bg-[#12080f] p-6 text-center">
            <Skull size={56} className="mx-auto text-rose-500" strokeWidth={1.4} />
            <h3 className="mt-3 text-2xl font-black">Siz o'ldirildingiz!</h3>
            <p className="mt-2 text-slate-300">O'yinni kuzatishda davom etasizmi yoki chiqasizmi?</p>
            <div className="mt-5 space-y-2">
              <Btn onClick={() => setWatch(true)}><Eye size={18} /> O'yinni kuzatish</Btn>
              <Btn variant="outline" onClick={exit}><LogOut size={18} /> Chiqish</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Ildiz ---------- */
export default function App() {
  const [boot] = useState(initTelegram);
  const { user } = boot;
  const [code, setCode] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoJoined = useRef(false);

  const enter = async (c, create = false) => {
    setBusy(true); setError('');
    try {
      if (create) c = await createRoom(user); else await joinRoom(c, user);
      setCode(c);
    } catch (e) { setError(e.message || 'Xatolik yuz berdi'); }
    setBusy(false);
  };

  // start_param orqali avtomatik kirish
  useEffect(() => {
    if (boot.startParam && !autoJoined.current) { autoJoined.current = true; enter(String(boot.startParam).replace(/\D/g, '').slice(0, 6)); }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!code) { setRoom(null); return; }
    return onValue(ref(db, `rooms/${code}`), (s) => {
      if (s.exists()) setRoom(s.val());
      else { setCode(null); setError('Xona yopildi'); }
    }, (e) => { setError('Firebase xatosi: ' + e.message); setCode(null); });
  }, [code]);

  if (code && room) return <Room code={code} user={user} room={room} onExit={() => { setCode(null); setRoom(null); }} />;
  if (code) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="animate-spin text-rose-500" size={36} /></div>;
  return <div className="bg-night min-h-dvh text-slate-100"><Home user={user} busy={busy} error={error} onCreate={() => enter(null, true)} onJoin={(c) => enter(c)} /></div>;
}
