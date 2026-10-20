# Dota of Listen

ฟังเสียงสกิล Dota 2 แล้วทายว่าเป็นฮีโร่ตัวไหน (แรงบันดาลใจจาก League of Listen)

## เล่น
เปิด `index.html` ใน browser ได้เลย หรือเปิด GitHub Pages (Settings → Pages → Deploy from branch `main`)

- กด **Q W E R** (หรือ **1–4** ตอนพิมพ์อยู่) เพื่อฟังเสียงสกิล
- พิมพ์ชื่อฮีโร่แล้วกด **Enter** (ใช้ชื่อเล่นได้ เช่น `cm`, `pa`, `np`)
- โหมด: Classic (3 ชีวิต), Sudden Death, Time Attack (120 วิ), Practice

## อัปเดตข้อมูลฮีโร่
```
node build-data.js
```
ดึงรายชื่อฮีโร่จาก OpenDota และเสียงสกิลจาก Dota 2 Wiki แล้วเขียนลง `data.js` (ต้องใช้ Node 18+)

## หมายเหตุ
Fan project ไม่เกี่ยวข้องกับ Valve — เสียงและรูปภาพเป็นลิขสิทธิ์ของ Valve Corporation
ไฟล์เสียงโหลดจาก [Dota 2 Wiki](https://dota2.fandom.com) และรูปฮีโร่จาก Steam CDN
