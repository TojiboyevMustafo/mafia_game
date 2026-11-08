import { ref, get, set, update, remove } from 'firebase/database';
import { db } from './firebase';

const R = (c) => ref(db, `rooms/${c}`);

export const MIN_PLAYERS = 4;
export const ROLES = {
  mafia: { name: 'Mafiya', desc: 'Har tunda bitta o‘yinchini yo‘q qiling. Fosh bo‘lmang.' },
  doctor: { name: 'Shifokor', desc: 'Har tunda bitta o‘yinchini davolang (o‘zingizni ham mumkin).' },
  cop: { name: 'Komissar', desc: 'Har tunda bitta o‘yinchini tekshiring: u mafiyami yoki yo‘q.' },
  civil: { name: 'Tinch aholi', desc: 'Kunduzi muhokama qiling va mafiyani ovoz bilan toping.' },
};

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const tally = (votes = {}) => {
  const c = {}; Object.values(votes).forEach((t) => { c[t] = (c[t] || 0) + 1; }); return c;
};
const topOf = (counts) => {
  const max = Math.max(0, ...Object.values(counts));
  return max ? Object.keys(counts).filter((k) => counts[k] === max) : [];
};

export function checkWinner(players) {
  const alive = players.filter((p) => p.alive);
  const m = alive.filter((p) => p.role === 'mafia').length;
  if (!players.some((p) => p.role)) return null;
  if (m === 0) return 'civil';
  if (m >= alive.length - m) return 'mafia';
  return null;
}

const mkPlayer = (u) => ({ id: u.id, name: u.name, photo: u.photo || '', alive: true, joinedAt: Date.now() });

export async function createRoom(u) {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if ((await get(R(code))).exists()) continue;
    await set(R(code), { host: u.id, phase: 'lobby', round: 0, createdAt: Date.now(), players: { [u.id]: mkPlayer(u) } });
    return code;
  }
  throw new Error("Kod yaratib bo'lmadi, qayta urinib ko'ring");
}

export async function joinRoom(code, u) {
  const snap = await get(R(code));
  if (!snap.exists()) throw new Error('Xona topilmadi');
  const r = snap.val();
  const ex = r.players?.[u.id];
  if (ex) return update(ref(db, `rooms/${code}/players/${u.id}`), { name: u.name, photo: u.photo || '', gone: null });
  if (r.phase !== 'lobby') throw new Error("O'yin allaqachon boshlangan");
  if (Object.keys(r.players || {}).length >= 15) throw new Error("Xona to'lgan (15 kishi)");
  return set(ref(db, `rooms/${code}/players/${u.id}`), mkPlayer(u));
}

export async function leaveRoom(code, room, uid) {
  const others = Object.values(room.players || {}).filter((p) => p.id !== uid && !p.gone);
  if (!others.length) return remove(R(code));
  const upd = {};
  if (room.phase === 'lobby') upd[`players/${uid}`] = null;
  else { upd[`players/${uid}/alive`] = false; upd[`players/${uid}/gone`] = true; }
  if (room.host === uid) upd.host = (others.find((p) => p.alive) || others[0]).id;
  return update(R(code), upd);
}

export function startGame(code, players) {
  const ids = shuffle(players.map((p) => p.id));
  const m = Math.max(1, Math.floor(ids.length / 4));
  const upd = { phase: 'reveal', round: 0, night: null, votes: null, event: null, winner: null };
  ids.forEach((id, i) => {
    upd[`players/${id}/role`] = i < m ? 'mafia' : i === m ? 'doctor' : i === m + 1 ? 'cop' : 'civil';
    upd[`players/${id}/alive`] = true;
  });
  return update(R(code), upd);
}

export const beginNight = (code, round) => update(R(code), { phase: 'night', round, night: null, votes: null });
export const submitNight = (code, role, uid, target) =>
  update(R(code), { [role === 'mafia' ? `night/mafia/${uid}` : `night/${role}`]: target });
export const submitVote = (code, uid, target) => update(R(code), { [`votes/${uid}`]: target });

export function restart(code, players) {
  const upd = { phase: 'lobby', round: 0, night: null, votes: null, event: null, winner: null };
  players.forEach((p) => {
    if (p.gone) upd[`players/${p.id}`] = null;
    else { upd[`players/${p.id}/alive`] = true; upd[`players/${p.id}/role`] = null; }
  });
  return update(R(code), upd);
}

export const endGame = (code, winner) => update(R(code), { phase: 'ended', winner });

const nameOf = (players, id) => players.find((p) => p.id === id)?.name || '?';

export function resolveNight(code, room, players) {
  const n = room.night || {};
  const target = (() => { const t = topOf(tally(n.mafia)); return t[Math.floor(Math.random() * t.length)]; })();
  let text = "Tun tinch o'tdi. Hech kim o'ldirilmadi.", killed = null;
  if (target) {
    if (target === n.doctor) text = `Mafiya ${nameOf(players, target)}ni nishonga oldi, lekin Shifokor uni qutqarib qoldi! 🩺`;
    else { killed = target; text = `${nameOf(players, target)} tunda mafiya tomonidan o'ldirildi. 💀`; }
  }
  const after = players.map((p) => (p.id === killed ? { ...p, alive: false } : p));
  const winner = checkWinner(after);
  const upd = { event: { kind: 'night', text, killed, round: room.round }, phase: winner ? 'ended' : 'day', votes: null, winner: winner || null };
  if (killed) upd[`players/${killed}/alive`] = false;
  return update(R(code), upd);
}

export function resolveDay(code, room, players) {
  const top = topOf(tally(room.votes));
  const out = top.length === 1 ? top[0] : null;
  const text = out
    ? `${nameOf(players, out)} ko'pchilik ovoz bilan o'yindan chiqarildi. U ${ROLES[players.find((p) => p.id === out)?.role]?.name} edi.`
    : "Ovozlar teng bo'ldi — hech kim chiqarilmadi.";
  const after = players.map((p) => (p.id === out ? { ...p, alive: false } : p));
  const winner = checkWinner(after);
  const upd = { event: { kind: 'vote', text, out, round: room.round }, winner: winner || null };
  if (out) upd[`players/${out}/alive`] = false;
  if (winner) upd.phase = 'ended';
  else Object.assign(upd, { phase: 'night', round: room.round + 1, night: null, votes: null });
  return update(R(code), upd);
}
