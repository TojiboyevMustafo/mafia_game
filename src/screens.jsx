import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import {
  Skull, Moon, Crosshair, Stethoscope, Search, Users, Copy, Share2, Crown, Play, RotateCcw, Check, Vote,
  Hourglass, Trophy, Ghost, ShieldCheck, Mic, MicOff, PhoneOff, Eye, X,
} from 'lucide-react';
import { db } from './firebase';
import { Avatar, Btn, Panel, Picker, EventBanner } from './ui';
import { RoleCard } from './cards';
import { shareInvite, haptic } from './telegram';
import { ROLES, MIN_PLAYERS, MIN_REVEAL_MS, live, tally, startGame, restart, markReady, markRevealAt, kickPlayer, submitNight, submitVote } from './game';

export const ROLE_ICON = { mafia: Skull, doctor: Stethoscope, cop: Search, civil: ShieldCheck };
export const ROLE_COLOR = { mafia: 'text-rose-400', doctor: 'text-emerald-400', cop: 'text-sky-400', civil: 'text-amber-300' };
const Waiting = ({ children }) => <div className="flex items-center justify-center gap-2 py-1 text-slate-300"><Hourglass size={16} /> {children}</div>;
const isDenied = (e) => /permission_denied/i.test((e?.code || '') + (e?.message || ''));

/* ---------- Ovozli chat paneli ---------- */
export function VoiceBar({ voice, group, phase, alive, players }) {
  const names = players.filter((p) => voice.speaking.has(p.id)).map((p) => p.name);
  const closedText = phase === 'night' ? 'Tunda ovozli chat yopiq 🌙' : !alive ? 'Ovozli chat siz uchun yopiq' : 'Ovozli chat hozir yopiq';
  const label = group === 'lobby' ? 'Umumiy ovozli chat' : group === 'day' ? 'Kunduzgi suhbat (tirik o‘yinchilar)' : group === 'mafia' ? '🔪 Mafiya maxfiy kanali' : closedText;
  if (!voice.joined) {
    return (
      <div>
        <button onClick={voice.join} className="btn btn-ghost !py-2.5 text-sm"><Mic size={16} /> Ovozli chatga qo‘shilish</button>
        {voice.error && <div className="mt-1 text-center text-xs text-rose-300">{voice.error}</div>}
      </div>
    );
  }
  return (
    <div className="panel flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-amber-300">{label}</div>
        <div className="truncate text-xs text-slate-400">{names.length ? `🗣 ${names.join(', ')}` : group ? 'Hozir hech kim gapirmayapti' : '—'}</div>
      </div>
      <button onClick={() => { haptic(); voice.toggleMute(); }} disabled={!group} aria-label={voice.muted ? 'Mikrofonni yoqish' : 'Mikrofonni o‘chirish'}
        className={`flex h-10 w-10 items-center justify-center rounded-full ${voice.muted || !group ? 'bg-white/10 text-slate-400' : 'bg-emerald-600 text-white'} disabled:opacity-40`}>
        {voice.muted || !group ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      <button onClick={voice.leave} aria-label="Ovozli chatdan chiqish" className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-900/70"><PhoneOff size={18} /></button>
    </div>
  );
}

/* ---------- Lobby ---------- */
export function Lobby({ code, players, isHost, hostId }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const active = players.filter((p) => !p.gone);
  const enough = active.length >= MIN_PLAYERS;
  return (
    <>
      <Panel className="text-center">
        <div className="font-display mb-3 text-xs tracking-[.35em] text-amber-300/80">Xona kodi</div>
        <button onClick={copy} aria-label="Kodni nusxalash" className="mx-auto flex items-center justify-center gap-1.5">
          {code.split('').map((d, i) => <span key={i} className="code-tile">{d}</span>)}
          <span className="ml-1 text-slate-400">{copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={18} />}</span>
        </button>
        <div className="mt-2 text-xs text-slate-500">{copied ? 'Nusxalandi ✓' : 'Nusxalash uchun bosing'}</div>
      </Panel>
      <Btn variant="ghost" onClick={() => shareInvite(code)}><Share2 size={18} /> Do‘stlarni taklif qilish</Btn>
      <Panel>
        <div className="mb-3 flex items-center gap-2 font-bold"><Users size={18} className="text-amber-300" /> O‘yinchilar ({active.length})</div>
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="pcard"><Avatar p={p} size={44} /><span className="min-w-0 flex-1 truncate">{p.name}</span>{p.id === hostId && <Crown size={16} className="text-amber-400" />}</div>
          ))}
        </div>
      </Panel>
      {isHost
        ? <Btn disabled={!enough} className={enough ? 'pulse-neon' : ''} onClick={() => startGame(code, active)}><Play size={18} /> {enough ? 'O‘yinni boshlash' : `Kamida ${MIN_PLAYERS} o‘yinchi kerak`}</Btn>
        : <Waiting>Xona egasi o‘yinni boshlashini kuting…</Waiting>}
    </>
  );
}

