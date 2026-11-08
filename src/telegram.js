import WebApp from '@twa-dev/sdk';

export const BOT = 'mafia_friends_uz_bot';
export const APP_SHORT_NAME = 'game'; // BotFather → /newapp da bergan short name

export const inTelegram = !!WebApp.initData;

export function initTelegram() {
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor?.('#0a0a14');
    WebApp.setBackgroundColor?.('#0a0a14');
  } catch {}

  const params = new URLSearchParams(location.search);
  const tgUser = WebApp.initDataUnsafe?.user;
  // Havola orqali kirilganda start_param = xona kodi. Brauzerda: ?room=123456
  const startParam = WebApp.initDataUnsafe?.start_param || params.get('room') || null;

  let user;
  if (tgUser) {
    user = { id: String(tgUser.id), name: tgUser.first_name, photo: tgUser.photo_url || '' };
  } else {
    // Oddiy brauzer: har bir tab uchun alohida test profil
    let id = sessionStorage.getItem('test_id');
    if (!id) { id = 'test' + Math.floor(Math.random() * 90000 + 10000); sessionStorage.setItem('test_id', id); }
    user = { id, name: 'Test ' + id.slice(-3), photo: '' };
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
