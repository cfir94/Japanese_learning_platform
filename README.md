# ことば — יפנית

אתר לימוד אישי ליפנית, מוכוון לביקור של שתי חברות יפניות במרץ 2027 ולהתקדמות בכיוון N4.
https://cfir94.github.io/Japanese_learning_platform/

שלושה מסכים, ואין בהם יותר:

- **היום** — נושא הדקדוק של היום, המשימות והדקות, השבוע (מיומנות השיחה, מילים, קנג׳י), שיחה קולית עם ChatGPT,
  ו"התמונה הגדולה": כמה נקודות דקדוק כבר יושבות מתוך 60 עד מרץ, איפה הלוח מצפה שתהיה, וכמה ימים ושעות הושלמו.
- **התוכנית** — 88 נקודות הדקדוק של Genki 8–23, צבועות לפי מצבן, ו־19 השבועות יום אחרי יום.
- **מבחן מיקום** — דקדוק (שלושה חלקים), כתיבה חופשית ודיבור מוקלט. התוצאות צובעות את התוכנית.

העיצוב הוא יומן מסע: התמונות שלנו נעוצות לאורך האתר (זוג הפתיחה קבוע, השאר מתחלפות כל יום), וגלויות של היעדים
והאוכל של הביקור — עם השם היפני של כל אחד — מוויקישיתוף, ברישיון חופשי ועם קרדיט.

## הקמה — פעם אחת

**1. טבלת המעקב ב־Supabase.** בלי השלב הזה הכול נשמר רק בדפדפן.
פותחים את ה־SQL Editor של הפרויקט המשותף
(https://supabase.com/dashboard/project/dendxtbaxiszohjjsdtd/sql/new), מדביקים את `supabase/schema.sql` ולוחצים Run.

**2. בדיקת Gemini (כתיבה, תרגומים ודיבור).** ה־Worker יושב ב־`worker/` ומועלה מ־GitHub Actions. צריך שלושה סודות
ב־Settings → Secrets and variables → Actions של הריפו:

| סוד | מאיפה |
|---|---|
| `CLOUDFLARE_API_TOKEN` | https://dash.cloudflare.com/profile/api-tokens → Create Token → התבנית **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | בעמוד Workers & Pages ב־Cloudflare, בצד |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey — אפשר את אותו מפתח של "דבר עם ההיסטוריה" |

אחר כך: Actions → **Deploy Gemini Worker (kotoba-api)** → Run workflow. השלב האחרון בודק ש־
`https://kotoba-api.cfir94.workers.dev/health` עונה.

**3. ChatGPT.** ההוראות לפרויקט ולתזכורות: [`docs/chatgpt-project.md`](docs/chatgpt-project.md).

## איך זה בנוי

- HTML, CSS ו־ES modules בלי build ובלי תלויות. GitHub Pages מפרסם את `main` מהשורש.
- **כניסה** משותפת עם אתר מורי הדרך ומשחק אבן דרך (`src/lib/auth.js`): אותו Supabase ואותו session, ולכן מי שמחובר שם
  מחובר גם כאן.
- **המעקב** הוא רשימת אירועים שרק מתווספת (`jp_events`): תשובה, ציון, משימה שסומנה, שיחה קולית. כל ההתקדמות מחושבת
  ממנה (`src/logic/progress.js`). שני מכשירים לא דורסים זה את זה — הסנכרון הוא איחוד לפי מזהה. הכול נשמר קודם בדפדפן,
  ועולה לענן כשיש חיבור.
- **בדיקות Gemini** (`worker/`): מפתח Gemini רק ב־Worker. כל בקשה נושאת את ה־token של Supabase, וה־Worker מקבל רק את
  החשבון שמופיע ב־`ALLOWED_EMAIL_HASHES`. ההקלטות נשלחות לבדיקה ולא נשמרות.

| קובץ | תפקיד |
|---|---|
| `src/data/grammar.js` | 88 נקודות הדקדוק (מזהים קבועים) |
| `src/data/placement.js` | פריטי המבחן, הכתיבה והדיבור |
| `src/data/plan.js` | 19 השבועות (גרסה 3), אבני דרך, אחרי מרץ |
| `src/logic/progress.js` | סטטוסים, קצב, ימים ומשימות — פונקציות טהורות |
| `src/logic/brief.js` | התדריך ל־ChatGPT וקריאת בלוק הסיכום |
| `src/lib/store.js` | אירועים, localStorage וסנכרון |
| `src/data/memories.js` · `places.js` | התמונות שלנו, והיעדים בעברית וביפנית |
| `tools/fetch_place_photos.py` | מוריד את תמונות היעדים (רץ ב־GitHub Actions) |
| `src/views/*` | המסכים |

## פיתוח

```sh
npm start      # http://127.0.0.1:4173/
npm test
npm run check
```

## פרטיות

הריפו ציבורי. אין בו תשובות, הקלטות, מחברת אישית או פרטי מסלול הטיול. כל אלה נמצאים רק בחשבון (Supabase, עם RLS:
רק הבעלים קורא וכותב).
