import WebApp from '@twa-dev/sdk';

export const BOT = 'mafia_friends_uz_bot';
export const APP_SHORT_NAME = 'game'; // BotFather → Direct Link short name

export const inTelegram = !!WebApp.initData;

export function initTelegram() {
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor?.('#07040c');
    WebApp.setBackgroundColor?.('#07040c');
    WebApp.disableVerticalSwipes?.(); // o'yin paytida tasodifan yopilib ketmasligi uchun
  } catch {}

  const params = new URLSearchParams(location.search);
  const tg = WebApp.initDataUnsafe?.user;
  const startParam = WebApp.initDataUnsafe?.start_param || params.get('room') || null;

  let user;
  if (tg) {
    user = { tg: String(tg.id), name: tg.first_name || 'Mehmon', photo: tg.photo_url || '' };
  } else {
    let id = sessionStorage.getItem('test_id');
    if (!id) { id = String(Math.floor(Math.random() * 900 + 100)); sessionStorage.setItem('test_id', id); }
    user = { tg: 'test' + id, name: 'Mehmon ' + id, photo: '' };
  }
  return { user, startParam };
}

export function shareInvite(code) {
  const link = `https://t.me/${BOT}/${APP_SHORT_NAME}?startapp=${code}`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎭 Mafiya o‘yiniga qo‘shiling! Xona kodi: ' + code)}`;
  if (inTelegram) WebApp.openTelegramLink(url);
  else window.open(url, '_blank');
}

export const haptic = (t = 'light') => { try { WebApp.HapticFeedback?.impactOccurred(t); } catch {} };
export const hapticOk = () => { try { WebApp.HapticFeedback?.notificationOccurred('success'); } catch {} };
