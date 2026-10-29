// Grammar points of Genki (3rd edition), lessons 8–23, following the publisher's syllabus.
// One catalog drives the placement test, the plan and the progress numbers.
// Ids are stable ("g09-2" = lesson 9, point 2) — never renumber; add new points at the end of a lesson.

export const LESSONS = [
  { n: 8, book: 'I', title: 'צורה קצרה ודיבור יומיומי' },
  { n: 9, book: 'I', title: 'עבר קצר ותיאור שמות עצם' },
  { n: 10, book: 'I', title: 'השוואה, כוונה ושינוי' },
  { n: 11, book: 'I', title: 'רצונות וחוויות' },
  { n: 12, book: 'I', title: 'הסבר, עצה וחובה' },
  { n: 13, book: 'II', title: 'יכולת, סיבות ומראה' },
  { n: 14, book: 'II', title: 'נתינה, השערה והצעה' },
  { n: 15, book: 'II', title: 'כוונה והכנה מראש' },
  { n: 16, book: 'II', title: 'טובות ובקשות' },
  { n: 17, book: 'II', title: 'שמועה, תנאי וסדר פעולות' },
  { n: 18, book: 'II', title: 'פעלים יוצאים ועומדים, חרטה' },
  { n: 19, book: 'II', title: 'לשון כבוד והכרת תודה' },
  { n: 20, book: 'II', title: 'לשון ענווה ושאלות משובצות' },
  { n: 21, book: 'II', title: 'סביל ומצב שנוצר' },
  { n: 22, book: 'II', title: 'גרימה, תנאי ב־ば ו־のに' },
  { n: 23, book: 'II', title: 'סביל־גרימה, ויתור והחלטה' },
];

