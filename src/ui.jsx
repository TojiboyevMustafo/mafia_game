import { createContext, useContext, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Backdrop } from './backdrop';
import { haptic } from './telegram';
import { ROLES } from './game';

export const SpeakingCtx = createContext(new Set());

export function Stage({ day, dim }) {
  return (
    <div className={`stage ${day ? 'theme-day' : ''}`} aria-hidden>
      <Backdrop />
      <div className="smoke a" /><div className="smoke b" /><div className="smoke c" />
      <div className={dim ? 'shade-dim' : 'shade-home'} />
      <div className="vignette" /><div className="grain" />
    </div>
  );
}

const AV = ['#7f1d2d', '#4c1d95', '#115e59', '#92400e', '#86198f', '#155e75'];
export function Avatar({ p, size = 44 }) {
  const [bad, setBad] = useState(false);
  const speaking = useContext(SpeakingCtx).has(p.id);
  const dead = p.alive === false || p.gone;
  const bg = AV[String(p.id).charCodeAt(0) % AV.length];
  return (
    <div style={{ width: size, height: size }} className={`avatar ${speaking ? 'speaking' : ''} ${dead ? 'dead' : ''}`}>
      {p.photo && !bad
        ? <img src={p.photo} alt="" onError={() => setBad(true)} className="h-full w-full object-cover" />
        : <div style={{ background: bg, fontSize: size * 0.42 }} className="flex h-full w-full items-center justify-center font-bold text-white">{(p.name || '?')[0].toUpperCase()}</div>}
    </div>
  );
}

export const Btn = ({ children, className = '', variant = 'red', ...p }) => (
  <button {...p} className={`btn ${variant === 'red' ? 'btn-red' : variant === 'gold' ? 'btn-gold' : 'btn-ghost'} ${className}`}>{children}</button>
);
export const Panel = ({ children, className = '' }) => <div className={`panel p-4 ${className}`}>{children}</div>;

export function Picker({ list, sel, onSel, disabled, badge }) {
  return (
    <div className="grid gap-2">
      {list.map((p) => (
        <button key={p.id} disabled={disabled} onClick={() => { haptic(); onSel(p.id); }} className={`pcard ${sel === p.id ? 'sel' : ''}`}>
          <Avatar p={p} size={46} />
          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
          {badge?.(p)}
          {sel === p.id && <Check size={18} className="text-rose-400" />}
        </button>
      ))}
    </div>
  );
}

export const EventBanner = ({ event, title }) => event && (
  <div className="panel border-amber-500/30 p-4" style={{ borderColor: 'rgba(212,169,76,.45)' }}>
    <div className="gold-text mb-1 text-sm font-bold uppercase tracking-wider">{title}</div>
    <div className="text-lg font-bold leading-snug">{event.text}</div>
  </div>
);

export function RulesModal({ onClose }) {
  const items = [
    ['mafia', 'Tunda bitta o‘yinchini o‘ldiradi. Sheriklarini biladi.'],
    ['doctor', 'Tunda bitta o‘yinchini o‘limdan qutqaradi.'],
    ['cop', 'Tunda bitta o‘yinchi mafiya yoki yo‘qligini tekshiradi.'],
    ['civil', 'Kunduzi muhokama qiladi va ovoz beradi.'],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center" onClick={onClose}>
      <div className="panel-strong animate-sheet max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display gold-text text-2xl font-black">O‘yin qoidalari</h3>
          <button onClick={onClose} aria-label="Yopish" className="rounded-xl bg-white/10 p-2"><X size={18} /></button>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p>O‘yin kamida 4 kishi bilan boshlanadi. Har kim yashirin rol oladi.</p>
          {items.map(([k, t]) => <p key={k}><b className="text-amber-300">{ROLES[k].name}:</b> {t}</p>)}
          <p><b className="text-amber-300">Tun 🌙</b> — mafiya, shifokor va komissar yashirincha harakat qiladi. Tinch aholi kutadi. Tunda faqat mafiya o‘z maxfiy chatida va ovozli kanalida gaplasha oladi.</p>
          <p><b className="text-amber-300">Kun ☀️</b> — tunda nima bo‘lgani e‘lon qilinadi. Tirik o‘yinchilar muhokama qilib, bitta kishiga ovoz beradi. Eng ko‘p ovoz olgan o‘yindan chiqadi.</p>
          <p><b className="text-amber-300">G‘alaba:</b> barcha mafiya chiqarilsa — Tinch aholi yutadi. Mafiya soni qolganlarga teng bo‘lsa — Mafiya yutadi.</p>
          <p>O‘ldirilgan o‘yinchi tomoshabin bo‘lib davom etishi mumkin, lekin ovoz bera olmaydi va tirik o‘yinchilar suhbatiga qo‘shila olmaydi.</p>
        </div>
      </div>
    </div>
  );
}
