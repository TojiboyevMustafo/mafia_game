# Mafia Friends UZ — v5

## O'rnatish
```
npm install
npm run dev        # lokal sinash
```

## MAJBURIY: Firebase sozlamalari (bir marta)
1. **Authentication → Sign-in method → Anonymous → Enable.**
   (Rollar maxfiyligi va chat/audio qoidalari shunga tayanadi. Yoqilmasa ilova "Ulanib bo'lmadi" deydi.)
2. **Realtime Database → Rules** bo'limiga `database.rules.json` ichidagini to'liq qo'ying → **Publish**.
3. Bazada eski `rooms` ma'lumotlari bo'lsa, o'chirib tashlang (yangi struktura eskisiga mos emas).

## Audio chat uchun TURN server (tavsiya etiladi)
Faqat STUN bilan ilova Wi-Fi'da ishlaydi, lekin mobil internetda (CGNAT) ulanish ko'pincha o'tmaydi.
1. TURN xizmatini tanlang: Metered.ca, Cloudflare Realtime TURN, Twilio Network Traversal yoki o'z serveringiz (coturn).
2. Ulardan `URL`, `username`, `credential` oling.
3. Vercel → Settings → Environment Variables:
   - `VITE_TURN_URL` (vergul bilan bir nechta URL mumkin)
   - `VITE_TURN_USERNAME`
   - `VITE_TURN_CREDENTIAL`
   So'ng Redeploy qiling.
