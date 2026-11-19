import { useEffect, useMemo, useRef, useState } from 'react';
import { ref, query, limitToLast, onValue, push, set, serverTimestamp } from 'firebase/database';
import { MessageCircle, Send, X, Skull } from 'lucide-react';
import { db } from './firebase';
import { Avatar } from './ui';
import { haptic, hapticOk } from './telegram';

const toList = (v) => Object.entries(v || {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.ts || 0) - (b.ts || 0));

/** Xabarlar, o'qilmaganlar soni va yangi xabar bildirishnomasi */
export function useChat({ code, uid, role, open, tab }) {
  const [msgs, setMsgs] = useState({ room: [], mafia: [] });
  const [toast, setToast] = useState(null);
  const lastRead = useRef({ room: 0, mafia: 0 });
  const known = useRef({ room: null, mafia: null });
  const [, force] = useState(0);

  useEffect(() => {
    const subs = ['room', ...(role === 'mafia' ? ['mafia'] : [])].map((ch) =>
      onValue(query(ref(db, `chat/${code}/${ch}`), limitToLast(80)), (s) => setMsgs((m) => ({ ...m, [ch]: toList(s.val()) })), () => {}),
    );
    return () => subs.forEach((u) => u());
  }, [code, role]);

  useEffect(() => {
    for (const ch of ['room', 'mafia']) {
      const list = msgs[ch];
      const last = list[list.length - 1];
      if (!last) { known.current[ch] = known.current[ch] ?? ''; continue; }
      if (known.current[ch] === null) { known.current[ch] = last.id; lastRead.current[ch] = last.ts || 0; continue; } // birinchi yuklash — bildirishnoma yo'q
      if (known.current[ch] !== last.id) {
        known.current[ch] = last.id;
        if (last.uid !== uid && !(open && tab === ch)) {
          setToast({ ch, name: last.name, text: last.text, k: last.id });
          hapticOk();
        }
      }
      if (open && tab === ch) lastRead.current[ch] = last.ts || Date.now();
    }
    force((x) => x + 1);
  }, [msgs, open, tab, uid]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  const unread = ['room', 'mafia'].reduce((n, ch) => n + msgs[ch].filter((m) => m.uid !== uid && (m.ts || 0) > lastRead.current[ch]).length, 0);
  return { msgs, unread, toast, clearToast: () => setToast(null) };
}

export function ChatToast({ toast, onOpen }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3" style={{ marginTop: 'env(safe-area-inset-top)' }}>
      <button key={toast.k} onClick={onOpen} className="animate-toast panel-strong pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-left">
        <div className="gold-text text-xs font-bold">{toast.ch === 'mafia' ? '🔪 Mafiya chati' : '💬 Xona chati'} · {toast.name}</div>
        <div className="truncate text-sm">{toast.text}</div>
      </button>
    </div>
  );
}

export function ChatButton({ unread, onClick }) {
  return (
    <button onClick={() => { haptic(); onClick(); }} aria-label="Chat" className="btn-red fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full pulse-neon" style={{ bottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
      <MessageCircle size={24} />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-black text-black">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );
}

export function ChatSheet({ code, me, role, phase, alive, chat, tab, setTab, onClose }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const endRef = useRef(null);
  const lastSend = useRef(0);
  const isMafia = role === 'mafia';

  const reason = useMemo(() => {
    if (tab === 'mafia') {
      if (phase === 'night' && isMafia && alive) return '';
      return phase === 'night' && !alive ? 'Siz o‘ldingiz — yozolmaysiz.' : 'Maxfiy chat faqat tunda ochiladi. 🌙';
    }
    if (phase === 'lobby') return '';
    if (phase === 'day') return alive ? '' : 'Siz o‘ldirildingiz — tirik o‘yinchilar chatiga yozolmaysiz.';
    if (phase === 'night') return 'Tunda umumiy chat yopiq. 🌙';
    if (phase === 'ended') return 'O‘yin tugadi — chat yopilgan.';
    return 'Rollar ko‘rsatilmoqda — chat vaqtincha yopiq.';
  }, [tab, phase, isMafia, alive]);

  const list = chat.msgs[tab] || [];
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [list.length, tab]);

  const send = async () => {
    const t = text.trim();
    if (!t || reason) return;
    if (Date.now() - lastSend.current < 800) return;
    lastSend.current = Date.now();
    setText(''); setErr('');
    try {
      await set(push(ref(db, `chat/${code}/${tab}`)), { uid: me.id, name: me.name, photo: me.photo || '', text: t.slice(0, 300), ts: serverTimestamp() });
    } catch { setErr('Xabar yuborilmadi. Hozir yozish mumkin emas.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="panel-strong animate-sheet flex h-[80dvh] w-full max-w-md flex-col rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3 py-3 hairline">
          <div className="flex flex-1 gap-2">
            <button onClick={() => setTab('room')} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${tab === 'room' ? 'btn-gold' : 'bg-white/10'}`} style={{ width: 'auto' }}>💬 Umumiy</button>
            {isMafia && <button onClick={() => setTab('mafia')} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${tab === 'mafia' ? 'btn-red' : 'bg-white/10'}`} style={{ width: 'auto' }}>🔪 Mafiya</button>}
          </div>
          <button onClick={onClose} aria-label="Yopish" className="rounded-xl bg-white/10 p-2"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {list.length === 0 && <div className="mt-10 text-center text-sm text-slate-400">Hozircha xabar yo‘q. Birinchi bo‘lib yozing! ✍️</div>}
          {list.map((m) => {
            const mine = m.uid === me.id;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar p={{ id: m.uid, name: m.name, photo: m.photo }} size={30} />
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'rounded-br-md bg-rose-900/70' : 'rounded-bl-md bg-white/10'}`}>
                  {!mine && <div className="gold-text mb-0.5 text-xs font-bold">{m.name}</div>}
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {(reason || err) && <div className="flex items-center gap-2 px-4 pb-1 text-xs text-amber-300">{reason.includes('o‘ldi') && <Skull size={14} />}{err || reason}</div>}
        <div className="flex items-center gap-2 border-t px-3 pt-3 hairline" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <input value={text} maxLength={300} disabled={!!reason} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={reason ? 'Yozish yopiq' : 'Xabar yozing…'} className="min-w-0 flex-1 rounded-2xl border bg-white/5 px-4 py-3 text-base hairline disabled:opacity-50" />
          <button onClick={send} disabled={!!reason || !text.trim()} aria-label="Yuborish" className="btn btn-red" style={{ width: 48, height: 48, padding: 0 }}><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
}
