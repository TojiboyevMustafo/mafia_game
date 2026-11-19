import { ref, get, set, update, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 15;
export const MIN_REVEAL_MS = 5000; // rol kartasi kamida shuncha ko'rinib turadi

export const ROLES = {
  mafia: { name: 'Mafiya', task: 'Har tunda bitta o‘yinchini yo‘q qilasiz. Fosh bo‘lmang!' },
  doctor: { name: 'Shifokor', task: 'Har tunda bitta o‘yinchini davolaysiz. O‘zingizni ham qutqara olasiz.' },
  cop: { name: 'Komissar', task: 'Har tunda bitta o‘yinchini tekshirib, mafiya ekanini bilasiz.' },
  civil: { name: 'Tinch aholi', task: 'Kunduzi muhokama qilib, ovoz bilan mafiyani topasiz.' },
};

const P = (path) => ref(db, path);
const R = (c) => P(`rooms/${c}`);
const rootUpdate = (obj) => update(ref(db), obj);
// Bir xonaga tegishli barcha ma'lumotlar shu yo'llarda turadi
const ROOM_PATHS = ['rooms', 'chat', 'roles', 'mafiaTeam', 'actions', 'copResult', 'signals', 'voice', 'presence'];

export const live = (p) => !!p && p.alive === true && !p.gone;
export const tally = (votes = {}) => { const c = {}; Object.values(votes).forEach((t) => { c[t] = (c[t] || 0) + 1; }); return c; };
const topOf = (counts) => { const max = Math.max(0, ...Object.values(counts)); return max ? Object.keys(counts).filter((k) => counts[k] === max) : []; };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function checkWinner(players, roles) {
  if (!roles || !Object.keys(roles).length) return null;
  const alive = players.filter(live);
  const m = alive.filter((p) => roles[p.id] === 'mafia').length;
  if (m === 0) return 'civil';
  if (m >= alive.length - m) return 'mafia';
  return null;
}

const mkPlayer = (u) => ({ tg: u.tg, name: u.name, photo: u.photo || '', alive: true, joinedAt: Date.now() });

export const deleteRoom = (code) => rootUpdate(Object.fromEntries(ROOM_PATHS.map((p) => [`${p}/${code}`, null])));

export async function createRoom(u) {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if ((await get(R(code))).exists()) continue;
    await set(R(code), { host: u.id, phase: 'lobby', round: 0, createdAt: Date.now(), players: { [u.id]: mkPlayer(u) } });
    return code;
  }
  throw new Error('Kod yaratib bo‘lmadi, qayta urinib ko‘ring');
}

export async function joinRoom(code, u) {
  const snap = await get(R(code));
  if (!snap.exists()) throw new Error('Xona topilmadi');
  const r = snap.val();
  const base = `rooms/${code}/players/${u.id}`;
  if (r.players?.[u.id]) {
    return rootUpdate({ [`${base}/name`]: u.name, [`${base}/photo`]: u.photo || '', [`${base}/gone`]: null });
  }
  if (r.phase !== 'lobby') throw new Error('O‘yin allaqachon boshlangan');
  if (Object.keys(r.players || {}).length >= MAX_PLAYERS) throw new Error(`Xona to‘lgan (${MAX_PLAYERS} kishi)`);
  return set(P(base), mkPlayer(u));
}

export async function leaveRoom(code, room, players, uid) {
  const others = players.filter((p) => p.id !== uid && !p.gone);
  if (!others.length) return deleteRoom(code).catch(() => {}); // oxirgi chiqqan xonani va barcha ma'lumotni o'chiradi
  const upd = {};
  if (room.phase === 'lobby') upd[`rooms/${code}/players/${uid}`] = null;
  else upd[`rooms/${code}/players/${uid}/gone`] = true;
  if (room.host === uid) upd[`rooms/${code}/host`] = (others.find(live) || others[0]).id;
  return rootUpdate(upd);
}

export function startGame(code, players) {
  const ids = shuffle(players.filter((p) => !p.gone).map((p) => p.id));
  const m = Math.max(1, Math.floor(ids.length / 4));
  const roles = {}, team = {};
  ids.forEach((id, i) => {
    roles[id] = i < m ? 'mafia' : i === m ? 'doctor' : i === m + 1 ? 'cop' : 'civil';
    if (roles[id] === 'mafia') team[id] = true;
  });
  const upd = {
    [`rooms/${code}/phase`]: 'reveal', [`rooms/${code}/round`]: 0, [`rooms/${code}/event`]: null,
    [`rooms/${code}/winner`]: null, [`rooms/${code}/votes`]: null, [`rooms/${code}/reveal`]: null,
    [`rooms/${code}/revealStart`]: Date.now(),
    [`roles/${code}`]: roles, [`mafiaTeam/${code}`]: team,
    [`actions/${code}`]: null, [`copResult/${code}`]: null, [`chat/${code}/mafia`]: null,
  };
  ids.forEach((id) => { upd[`rooms/${code}/players/${id}/alive`] = true; upd[`rooms/${code}/players/${id}/ready`] = null; upd[`rooms/${code}/players/${id}/revealAt`] = null; });
  return rootUpdate(upd);
}

