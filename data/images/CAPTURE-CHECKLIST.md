# Real phone screenshots: capture checklist (for a teammate)

The images in `screenshots/` are synthetic renders. OCR (T13) also needs about 10 real screenshots taken on actual phones. Use **only fake messages**: never a real person's message, number, name, OTP or account.

## How

1. On phone A, send a message from `data/dev/dev.csv` (copy the `text` exactly) to phone B: by SMS, Messenger or Viber. Use only team phones.
2. On phone B, open the thread and take a screenshot. Crop nothing.
3. Before saving, check the screenshot shows no real contact names, numbers or other chats. If it does, retake it with a new thread or a contact renamed "Test".
4. Save as `data/images/real/<dev id>_<phone model>_<app>.png`, for example `dev-s001_redmi-note-12_sms.png`.
5. Add a row to `data/images/real/manifest.csv`: `file, text, label, category, split, phone, app, android_version`.

## Get this mix (10 total)

- [ ] 3 scam SMS (one with a link, one OTP request, one parcel fee)
- [ ] 2 scam Messenger or marketplace chats
- [ ] 2 genuine-looking OTP or transaction texts (hard negatives)
- [ ] 1 personal Taglish chat
- [ ] 1 in dark mode
- [ ] 1 on a small or low-end phone (blurry or low resolution is useful)

Use messages from `data/dev` only, never `data/test_v2` (frozen).