/* ---------- Rollarni ko'rsatish: har bir o'yinchi uchun alohida 5 soniya ---------- */
export function Reveal({ code, me, role, team, players, isHost, room, offset }) {
  const [now, setNow] = useState(Date.now());
  const [flipped, setFlipped] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  // Karta ochilgan vaqt serverda saqlanadi — sahifani yangilash taymerni nolga tushirmaydi
  useEffect(() => { if (role && !me.revealAt) markRevealAt(code, me.id).catch(() => {}); }, [role, me.revealAt]); // eslint-disable-line
  useEffect(() => { if (!role) return; const t = setTimeout(() => setFlipped(true), 350); return () => clearTimeout(t); }, [role]);

  const elapsed = me.revealAt ? now + offset - me.revealAt : 0;
  const left = Math.max(0, Math.ceil((MIN_REVEAL_MS - elapsed) / 1000));
  const canReady = !!me.revealAt && elapsed >= MIN_REVEAL_MS + 400;
  const active = players.filter((p) => !p.gone);
  const readyN = active.filter((p) => p.ready).length;
  const mates = role === 'mafia' ? players.filter((p) => team.includes(p.id) && p.id !== me.id) : [];
  const stuck = isHost && room.revealStart && now - room.revealStart > 45000;
  const waiting = active.filter((p) => !p.ready);

  const ready = async () => {
    setErr('');
    try { await markReady(code, me.id); }
    catch { setErr('Biroz kuting va qayta bosing.'); }
  };

  return (
    <>
      <p className="text-center text-sm text-slate-300">Sizning rolingiz. Hech kimga ko‘rsatmang! 🤫</p>
      <div className="mx-auto w-[72%] max-w-[280px]"><RoleCard role={role} flipped={flipped && !!role} /></div>
      {role && <p className={`text-center text-sm ${ROLE_COLOR[role]}`}>{ROLES[role].task}</p>}
      {mates.length > 0 && (
        <Panel>
          <div className="mb-2 text-sm font-bold text-rose-300">🔪 Sheriklaringiz</div>
          <div className="flex flex-wrap gap-2">{mates.map((m) => <div key={m.id} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm"><Avatar p={m} size={26} />{m.name}</div>)}</div>
        </Panel>
      )}
      {me.ready ? (
        <Waiting>Tayyorsiz ✅ Boshqalar kutilmoqda: {readyN} / {active.length}</Waiting>
      ) : (
        <>
          <Btn disabled={!canReady} onClick={ready}>
            {canReady ? <><Check size={18} /> Tayyorman</> : <><Hourglass size={18} /> {role ? `Kartani ko‘ring… ${left || 1}` : 'Rol yuklanmoqda…'}</>}
          </Btn>
          {err && <div className="text-center text-xs text-rose-300">{err}</div>}
        </>
      )}
      {stuck && waiting.length > 0 && (
        <Panel>
          <div className="mb-2 text-xs text-slate-400">Quyidagilar hali tayyor emas. Kerak bo‘lsa, xonadan chiqarib yuborishingiz mumkin:</div>
          {waiting.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1"><Avatar p={p} size={30} /><span className="flex-1 truncate text-sm">{p.name}</span>
              {p.id !== me.id && <button onClick={() => kickPlayer(code, p.id)} className="rounded-lg bg-rose-900/70 p-1.5" aria-label="Chiqarish"><X size={14} /></button>}</div>
          ))}
        </Panel>
      )}
    </>
  );
}

