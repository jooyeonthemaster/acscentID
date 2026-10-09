# Tarot major arcana artwork

The 22 card images were downloaded from the user-supplied [NEANDER AI Tarot demo](https://neander-ai-tarot.vercel.app/), linked by [NEANDER LAB](https://neander-lab.vercel.app/), on 2026-10-09. They are served locally so kiosk rendering does not depend on the demo host.

The demo footer credits Pamela Colman Smith (1909) and describes the original card art as public domain. This records the source's attribution and status statement; it is not a separate legal determination. The footer also credits metabismuth/tarot-json (MIT) for its data and A. E. Waite (1911) for interpretations. No demo interpretation text or dataset was imported into this app.

Only format conversion was applied: the original 350 × 600 JPEGs were converted to WebP using sharp, quality 88, effort 6. There was no cropping, recoloring, resizing, or generative editing. The paper frame, localized labels, and reversed orientation are rendered by the app.

IDs map directly to the existing numeric IDs 0–21 in `src/lib/kiosk/tarot-deck.ts`. All 22 English card names were checked against the demo's published card manifest. The app's three-card reading rules and draw probabilities are unchanged.

| App ID | Card | Local image | Original URL |
| --- | --- | --- | --- |
| 0 | The Fool | [m00.webp](m00.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m00.jpg) |
| 1 | The Magician | [m01.webp](m01.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m01.jpg) |
| 2 | The High Priestess | [m02.webp](m02.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m02.jpg) |
| 3 | The Empress | [m03.webp](m03.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m03.jpg) |
| 4 | The Emperor | [m04.webp](m04.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m04.jpg) |
| 5 | The Hierophant | [m05.webp](m05.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m05.jpg) |
| 6 | The Lovers | [m06.webp](m06.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m06.jpg) |
| 7 | The Chariot | [m07.webp](m07.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m07.jpg) |
| 8 | Strength | [m08.webp](m08.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m08.jpg) |
| 9 | The Hermit | [m09.webp](m09.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m09.jpg) |
| 10 | Wheel of Fortune | [m10.webp](m10.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m10.jpg) |
| 11 | Justice | [m11.webp](m11.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m11.jpg) |
| 12 | The Hanged Man | [m12.webp](m12.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m12.jpg) |
| 13 | Death | [m13.webp](m13.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m13.jpg) |
| 14 | Temperance | [m14.webp](m14.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m14.jpg) |
| 15 | The Devil | [m15.webp](m15.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m15.jpg) |
| 16 | The Tower | [m16.webp](m16.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m16.jpg) |
| 17 | The Star | [m17.webp](m17.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m17.jpg) |
| 18 | The Moon | [m18.webp](m18.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m18.jpg) |
| 19 | The Sun | [m19.webp](m19.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m19.jpg) |
| 20 | Judgement | [m20.webp](m20.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m20.jpg) |
| 21 | The World | [m21.webp](m21.webp) | [Source JPEG](https://neander-ai-tarot.vercel.app/cards/m21.jpg) |

Source manifest inspected in the public client bundle: [page-1afc06ee9682c8b1.js](https://neander-ai-tarot.vercel.app/_next/static/chunks/app/page-1afc06ee9682c8b1.js).
