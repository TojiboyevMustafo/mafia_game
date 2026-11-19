import { useEffect, useMemo, useRef, useState } from 'react';
import { ref, onValue, set, remove, onDisconnect } from 'firebase/database';
import { Loader2, Plus, DoorOpen, LogOut, Skull, Eye, Sun, Moon, Drama } from 'lucide-react';
import { db, ensureAuth } from './firebase';
import { initTelegram } from './telegram';
import { uz } from './errors';
import {
  ROLES, live, createRoom, joinRoom, leaveRoom, beginNight, resolveNight, resolveDay, endGame, checkWinner, writeCopResult,
} from './game';
import { Stage, Avatar, Btn, RulesModal, SpeakingCtx } from './ui';
import { ChatButton, ChatSheet, ChatToast, useChat } from './chat';
import { useVoice } from './voice';
import { Lobby, Reveal, Night, Day, Ended, VoiceBar, ROLE_ICON, ROLE_COLOR } from './screens';

function useVal(path) {
  const [v, setV] = useState(null);
  useEffect(() => {
    if (!path) { setV(null); return undefined; }
    return onValue(ref(db, path), (s) => setV(s.val()), () => setV(null));
  }, [path]);
  return v;
}

const Loader = () => <div className="relative z-10 flex min-h-dvh items-center justify-center"><Loader2 className="animate-spin text-rose-500" size={36} /></div>;