/* ---------- Tun ---------- */
const NIGHT = {
  mafia: { icon: Crosshair, title: 'Kimni yo‘q qilasiz?', btn: 'Otish' },
  doctor: { icon: Stethoscope, title: 'Kimni davolaysiz?', btn: 'Davolash' },
  cop: { icon: Search, title: 'Kimni tekshirasiz?', btn: 'Tekshirish' },
};

export function Night({ code, room, players, me, role, spectator }) {
  const alive = players.filter(live);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [picks, setPicks] = useState({});
  const [cop, setCop] = useState(null);
  useEffect(() => { setSel(null); setDone(false); setErr(''); }, [room.round]);
  useEffect(() => (role === 'mafia' && !spectator ? onValue(ref(db, `actions/${code}/mafia`), (s) => setPicks(s.val() || {}), () => {}) : undefined), [code, role, spectator, room.round]);
  useEffect(() => (role === 'cop' && !spectator ? onValue(ref(db, `copResult/${code}/${me.id}`), (s) => setCop(s.val()), () => {}) : undefined), [code, role, spectator, me.id]);

  if (spectator) return (
    <>
      <EventBanner event={room.event} title="Oxirgi voqea" />
      <Panel className="py-10 text-center"><Eye size={44} className="mx-auto text-slate-300" strokeWidth={1.4} /><div className="mt-3 text-lg font-bold">Tun davom etmoqda…</div><p className="mt-1 text-sm text-slate-400">Siz tomoshabinsiz. Harakatlar maxfiy.</p></Panel>
    </>
  );

  const cfg = NIGHT[role];
  if (!cfg) return (
    <>
      <EventBanner event={room.event} title="Kunduzgi ovoz natijasi" />
      <Panel className="py-12 text-center"><Moon size={56} className="mx-auto text-indigo-300" strokeWidth={1.4} /><div className="font-display mt-4 text-2xl font-bold">Tun o‘tishini kuting...</div><p className="mt-1 text-sm text-slate-400">Shahar uxlamoqda. Mafiya ish boshladi.</p></Panel>
    </>
  );

  const Icon = cfg.icon;
  const list = role === 'doctor' ? alive : alive.filter((p) => p.id !== me.id);
  const mine = role === 'mafia' ? picks[me.id] : done ? sel : null;
  const result = role === 'cop' && cop && cop.round === room.round ? cop : null;
  const target = result && players.find((p) => p.id === result.target);

  const submit = async () => {
    setErr('');
    try { await submitNight(code, role, me.id, sel); if (role !== 'mafia') setDone(true); }
    catch (e) { if (isDenied(e) && role !== 'mafia') { setDone(true); } else setErr('Tanlov yuborilmadi. Qayta urinib ko‘ring.'); }
  };

  return (
    <>
      <EventBanner event={room.event} title="Kunduzgi ovoz natijasi" />
      <div className="flex items-center gap-3"><Icon className={ROLE_COLOR[role]} /><h2 className="font-display text-2xl font-bold">{cfg.title}</h2></div>
      <Picker list={list} sel={mine || sel} onSel={setSel} disabled={!!mine}
        badge={(p) => role === 'mafia' ? Object.entries(picks).filter(([k, t]) => t === p.id && k !== me.id).map(([k]) => <Skull key={k} size={16} className="text-rose-400" />) : null} />
      {mine ? (
        <Panel className="text-center">
          {result && target && <div className={`mb-2 text-lg font-bold ${result.isMafia ? 'text-rose-400' : 'text-emerald-400'}`}>{target.name} — {result.isMafia ? 'MAFIYA!' : 'mafiya emas'}</div>}
          <Waiting>Tanlov qabul qilindi. Boshqalarni kuting…</Waiting>
        </Panel>
      ) : <Btn disabled={!sel} onClick={submit}><Icon size={18} /> {cfg.btn}</Btn>}
      {err && <div className="text-center text-xs text-rose-300">{err}</div>}
    </>
  );
}