export const GRAMMAR = [
  // Lesson 8
  { id: 'g08-1', lesson: 8, title: 'צורה קצרה בהווה', pattern: '行く／行かない' },
  { id: 'g08-2', lesson: 8, title: 'דיבור יומיומי (בלי です／ます)', pattern: '今日、暇？' },
  { id: 'g08-3', lesson: 8, title: 'אני חושב ש…', pattern: '〜と思う', },
  { id: 'g08-4', lesson: 8, title: 'מישהו אמר ש…', pattern: '〜と言っていた' },
  { id: 'g08-5', lesson: 8, title: 'בבקשה אל…', pattern: '〜ないでください' },
  { id: 'g08-6', lesson: 8, title: 'אוהב לעשות…', pattern: '〜のが好き' },
  { id: 'g08-7', lesson: 8, title: 'が לסימון הנושא', pattern: 'だれが〜' },
  { id: 'g08-8', lesson: 8, title: 'משהו / שום דבר', pattern: '何か／何も' },
  // Lesson 9
  { id: 'g09-1', lesson: 9, title: 'עבר קצר (פעלים ותארים)', pattern: '飲んだ／飲まなかった' },
  { id: 'g09-2', lesson: 9, title: 'פסוקית שמתארת שם עצם', pattern: '昨日撮った写真' },
  { id: 'g09-3', lesson: 9, title: 'כבר / עוד לא', pattern: 'もう〜た／まだ〜ていない' },
  { id: 'g09-4', lesson: 9, title: 'סיבה עם から', pattern: '〜から' },
  // Lesson 10
  { id: 'g10-1', lesson: 10, title: 'השוואה בין שניים', pattern: 'AのほうがBより' },
  { id: 'g10-2', lesson: 10, title: 'הכי מבין כמה', pattern: '〜の中でいちばん' },
  { id: 'g10-3', lesson: 10, title: 'の במקום שם עצם', pattern: '赤いの' },
  { id: 'g10-4', lesson: 10, title: 'מתכוון ל…', pattern: '〜つもり' },
  { id: 'g10-5', lesson: 10, title: 'נעשה…', pattern: '〜くなる／〜になる' },
  { id: 'g10-6', lesson: 10, title: 'לאנשהו / לשום מקום', pattern: 'どこかに／どこにも' },
  { id: 'g10-7', lesson: 10, title: 'で לאמצעי', pattern: 'バスで' },
  // Lesson 11
  { id: 'g11-1', lesson: 11, title: 'רוצה לעשות', pattern: '〜たい' },
  { id: 'g11-2', lesson: 11, title: 'דברים כמו… וכמו…', pattern: '〜たり〜たりする' },
  { id: 'g11-3', lesson: 11, title: 'יצא לי פעם', pattern: '〜たことがある' },
  { id: 'g11-4', lesson: 11, title: 'רשימה חלקית', pattern: 'AやB' },
  // Lesson 12
  { id: 'g12-1', lesson: 12, title: 'הסבר והקשר', pattern: '〜んです' },
  { id: 'g12-2', lesson: 12, title: 'יותר מדי', pattern: '〜すぎる' },
  { id: 'g12-3', lesson: 12, title: 'כדאי / עדיף שלא', pattern: '〜たほうがいい' },
  { id: 'g12-4', lesson: 12, title: 'מפני ש… (רשמי יותר)', pattern: '〜ので' },
  { id: 'g12-5', lesson: 12, title: 'חייבים', pattern: '〜なければいけない' },
  { id: 'g12-6', lesson: 12, title: 'כנראה', pattern: '〜でしょう' },
  // Lesson 13
  { id: 'g13-1', lesson: 13, title: 'צורת יכולת', pattern: '話せる／来られる' },
  { id: 'g13-2', lesson: 13, title: 'כמה סיבות', pattern: '〜し、〜し' },
  { id: 'g13-3', lesson: 13, title: 'נראה ש… (למראה)', pattern: 'おいしそう' },
  { id: 'g13-4', lesson: 13, title: 'לנסות לעשות', pattern: '〜てみる' },
  { id: 'g13-5', lesson: 13, title: 'אם מדובר ב…', pattern: '〜なら' },
  { id: 'g13-6', lesson: 13, title: 'תדירות', pattern: '一週間に三回' },
  // Lesson 14
  { id: 'g14-1', lesson: 14, title: 'רוצה דבר', pattern: '〜がほしい' },
  { id: 'g14-2', lesson: 14, title: 'אולי', pattern: '〜かもしれない' },
  { id: 'g14-3', lesson: 14, title: 'נתינה וקבלה', pattern: 'あげる／くれる／もらう' },
  { id: 'g14-4', lesson: 14, title: 'הצעה: מה דעתך ש…', pattern: '〜たらどう' },
  { id: 'g14-5', lesson: 14, title: 'כמות: גם / רק', pattern: '三つも／一つしか〜ない' },
  // Lesson 15
  { id: 'g15-1', lesson: 15, title: 'צורת "בוא נ…"', pattern: '行こう' },
  { id: 'g15-2', lesson: 15, title: 'מתכנן ל…', pattern: '〜(よ)うと思っている' },
  { id: 'g15-3', lesson: 15, title: 'לעשות מראש', pattern: '〜ておく' },
  { id: 'g15-4', lesson: 15, title: 'פסוקיות תיאור מורחבות', pattern: '私が住んでいた町' },
  // Lesson 16
  { id: 'g16-1', lesson: 16, title: 'טובות: עושה בשביל', pattern: '〜てあげる／くれる／もらう' },
  { id: 'g16-2', lesson: 16, title: 'בקשה מנומסת', pattern: '〜ていただけませんか' },
  { id: 'g16-3', lesson: 16, title: 'הלוואי ש…', pattern: '〜といい' },
  { id: 'g16-4', lesson: 16, title: 'כאשר', pattern: '〜時' },
  { id: 'g16-5', lesson: 16, title: 'התנצלות על מעשה', pattern: '〜てすみません' },
  // Lesson 17
  { id: 'g17-1', lesson: 17, title: 'שמעתי ש…', pattern: '〜そうです' },
  { id: 'g17-2', lesson: 17, title: 'ציטוט יומיומי', pattern: '〜って' },
  { id: 'g17-3', lesson: 17, title: 'אם / כאשר', pattern: '〜たら' },
  { id: 'g17-4', lesson: 17, title: 'לא חייבים', pattern: '〜なくてもいい' },
  { id: 'g17-5', lesson: 17, title: 'נראה ש… (התרשמות)', pattern: '〜みたい' },
  { id: 'g17-6', lesson: 17, title: 'לפני / אחרי', pattern: '〜前に／〜てから' },
  // Lesson 18
  { id: 'g18-1', lesson: 18, title: 'פועל יוצא ועומד', pattern: '開ける／開く' },
  { id: 'g18-2', lesson: 18, title: 'גמרתי / קרה לי (לצערי)', pattern: '〜てしまう' },
  { id: 'g18-3', lesson: 18, title: 'בכל פעם ש…', pattern: '〜と' },
  { id: 'g18-4', lesson: 18, title: 'תוך כדי', pattern: '〜ながら' },
  { id: 'g18-5', lesson: 18, title: 'הייתי צריך…', pattern: '〜ばよかった' },
  // Lesson 19
  { id: 'g19-1', lesson: 19, title: 'פעלי כבוד', pattern: 'いらっしゃる／召し上がる' },
  { id: 'g19-2', lesson: 19, title: 'בקשה מכבדת', pattern: 'お〜ください' },
  { id: 'g19-3', lesson: 19, title: 'תודה שעשית', pattern: '〜てくれてありがとう' },
  { id: 'g19-4', lesson: 19, title: 'טוב ש…', pattern: '〜てよかった' },
  { id: 'g19-5', lesson: 19, title: 'אמור ל…', pattern: '〜はず' },
  // Lesson 20
  { id: 'g20-1', lesson: 20, title: 'ענווה יתרה', pattern: 'ございます／でございます' },
  { id: 'g20-2', lesson: 20, title: 'פעלי ענווה', pattern: '申す／参る／いたす' },
  { id: 'g20-3', lesson: 20, title: 'בלי לעשות', pattern: '〜ないで' },
  { id: 'g20-4', lesson: 20, title: 'שאלה בתוך משפט', pattern: '〜か(どうか)分からない' },
  { id: 'g20-5', lesson: 20, title: 'X שנקרא Y', pattern: '〜という' },
  { id: 'g20-6', lesson: 20, title: 'קל / קשה לעשות', pattern: '〜やすい／〜にくい' },
  // Lesson 21
  { id: 'g21-1', lesson: 21, title: 'סביל', pattern: '盗まれた' },
  { id: 'g21-2', lesson: 21, title: 'מצב שמישהו הכין', pattern: '〜てある' },
  { id: 'g21-3', lesson: 21, title: 'בזמן ש…', pattern: '〜間に' },
  { id: 'g21-4', lesson: 21, title: 'לגרום שיהיה…', pattern: '〜くする／〜にする' },
  { id: 'g21-5', lesson: 21, title: 'רוצה שמישהו…', pattern: '〜てほしい' },
  // Lesson 22
  { id: 'g22-1', lesson: 22, title: 'גרימה', pattern: '食べさせる' },
  { id: 'g22-2', lesson: 22, title: 'מרשים לי', pattern: '〜させてくれる' },
  { id: 'g22-3', lesson: 22, title: 'הוראה: תעשה!', pattern: '〜なさい' },
  { id: 'g22-4', lesson: 22, title: 'תנאי', pattern: '〜ば' },
  { id: 'g22-5', lesson: 22, title: 'למרות ש…', pattern: '〜のに' },
  { id: 'g22-6', lesson: 22, title: 'כמו…', pattern: '〜のような／〜のように' },
  // Lesson 23
  { id: 'g23-1', lesson: 23, title: 'סביל־גרימה', pattern: '飲まされる' },
  { id: 'g23-2', lesson: 23, title: 'גם אם', pattern: '〜ても' },
  { id: 'g23-3', lesson: 23, title: 'מחליט ל…', pattern: '〜ことにする' },
  { id: 'g23-4', lesson: 23, title: 'נוהג ל…', pattern: '〜ことにしている' },
  { id: 'g23-5', lesson: 23, title: 'עד ש…', pattern: '〜まで' },
  { id: 'g23-6', lesson: 23, title: 'הדרך לעשות', pattern: '〜方' },
];

export const POINT = Object.fromEntries(GRAMMAR.map((p) => [p.id, p]));

export function pointsOfLesson(n) {
  return GRAMMAR.filter((p) => p.lesson === n);
}

// Short form of the catalog that the Gemini checks receive.
export function catalogForGrading() {
  return GRAMMAR.map(({ id, title, pattern }) => ({ id, title, pattern }));
}
