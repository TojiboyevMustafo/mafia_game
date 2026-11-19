// Firebase va brauzer xatolarini o'zbekchaga o'giradi
export function uz(e) {
  const c = e?.code || '';
  const m = e?.message || '';
  if (c.includes('operation-not-allowed') || c.includes('admin-restricted')) return 'Firebase Authentication’da “Anonymous” kirishni yoqing (Build → Authentication → Sign-in method).';
  if (c.includes('timeout') || m.includes('auth/timeout')) return 'Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.';
  if (c.includes('network')) return 'Internet aloqasi yo‘q.';
  if (/permission_denied|PERMISSION_DENIED/.test(c + m)) return 'Ruxsat yo‘q. Firebase qoidalarini (database.rules.json) joylaganingizni tekshiring.';
  return m || 'Kutilmagan xatolik yuz berdi.';
}