export const beginNight = (code, round) => rootUpdate({
  [`rooms/${code}/phase`]: 'night', [`rooms/${code}/round`]: round, [`rooms/${code}/votes`]: null, [`actions/${code}`]: null,
});

export const submitNight = (code, role, uid, target) =>
  set(P(role === 'mafia' ? `actions/${code}/mafia/${uid}` : `actions/${code}/${role}`), target);
export const submitVote = (code, uid, target) => set(P(`rooms/${code}/votes/${uid}`), target);
export const markReady = (code, uid) => set(P(`rooms/${code}/players/${uid}/ready`), true);
export const markRevealAt = (code, uid) => set(P(`rooms/${code}/players/${uid}/revealAt`), serverTimestamp());
export const kickPlayer = (code, id) => rootUpdate({ [`rooms/${code}/players/${id}/gone`]: true, [`rooms/${code}/players/${id}/alive`]: false });

export const writeCopResult = (code, copId, target, round, roles) =>
  set(P(`copResult/${code}/${copId}`), { target, isMafia: roles[target] === 'mafia', round });

const nameOf = (players, id) => players.find((p) => p.id === id)?.name || '?';

function finish(code, upd, winner, roles) {
  if (winner) { upd[`rooms/${code}/phase`] = 'ended'; upd[`rooms/${code}/reveal`] = roles; }
  upd[`rooms/${code}/winner`] = winner || null;
  return rootUpdate(upd);
}

export function endGame(code, winner, roles) {
  return finish(code, {}, winner, roles);
}

export function resolveNight(code, room, players, roles, actions = {}) {
  const tops = topOf(tally(actions.mafia));
  const target = tops.length ? pick(tops) : null;
  let text = 'Tun tinch o‘tdi. Hech kim o‘ldirilmadi.', killed = null;
  if (target) {
    if (target === actions.doctor) text = `Mafiya ${nameOf(players, target)}ni nishonga oldi, lekin Shifokor uni qutqarib qoldi! 🩺`;
    else { killed = target; text = `${nameOf(players, target)} tunda mafiya tomonidan o‘ldirildi. 💀`; }
  }
  const after = players.map((p) => (p.id === killed ? { ...p, alive: false } : p));
  const winner = checkWinner(after, roles);
  const upd = {
    [`rooms/${code}/event`]: { kind: 'night', text, killed, round: room.round },
    [`rooms/${code}/phase`]: 'day', [`rooms/${code}/votes`]: null,
  };
  if (killed) upd[`rooms/${code}/players/${killed}/alive`] = false;
  return finish(code, upd, winner, roles);
}

export function resolveDay(code, room, players, roles) {
  const top = topOf(tally(room.votes));
  const out = top.length === 1 ? top[0] : null;
  const text = out
    ? `${nameOf(players, out)} ko‘pchilik ovoz bilan o‘yindan chiqarildi. U ${ROLES[roles[out]]?.name} edi.`
    : 'Ovozlar teng bo‘ldi — hech kim chiqarilmadi.';
  const after = players.map((p) => (p.id === out ? { ...p, alive: false } : p));
  const winner = checkWinner(after, roles);
  const upd = { [`rooms/${code}/event`]: { kind: 'vote', text, out, round: room.round } };
  if (out) upd[`rooms/${code}/players/${out}/alive`] = false;
  if (!winner) Object.assign(upd, {
    [`rooms/${code}/phase`]: 'night', [`rooms/${code}/round`]: room.round + 1,
    [`rooms/${code}/votes`]: null, [`actions/${code}`]: null,
  });
  return finish(code, upd, winner, roles);
}

export function restart(code, players) {
  const upd = {
    [`rooms/${code}/phase`]: 'lobby', [`rooms/${code}/round`]: 0, [`rooms/${code}/event`]: null,
    [`rooms/${code}/winner`]: null, [`rooms/${code}/votes`]: null, [`rooms/${code}/reveal`]: null, [`rooms/${code}/revealStart`]: null,
    [`roles/${code}`]: null, [`mafiaTeam/${code}`]: null, [`actions/${code}`]: null, [`copResult/${code}`]: null, [`chat/${code}`]: null,
  };
  players.forEach((p) => {
    if (p.gone) upd[`rooms/${code}/players/${p.id}`] = null;
    else { upd[`rooms/${code}/players/${p.id}/alive`] = true; upd[`rooms/${code}/players/${p.id}/ready`] = null; upd[`rooms/${code}/players/${p.id}/revealAt`] = null; }
  });
  return rootUpdate(upd);
}