/* ---------- Bosh sahifa ---------- */
const Hat = () => (
  <svg width="112" height="84" viewBox="0 0 112 84" aria-hidden className="drop-shadow-[0_0_18px_rgba(255,42,77,.55)]">
    <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e3a1" /><stop offset=".6" stopColor="#d4a94c" /><stop offset="1" stopColor="#8a6a1f" /></linearGradient></defs>
    <ellipse cx="56" cy="58" rx="52" ry="12" fill="#0b0610" stroke="url(#hg)" strokeWidth="2" />
    <path d="M24 58 C20 14 92 14 88 58Z" fill="#14091c" stroke="url(#hg)" strokeWidth="2" />
    <path d="M23 52 C40 62 72 62 89 52 L88.5 44 C72 54 40 54 23.5 44Z" fill="#a3122f" stroke="url(#hg)" strokeWidth="1" />
    <path d="M44 22 C54 16 62 18 70 24" stroke="#fff" strokeOpacity=".25" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

function Home({ user, onCreate, onJoin, busy, error }) {
  const [code, setCode] = useState('');
  return (
    <div className="safe-bottom safe-top relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="flex items-center gap-3"><Avatar p={user} size={40} /><div className="font-medium text-slate-300">{user.name}</div></div>
      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <Hat />
        <h1 className="title-mafia mt-3 text-6xl">Mafiya</h1>
        <div className="mt-2 flex w-full max-w-[16rem] items-center gap-3"><span className="rule-gold" /><span className="font-display text-xs tracking-[.45em] text-rose-400">Friends UZ</span><span className="rule-gold r" /></div>
        <p className="mt-4 max-w-[19rem] text-slate-200 drop-shadow">Shahar uxlaydi — mafiya uyg‘onadi. Do‘stlaringiz orasidan xoinni toping.</p>
      </div>
      {error && <div className="mb-3 rounded-2xl bg-rose-500/15 p-3 text-center text-sm text-rose-300">{error}</div>}
      <Btn onClick={onCreate} disabled={busy} className="pulse-neon">{busy ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />} Yangi xona yaratish</Btn>
      <div className="my-4 text-center text-sm text-slate-500">yoki kod bilan kiring</div>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 xonali kod"
          className="min-w-0 flex-1 rounded-2xl border bg-white/5 px-4 text-center text-xl font-bold tracking-[.3em] hairline placeholder:text-sm placeholder:font-normal placeholder:tracking-normal" />
        <button disabled={code.length !== 6 || busy} onClick={() => onJoin(code)} aria-label="Qo‘shilish" className="btn btn-gold" style={{ width: 64 }}><DoorOpen /></button>
      </div>
    </div>
  );
}

/* ---------- Xona ---------- */
function Room({ code, user, room, onExit }) {
  const uid = user.id;
  const players = useMemo(() => Object.entries(room.players || {}).map(([id, p]) => ({ ...p, id })).sort((a, b) => a.joinedAt - b.joinedAt), [room.players]);
  const me = players.find((p) => p.id === uid);
  const isHost = room.host === uid;
  const phase = room.phase;
  const inGame = phase === 'night' || phase === 'day';
  const alive = live(me);
  const spectator = !!me && !alive && phase !== 'lobby';

  const role = useVal(`roles/${code}/${uid}`);
  const team = Object.keys(useVal(role === 'mafia' ? `mafiaTeam/${code}` : null) || {});
  const roles = useVal(isHost ? `roles/${code}` : null);
  const actions = useVal(isHost && phase === 'night' ? `actions/${code}` : null);
  const presence = useVal(`presence/${code}`);
  const offset = useVal('.info/serverTimeOffset') || 0;

  const [watch, setWatch] = useState(false);
  const [rules, setRules] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState('room');
  const guard = useRef(''), copGuard = useRef('');

  /* --- Ovozli chat guruhi: faza va rolga qarab --- */
  const group = phase === 'lobby' ? 'lobby' : phase === 'day' && alive ? 'day' : phase === 'night' && role === 'mafia' && alive ? 'mafia' : null;
  const members = group === 'lobby' ? players.filter((p) => !p.gone && p.id !== uid).map((p) => p.id)
    : group === 'day' ? players.filter((p) => live(p) && p.id !== uid).map((p) => p.id)
    : group === 'mafia' ? players.filter((p) => live(p) && team.includes(p.id) && p.id !== uid).map((p) => p.id) : [];
  const voice = useVoice({ code, uid, group, members });
  const chat = useChat({ code, uid, role, open: chatOpen, tab });

  useEffect(() => { if (phase === 'night' && role === 'mafia') setTab('mafia'); else setTab('room'); }, [phase, role]);
  useEffect(() => { if (alive) setWatch(false); }, [alive]);
  useEffect(() => { if (phase === 'lobby') { guard.current = ''; copGuard.current = ''; } }, [phase]);

  /* --- Onlayn holat (xona egasi uzilsa, boshqasi egalikni oladi) --- */
  useEffect(() => {
    const pr = ref(db, `presence/${code}/${uid}`);
    set(pr, true).catch(() => {});
    onDisconnect(pr).remove().catch(() => {});
    return () => { remove(pr).catch(() => {}); };
  }, [code, uid]);
  useEffect(() => {
    if (isHost || !presence || presence[room.host]) return undefined;
    const t = setTimeout(() => {
      const first = players.filter((p) => !p.gone && presence[p.id]).map((p) => p.id).sort()[0];
      if (first === uid) set(ref(db, `rooms/${code}/host`), uid).catch(() => {});
    }, 8000);
    return () => clearTimeout(t);
  }, [isHost, presence, room.host, players, uid, code]);

  /* --- O'yin mantig'i (xona egasi qurilmasida) --- */
  useEffect(() => {
    if (!isHost || !roles) return;
    if (phase === 'reveal') {
      const act = players.filter((p) => !p.gone);
      const k = `rv-${room.revealStart}`;
      if (act.length && act.every((p) => p.ready) && guard.current !== k) { guard.current = k; beginNight(code, 1); }
      return;
    }
    if (!inGame) return;
    const aliveP = players.filter(live);
    const w = checkWinner(players, roles);
    const a = actions || {};
    const ready = phase === 'night'
      ? aliveP.filter((p) => roles[p.id] === 'mafia').every((p) => a.mafia?.[p.id])
        && (!aliveP.some((p) => roles[p.id] === 'doctor') || a.doctor)
        && (!aliveP.some((p) => roles[p.id] === 'cop') || a.cop)
      : aliveP.every((p) => room.votes?.[p.id]);
    const key = `${phase}-${room.round}-${w ? 'w' : ready ? 'r' : 'n'}`;
    if (key === guard.current || !(w || ready)) return;
    guard.current = key;
    if (w) endGame(code, w, roles);
    else if (phase === 'night') resolveNight(code, room, players, roles, a);
    else resolveDay(code, room, players, roles);
  }, [room, players, roles, actions, isHost, inGame, phase, code]);

  useEffect(() => {
    if (!isHost || !roles || phase !== 'night' || !actions?.cop) return;
    const cop = players.find((p) => roles[p.id] === 'cop' && live(p));
    const k = `cop-${room.round}`;
    if (!cop || copGuard.current === k) return;
    copGuard.current = k;
    writeCopResult(code, cop.id, actions.cop, room.round, roles).catch(() => {});
  }, [actions, roles, isHost, phase, room.round, players, code]);

  if (!me) return <Loader />;

  const exit = async () => { try { voice.leave(); await leaveRoom(code, room, players, uid); } finally { onExit(); } };
  const confirmExit = () => { if (window.confirm('Xonadan chiqasizmi?')) exit(); };
  const forceNext = () => (phase === 'night' ? resolveNight(code, room, players, roles || {}, actions || {}) : resolveDay(code, room, players, roles || {}));
  const day = phase === 'day';
  const RIcon = ROLE_ICON[role];
  const title = phase === 'lobby' ? 'Kutish xonasi' : phase === 'reveal' ? 'Rollar' : phase === 'ended' ? 'O‘yin tugadi' : `${room.round}-${day ? 'kun' : 'tun'}`;

  return (
    <SpeakingCtx.Provider value={voice.speaking}>
      <Stage day={day} dim />
      <div className="safe-top relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28">
        <header className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300">
            {day ? <Sun size={18} className="shrink-0 text-amber-400" /> : <Moon size={18} className="shrink-0 text-indigo-300" />}
            <span className="font-display gold-text text-lg font-bold">{title}</span>
            {phase !== 'lobby' && RIcon && role && <span className={`flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs ${ROLE_COLOR[role]}`}><RIcon size={12} />{ROLES[role].name}</span>}
          </div>
          <button onClick={() => setRules(true)} aria-label="Qoidalar" className="rounded-xl bg-white/10 px-2.5 py-2 text-xs font-bold">?</button>
          <button onClick={confirmExit} aria-label="Chiqish" className="rounded-xl bg-white/10 p-2"><LogOut size={18} /></button>
        </header>

        <div className="mt-3"><VoiceBar voice={voice} group={group} phase={phase} alive={alive} players={players} /></div>

        {spectator && phase !== 'ended' && watch && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-500/15 px-3 py-2 text-sm text-slate-300"><Eye size={16} /> Siz tomoshabinsiz — harakat qila olmaysiz</div>
        )}

        <main className="animate-fade mt-4 flex-1 space-y-4" key={phase + room.round}>
          {phase === 'lobby' && <Lobby code={code} players={players} isHost={isHost} hostId={room.host} />}
          {phase === 'reveal' && <Reveal code={code} me={me} role={role} team={team} players={players} isHost={isHost} room={room} offset={offset} />}
          {phase === 'night' && <Night code={code} room={room} players={players} me={me} role={role} spectator={spectator} />}
          {phase === 'day' && <Day code={code} room={room} players={players} me={me} spectator={spectator} />}
          {phase === 'ended' && <Ended code={code} room={room} players={players} isHost={isHost} />}

          {inGame && (
            <div className="panel p-4">
              <div className="mb-2 text-sm text-slate-400">Tirik: {players.filter(live).length} / {players.filter((p) => !p.gone).length}</div>
              <div className="flex flex-wrap gap-2">{players.filter((p) => !p.gone).map((p) => <div key={p.id} title={p.name} className="relative"><Avatar p={{ ...p, alive: live(p) }} size={36} />{!live(p) && <Skull size={14} className="absolute -bottom-1 -right-1 rounded-full bg-black p-0.5 text-rose-400" />}</div>)}</div>
              {isHost && <button onClick={forceNext} className="mt-3 text-xs text-slate-500 underline">Kutmasdan davom ettirish (xona egasi)</button>}
            </div>
          )}
        </main>
      </div>

      <ChatToast toast={chat.toast} onOpen={() => { setTab(chat.toast.ch); setChatOpen(true); chat.clearToast(); }} />
      {!chatOpen && <ChatButton unread={chat.unread} onClick={() => setChatOpen(true)} />}
      {chatOpen && <ChatSheet code={code} me={me} role={role} phase={phase} alive={alive} chat={chat} tab={tab} setTab={setTab} onClose={() => setChatOpen(false)} />}
      {rules && <RulesModal onClose={() => setRules(false)} />}

      {spectator && inGame && !watch && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 p-4 sm:items-center">
          <div className="animate-fade panel-strong w-full max-w-sm rounded-3xl p-6 text-center" style={{ borderColor: 'rgba(255,42,77,.5)' }}>
            <Skull size={56} className="mx-auto text-rose-500" strokeWidth={1.4} />
            <h3 className="font-display mt-3 text-3xl font-black">Siz o‘ldirildingiz!</h3>
            <p className="mt-2 text-slate-300">O‘yinni kuzatishda davom etasizmi yoki chiqasizmi?</p>
            <div className="mt-5 space-y-2">
              <Btn onClick={() => setWatch(true)}><Eye size={18} /> O‘yinni kuzatish</Btn>
              <Btn variant="ghost" onClick={exit}><LogOut size={18} /> Chiqish</Btn>
            </div>
          </div>
        </div>
      )}
    </SpeakingCtx.Provider>
  );
}

