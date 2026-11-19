import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, remove, push, onDisconnect } from 'firebase/database';
import { db } from './firebase';

// WebRTC mesh: har bir juft o'yinchi o'rtasida to'g'ridan-to'g'ri audio aloqa.
// Signaling (offer/answer/ICE) Firebase Realtime Database orqali o'tadi.
function iceConfig() {
  const e = import.meta.env;
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  if (e.VITE_TURN_URL) servers.push({ urls: e.VITE_TURN_URL.split(',').map((s) => s.trim()), username: e.VITE_TURN_USERNAME, credential: e.VITE_TURN_CREDENTIAL });
  return { iceServers: servers };
}
const micError = (e) => {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Mikrofonga ruxsat berilmadi. Telefon sozlamalarida Telegram uchun mikrofonni yoqing.';
  if (n === 'NotFoundError') return 'Mikrofon topilmadi.';
  if (n === 'NotReadableError') return 'Mikrofon band. Boshqa ilovani yoping.';
  return 'Mikrofonni yoqib bo‘lmadi.';
};
const newSid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** group: null | 'lobby' | 'day' | 'mafia'; members: shu guruhdagi boshqa o'yinchilar uid ro'yxati */
export function useVoice({ code, uid, group, members }) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [inVoice, setInVoice] = useState({});
  const [speaking, setSpeaking] = useState(() => new Set());
  const [linked, setLinked] = useState({});
  const S = useRef({ stream: null, ctx: null, peers: new Map(), analysers: new Map() });

  useEffect(() => onValue(ref(db, `voice/${code}`), (s) => setInVoice(s.val() || {}), () => {}), [code]);

  /* ---------- Analizator (kim gapirayotganini aniqlash) ---------- */
  function addAnalyser(key, stream) {
    const c = S.current;
    if (!c.ctx) return;
    try {
      const src = c.ctx.createMediaStreamSource(stream);
      const an = c.ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      c.analysers.set(key, { an, src, buf: new Uint8Array(an.fftSize) });
    } catch {}
  }

  /* ---------- Peer hayot sikli ---------- */
  function teardownPc(e) {
    if (e.pc) { e.pc.ontrack = e.pc.onicecandidate = e.pc.onconnectionstatechange = null; try { e.pc.close(); } catch {} e.pc = null; }
    if (e.audio) { e.audio.srcObject = null; e.audio.remove(); e.audio = null; }
  }
  function flush(e) { e.cands.splice(0).forEach((c) => e.pc?.addIceCandidate(c).catch(() => {})); }

  function makePc(peer, e) {
    const c = S.current;
    const pc = new RTCPeerConnection(iceConfig());
    e.pc = pc;
    c.stream?.getTracks().forEach((t) => pc.addTrack(t, c.stream));
    pc.onicecandidate = (ev) => {
      if (ev.candidate) push(ref(db, `signals/${code}/${peer}/${uid}/ice`), { sid: e.sid, c: ev.candidate.toJSON() }).catch(() => {});
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      if (!e.audio) { const a = document.createElement('audio'); a.autoplay = true; a.playsInline = true; a.style.display = 'none'; document.body.appendChild(a); e.audio = a; }
      e.audio.srcObject = stream;
      e.audio.play().catch(() => {});
      addAnalyser(peer, stream);
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      setLinked((l) => ({ ...l, [peer]: st }));
      if (st === 'failed') retry(peer, 600);
      if (st === 'disconnected') retry(peer, 4000);
    };
    return pc;
  }

  function retry(peer, delay) {
    const e = S.current.peers.get(peer);
    if (!e) return;
    clearTimeout(e.timer);
    e.timer = setTimeout(() => {
      if (S.current.peers.get(peer) !== e) return;
      if (e.pc && e.pc.connectionState === 'connected') return;
      if (e.initiator) startSession(peer);
    }, delay);
  }

  async function startSession(peer) {
    const e = S.current.peers.get(peer);
    if (!e) return;
    teardownPc(e);
    Object.assign(e, { sid: newSid(), remoteSet: false, cands: [], seen: new Set() });
    const pc = makePc(peer, e);
    try {
      const offer = await pc.createOffer();
      if (S.current.peers.get(peer) !== e || e.pc !== pc) return;
      await set(ref(db, `signals/${code}/${peer}/${uid}`), { sid: e.sid, type: 'offer', sdp: offer.sdp, ts: Date.now() });
      await pc.setLocalDescription(offer);
    } catch (err) { console.warn('offer xatosi', err); retry(peer, 2000); }
  }

  async function onSignal(peer, v) {
    const e = S.current.peers.get(peer);
    if (!e || !v) return;
    try {
      if (v.type === 'offer' && !e.initiator && v.sid !== e.sid) {
        teardownPc(e);
        Object.assign(e, { sid: v.sid, remoteSet: false, cands: [], seen: new Set() });
        const pc = makePc(peer, e);
        await pc.setRemoteDescription({ type: 'offer', sdp: v.sdp });
        e.remoteSet = true; flush(e);
        const ans = await pc.createAnswer();
        await set(ref(db, `signals/${code}/${peer}/${uid}`), { sid: v.sid, type: 'answer', sdp: ans.sdp, ts: Date.now() });
        await pc.setLocalDescription(ans);
      } else if (v.type === 'answer' && e.initiator && v.sid === e.sid && e.pc?.signalingState === 'have-local-offer') {
        await e.pc.setRemoteDescription({ type: 'answer', sdp: v.sdp });
        e.remoteSet = true; flush(e);
      }
      if (v.ice && v.sid === e.sid) {
        for (const [k, item] of Object.entries(v.ice)) {
          if (item.sid !== e.sid || e.seen.has(k)) continue;
          e.seen.add(k);
          if (e.remoteSet && e.pc) e.pc.addIceCandidate(item.c).catch(() => {}); else e.cands.push(item.c);
        }
      }
    } catch (err) { console.warn('signal xatosi', err); }
  }

  function openPeer(peer) {
    const c = S.current;
    if (c.peers.has(peer)) return;
    const e = { pc: null, audio: null, sid: null, cands: [], seen: new Set(), remoteSet: false, timer: null, initiator: uid < peer, unsub: null };
    c.peers.set(peer, e);
    e.unsub = onValue(ref(db, `signals/${code}/${uid}/${peer}`), (s) => onSignal(peer, s.val()), () => {});
    if (e.initiator) startSession(peer);
  }
  function closePeer(peer) {
    const c = S.current, e = c.peers.get(peer);
    if (!e) return;
    clearTimeout(e.timer); e.unsub?.(); teardownPc(e);
    c.peers.delete(peer); c.analysers.delete(peer);
    remove(ref(db, `signals/${code}/${peer}/${uid}`)).catch(() => {});
    setLinked((l) => { const n = { ...l }; delete n[peer]; return n; });
  }

  /* ---------- Ommaviy amallar ---------- */
  async function join() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('Bu qurilmada mikrofon qo‘llab-quvvatlanmaydi.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const c = S.current;
      c.stream = stream;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !c.ctx) c.ctx = new AC();
      c.ctx?.resume?.();
      addAnalyser('me', stream);
      const pr = ref(db, `voice/${code}/${uid}`);
      await set(pr, { on: true, muted: false });
      onDisconnect(pr).remove();
      setMuted(false); setJoined(true);
    } catch (e) { setError(micError(e)); }
  }
  function leave(silent) {
    const c = S.current;
    [...c.peers.keys()].forEach(closePeer);
    c.stream?.getTracks().forEach((t) => t.stop());
    c.stream = null; c.analysers.clear();
    const pr = ref(db, `voice/${code}/${uid}`);
    onDisconnect(pr).cancel().catch(() => {});
    remove(pr).catch(() => {});
    if (!silent) { setJoined(false); setSpeaking(new Set()); }
  }
  const toggleMute = () => setMuted((m) => !m);

  /* ---------- Guruh o'zgarganda ulanishlarni qayta yig'ish ---------- */
  const membersKey = members.join(',');
  const voiceKey = Object.keys(inVoice).sort().join(',');
  useEffect(() => {
    if (!joined) return;
    const want = new Set(group ? members.filter((m) => inVoice[m]?.on) : []);
    for (const peer of [...S.current.peers.keys()]) if (!want.has(peer)) closePeer(peer);
    for (const peer of want) openPeer(peer);
  }, [joined, group, membersKey, voiceKey]); // eslint-disable-line

  // Mikrofon faqat o'z guruhida ochiq; qolgan paytda avtomatik o'chiq
  useEffect(() => {
    S.current.stream?.getAudioTracks().forEach((t) => { t.enabled = joined && !muted && !!group; });
    if (joined) set(ref(db, `voice/${code}/${uid}/muted`), muted).catch(() => {});
  }, [muted, group, joined]); // eslint-disable-line

  // Kim gapirayotganini kuzatish
  useEffect(() => {
    if (!joined) return;
    let last = '';
    const t = setInterval(() => {
      const now = new Set();
      for (const [key, a] of S.current.analysers) {
        a.an.getByteTimeDomainData(a.buf);
        let sum = 0;
        for (let i = 0; i < a.buf.length; i++) { const d = (a.buf[i] - 128) / 128; sum += d * d; }
        if (Math.sqrt(sum / a.buf.length) > 0.035 && (key !== 'me' || (!muted && group))) now.add(key === 'me' ? uid : key);
      }
      const s = [...now].sort().join(',');
      if (s !== last) { last = s; setSpeaking(now); }
    }, 200);
    return () => clearInterval(t);
  }, [joined, muted, group]); // eslint-disable-line

  // Internet qaytganda qayta ulanish
  useEffect(() => {
    const onOnline = () => { for (const [peer, e] of S.current.peers) if (e.initiator) startSession(peer); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []); // eslint-disable-line

  useEffect(() => () => leave(true), []); // eslint-disable-line

  return { joined, muted, error, speaking, inVoice, linked, join, leave: () => leave(false), toggleMute };
}