/* ---------- Kun ---------- */
export function Day({ code, room, players, me, spectator }) {
  const alive = players.filter(live);
  const votes = room.votes || {};
  const counts = tally(votes);
  const mine = votes[me.id];
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState('');
  const nm = (id) => players.find((p) => p.id === id)?.name || '?';
  const vote = async () => { setErr(''); try { await submitVote(code, me.id, sel); } catch { setErr('Ovoz yuborilmadi. Qayta urinib ko‘ring.'); } };
  return (
    <>
      <EventBanner event={room.event} title="Tun natijasi" />
      <div className="flex items-center gap-3"><Vote className="text-amber-400" /><h2 className="font-display text-2xl font-bold">Kimni chiqaramiz?</h2></div>
      <Picker list={spectator ? alive : alive.filter((p) => p.id !== me.id)} sel={spectator ? null : mine || sel} onSel={setSel} disabled={spectator || !!mine}
        badge={(p) => counts[p.id] ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-300">{counts[p.id]}</span> : null} />
      {Object.keys(votes).length > 0 && (
        <Panel className="space-y-1 text-sm text-slate-300">
          <div className="mb-1 font-medium text-slate-400">Ovozlar</div>
          {Object.entries(votes).map(([v, t]) => <div key={v}>{nm(v)} → <b>{nm(t)}</b></div>)}
        </Panel>
      )}
      {!spectator && (mine ? <Waiting>Ovoz berdingiz. Boshqalarni kuting…</Waiting> : <Btn variant="gold" disabled={!sel} onClick={vote}><Vote size={18} /> Ovoz berish</Btn>)}
      {err && <div className="text-center text-xs text-rose-300">{err}</div>}
    </>
  );
}

/* ---------- O'yin yakuni ---------- */
export function Ended({ code, room, players, isHost }) {
  const mafiaWon = room.winner === 'mafia';
  const roles = room.reveal || {};
  return (
    <>
      <EventBanner event={room.event} title="So‘nggi voqea" />
      <Panel className={`py-8 text-center ${mafiaWon ? '!border-rose-500/50' : '!border-emerald-500/50'}`}>
        <Trophy size={64} className={`mx-auto ${mafiaWon ? 'text-rose-400' : 'text-emerald-400'}`} strokeWidth={1.4} />
        <div className="font-display gold-text mt-3 text-4xl font-black">{mafiaWon ? 'Mafiya yutdi!' : 'Tinch aholi yutdi!'}</div>
        <p className="mt-1 text-slate-300">{mafiaWon ? 'Shahar mafiya qo‘liga o‘tdi.' : 'Barcha mafiyalar fosh etildi.'}</p>
      </Panel>
      <Panel className="space-y-2">
        {players.filter((p) => roles[p.id]).map((p) => {
          const I = ROLE_ICON[roles[p.id]] || Ghost;
          return <div key={p.id} className="flex items-center gap-3"><Avatar p={p} size={36} /><span className="min-w-0 flex-1 truncate">{p.name}</span><span className={`flex items-center gap-1 text-sm ${ROLE_COLOR[roles[p.id]]}`}><I size={14} />{ROLES[roles[p.id]]?.name}</span></div>;
        })}
      </Panel>
      {isHost ? <Btn onClick={() => restart(code, players)}><RotateCcw size={18} /> Qayta o‘ynash</Btn> : <Waiting>Xona egasi qayta boshlashini kuting…</Waiting>}
    </>
  );
}