/* ---------- Ildiz ---------- */
export default function App() {
  const [boot] = useState(initTelegram);
  const [uid, setUid] = useState(null);
  const [fatal, setFatal] = useState('');
  const [code, setCode] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoJoined = useRef(false);
  const user = useMemo(() => (uid ? { ...boot.user, id: uid } : null), [uid, boot]);

  useEffect(() => { ensureAuth().then(setUid).catch((e) => setFatal(uz(e))); }, []);

  const enter = async (c, create = false) => {
    setBusy(true); setError('');
    try {
      if (create) c = await createRoom(user); else await joinRoom(c, user);
      setCode(c);
    } catch (e) { setError(uz(e)); }
    setBusy(false);
  };

  useEffect(() => {
    if (user && boot.startParam && !autoJoined.current) { autoJoined.current = true; enter(String(boot.startParam).replace(/\D/g, '').slice(0, 6)); }
  }, [user]); // eslint-disable-line

  useEffect(() => {
    if (!code) { setRoom(null); return undefined; }
    return onValue(ref(db, `rooms/${code}`), (s) => {
      if (s.exists()) setRoom(s.val());
      else { setCode(null); setError('Xona yopildi.'); }
    }, (e) => { setError(uz(e)); setCode(null); });
  }, [code]);

  if (fatal) return (
    <><Stage /><div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-display text-2xl font-bold text-rose-400">Ulanib bo‘lmadi</div><p className="text-slate-300">{fatal}</p>
      <Btn onClick={() => location.reload()}>Qayta urinish</Btn></div></>
  );
  if (!user) return <><Stage /><Loader /></>;
  if (code && room) return <Room key={code} code={code} user={user} room={room} onExit={() => { setCode(null); setRoom(null); }} />;
  if (code) return <><Stage /><Loader /></>;
  return <><Stage /><Home user={user} busy={busy} error={error} onCreate={() => enter(null, true)} onJoin={(c) => enter(c)} /></>;
}
