// Community and identity topics: personal explanations, with parallel English for Masami.
// Lines: [Japanese, kana, Hebrew, English, grammar]. These are cultural descriptions, not profiles of individuals.
const SOURCES = {
  bedouin: ['בדואים · הספרייה הלאומית / National Library of Israel', 'https://www.nli.org.il/en/discover/israel-culture-and-society/groups-in-israeli-society/bedouin'],
  north: ['היישובים הבדואיים בצפון · מרכז המחקר והמידע של הכנסת', 'https://main.knesset.gov.il/activity/info/research/pages/incident.aspx?businesstype=1&rid=8416&ver=2'],
  faiths: ['דתות ועדות · משרד הפנים / Ministry of Interior', 'https://www.gov.il/BlobFolder/guide/religious-department/he/home_main_non-jewish-congregations_religious-department-001.pdf'],
  druze: ['דרוזים · הספרייה הלאומית / National Library of Israel', 'https://www.nli.org.il/he/discover/israel-culture-and-society/groups-in-israeli-society/druze'],
  druzeReligion: ['האמונה והמורשת הדרוזית · הספרייה הלאומית / NLI', 'https://www.nli.org.il/he/at-your-service/announcements/druze-visit'],
  druzePlaces: ['האוכלוסייה הדרוזית · הלמ״ס / CBS, 2026', 'https://www.cbs.gov.il/he/mediarelease/DocLib/2026/121/11_26_121e.pdf'],
  groups: ['קבוצות בחברה הישראלית · הספרייה הלאומית / NLI', 'https://www.nli.org.il/he/discover/israel-culture-and-society/groups-in-israeli-society'],
  roots: ['מוצא וזהות יהודית · Pew Research Center, 2016 (רקע מושגי)', 'https://www.pewresearch.org/religion/wp-content/uploads/sites/7/2016/03/Israel-Survey-Full-Report.pdf'],
  mizrahi: ['קהילות ומסורות יהודיות · My Jewish Learning', 'https://www.myjewishlearning.com/article/israels-vibrant-jewish-ethnic-mix/'],
  ethiopia: ['ביתא ישראל וחג הסיגד · משרד החינוך / Ministry of Education', 'https://www.gov.il/he/pages/sigd2026'],
  immigration: ['עלייה מרוסיה, אוקראינה ובלארוס · הכנסת / Knesset', 'https://m.knesset.gov.il/EN/News/PressReleases/Pages/press3723y.aspx'],
  inequality: ['חברת מהגרים והשתלבות · המכון הישראלי לדמוקרטיה / IDI', 'https://en.idi.org.il/articles/6200'],
};

const TOPICS = [
  {
    id: 'bedouin-community', he: 'בדואים: מסורת וחיים כיום', ja: 'ベドウィンの文化と今の暮らし', photo: 'weaving',
    intro: 'הבדואים בישראל הם קהילות ערביות, ברובן מוסלמיות, בעלות היסטוריה ומסורות ייחודיות. בעבר היו נפוצים מרעה ונדידה או נדידה למחצה; כיום יש מגוון צורות חיים בערים, בכפרים וביישובים אחרים, בנגב וגם בצפון. ״בדואי״ אינו שם של דת נפרדת. מסורות כמו אריגה ואירוח הן חלק מהסיפור, לצד לימודים, עבודה וחיים בני זמננו. אין להסיק מאורח החיים של אדם אחד על הקהילה כולה.',
    en: 'Bedouin communities: tradition and life today',
    enIntro: 'Bedouin communities in Israel are Arab communities, mostly Muslim, with distinctive histories and traditions. Pastoral mobility was historically important; today people live in towns, villages and other settlements, in the Negev and the north. Bedouin identity is not a separate religion. Weaving and hospitality are parts of a wider story that also includes education, work and contemporary life.',
    words: [
      ['ベドウィン', '', 'בדואים', 'Bedouin'], ['共同体', 'きょうどうたい', 'קהילה', 'community'],
      ['伝統', 'でんとう', 'מסורת', 'tradition'], ['遊牧', 'ゆうぼく', 'נוודות עם עדרים', 'nomadic pastoralism'],
      ['家畜', 'かちく', 'חיות משק, מקנה', 'livestock'], ['織物', 'おりもの', 'אריג, עבודת אריגה', 'woven textile'],
      ['もてなし', '', 'אירוח, הכנסת אורחים', 'hospitality'], ['暮らし方', 'くらしかた', 'אורח חיים', 'way of life'],
    ],
    lines: [
      ['ベドウィンは、アラブ社会の中で、独自の歴史や文化を持つ人たちなんだ。', 'べどうぃんは、あらぶしゃかいのなかで、どくじのれきしやぶんかをもつひとたちなんだ。', 'הבדואים הם קהילות בחברה הערבית עם היסטוריה ותרבות ייחודיות.', 'Bedouin communities are part of Arab society and have distinctive histories and cultures.', ['g09-2', 'g11-4', 'g12-1']],
      ['多くの人はイスラム教徒で、アラビア語を話すよ。', 'おおくのひとはいすらむきょうとで、あらびあごをはなすよ。', 'רבים מהם מוסלמים ודוברים ערבית.', 'Many are Muslim and speak Arabic.', ['g08-2']],
      ['昔は、家畜と一緒に移動しながら暮らす人も多かったんだ。', 'むかしは、かちくといっしょにいどうしながらくらすひともおおかったんだ。', 'בעבר רבים גם נדדו עם חיות המשק שלהם.', 'In the past, many people moved from place to place with their livestock.', ['g09-2', 'g18-4', 'g12-1']],
      ['今は、町や村など、いろいろな場所で暮らしてるよ。', 'いまは、まちやむらなど、いろいろなばしょでくらしてるよ。', 'היום חיים בערים, בכפרים ובמקומות מסוגים שונים.', 'Today people live in towns, villages and other kinds of settlements.', ['g11-4']],
      ['ネゲブだけじゃなくて、北部にもベドウィンの共同体があるんだ。', 'ねげぶだけじゃなくて、ほくぶにもべどうぃんのきょうどうたいがあるんだ。', 'יש קהילות בדואיות גם בצפון, ולא רק בנגב.', 'There are Bedouin communities in the north as well as in the Negev.', ['g12-1']],
      ['伝統的な織物やもてなしの文化もあるけど、暮らしには、ほかにもいろいろな面があるよ。', 'でんとうてきなおりものやもてなしのぶんかもあるけど、くらしには、ほかにもいろいろなめんがあるよ。', 'יש גם מסורות של אריגה ואירוח, ולחיים יש עוד צדדים רבים.', 'Traditional textiles and hospitality are part of the culture, alongside many other aspects of life.', ['g11-4']],
      ['同じベドウィンでも、仕事や暮らし方、考え方は一人一人違うんだ。', 'おなじべどうぃんでも、しごとやくらしかた、かんがえかたはひとりひとりちがうんだ。', 'גם בקרב בדואים, העבודה, אורח החיים ודרך החשיבה משתנים מאדם לאדם.', 'Work, ways of life and opinions vary from person to person within Bedouin communities.', ['g11-4', 'g12-1']],
    ],
    question: ['昔からの文化と今の暮らし、どちらについてもっと知りたい？', 'むかしからのぶんかといまのくらし、どちらについてもっとしりたい？', 'על מה תרצו לדעת יותר — המסורות או החיים כיום?', 'What would you like to learn more about: traditions or life today?', ['g11-1']],
    notes: [
      ['ベドウィン／イスラム教徒', 'בדואי מתאר השתייכות היסטורית ותרבותית; מוסלמי מתאר דת. אלה שני סוגי מידע שונים על אותו אדם.'],
      ['暮らしてる', 'הצורה היומיומית של 暮らしている — חיים או מתגוררים. המילה 遊牧 מתארת אורח חיים היסטורי, ואינה הגדרה לכל בדואי כיום.'],
    ],
    sources: ['bedouin', 'north', 'faiths'],
  },
  {
    id: 'druze-community', he: 'דרוזים: דת, שפה וקהילה', ja: 'ドゥルーズの宗教と共同体', photo: 'galilee',
    intro: 'הדרוזים הם קהילה אתנית־דתית דוברת ערבית, עם דת ומסורת עצמאיות שהתפתחו במזרח התיכון. בישראל יש ריכוזים בגליל ובכרמל, וגם בגולן קיימים יישובים דרוזיים; קהילות גדולות חיות גם בלבנון ובסוריה. שפה משותפת אינה מעידה על דת או אזרחות זהות, ובכל קהילה יש הבדלים אישיים ואזוריים. ״דרוזי״ ו״בדואי״ אינם שמות חלופיים לאותה קבוצה.',
    en: 'Druze communities: religion, language and identity',
    enIntro: 'The Druze are an Arabic-speaking ethnoreligious community with a distinct faith and history rooted in the Middle East. Communities live in the Galilee and Carmel, and there are Druze villages in the Golan Heights as well as communities in Lebanon and Syria. A shared language does not imply the same religion or citizenship. Druze and Bedouin are different identities.',
    words: [
      ['ドゥルーズ', '', 'דרוזים', 'Druze'], ['宗教', 'しゅうきょう', 'דת', 'religion'],
      ['信仰', 'しんこう', 'אמונה דתית', 'religious faith'], ['アラビア語', 'アラビアご', 'ערבית', 'Arabic'],
      ['母語', 'ぼご', 'שפת אם', 'first language; mother tongue'], ['国籍', 'こくせき', 'אזרחות, נתינות', 'citizenship; nationality'],
      ['地域', 'ちいき', 'אזור', 'region'], ['独自の', 'どくじの', 'ייחודי, בעל אופי משלו', 'distinctive; of its own'],
    ],
    lines: [
      ['ドゥルーズは、独自の宗教と歴史を持つ共同体なんだ。', 'どぅるーずは、どくじのしゅうきょうとれきしをもつきょうどうたいなんだ。', 'הדרוזים הם קהילה עם דת והיסטוריה ייחודיות.', 'The Druze are a community with a distinct religion and history.', ['g09-2', 'g12-1']],
      ['主にアラビア語を話すけど、イスラム教とは別の宗教なんだよ。', 'おもにあらびあごをはなすけど、いすらむきょうとはべつのしゅうきょうなんだよ。', 'הם דוברים בעיקר ערבית, אבל הדת הדרוזית נפרדת מהאסלאם.', 'They mainly speak Arabic, but the Druze faith is distinct from Islam.', ['g12-1']],
      ['イスラエルでは、ガリラヤやカルメル山地に多くの人が住んでるよ。', 'いすらえるでは、がりらややかるめるさんちにおおくのひとがすんでるよ。', 'בישראל רבים מתגוררים בגליל ובהרי הכרמל.', 'In Israel, many live in the Galilee and the Carmel hills.', ['g11-4']],
      ['ゴラン高原にも、ドゥルーズの村があるんだ。', 'ごらんこうげんにも、どぅるーずのむらがあるんだ。', 'גם בגולן יש כפרים דרוזיים.', 'There are Druze villages in the Golan Heights too.', ['g12-1']],
      ['同じドゥルーズでも、地域や家族によって、暮らしや考え方は違うよ。', 'おなじどぅるーずでも、ちいきやかぞくによって、くらしやかんがえかたはちがうよ。', 'גם בקרב דרוזים, אורח החיים ודרך החשיבה שונים בין אזורים ומשפחות.', 'Ways of life and views vary between regions, families and individuals.', ['g11-4']],
      ['話す言葉だけで、その人の宗教や国籍は分からないんだ。', 'はなすことばだけで、そのひとのしゅうきょうやこくせきはわからないんだ。', 'אי אפשר לדעת מה הדת או האזרחות של אדם רק מהשפה שהוא מדבר.', 'A person’s language alone does not tell you their religion or citizenship.', ['g09-2', 'g12-1']],
      ['ドゥルーズの人たちは、イスラエルだけじゃなくて、レバノンやシリアにも住んでるんだ。', 'どぅるーずのひとたちは、いすらえるだけじゃなくて、ればのんやしりあにもすんでるんだ。', 'דרוזים חיים גם בלבנון ובסוריה, ולא רק בישראל.', 'Druze communities also live in Lebanon and Syria, not only in Israel.', ['g11-4', 'g12-1']],
    ],
    question: ['宗教や文化について、もっと知りたいことはある？', 'しゅうきょうやぶんかについて、もっとしりたいことはある？', 'יש משהו נוסף על הדת או התרבות שתרצו להכיר?', 'What else would you like to learn about the religion or culture?', ['g11-1', 'g11-4']],
    notes: [
      ['母語／宗教／国籍', 'שפת אם, דת ואזרחות הן שכבות זהות שונות. אין להסיק אחת מהאחרת, ואין להניח שכל הדרוזים בעולם או בגולן הם אזרחי ישראל.'],
      ['独自の宗教', 'דת בעלת מסורת עצמאית. התפתחות היסטורית מתוך סביבה דתית מסוימת אינה אומרת שהדתות זהות כיום.'],
    ],
    sources: ['druze', 'druzeReligion', 'druzePlaces'],
  },
  {
    id: 'israeli-mosaic', he: 'הפסיפס הישראלי: מוצא, עלייה וזהות', ja: 'イスラエル社会の多様なルーツ', photo: 'light-rail',
    intro: 'החברה הישראלית כוללת יהודים, ערבים וקהילות נוספות. כאן מתמקדים במגוון הרקעים בחברה היהודית: מזרחים עם שורשים במזרח התיכון ובצפון אפריקה, אשכנזים עם שורשים בעיקר במרכז אירופה ובמזרחה, יוצאי אתיופיה ויוצאי ברית המועצות לשעבר, לצד רבים אחרים. הקטגוריות חופפות: דובר רוסית עשוי להיות אשכנזי, יליד ישראל עשוי להיות ממוצא אתיופי, ובמשפחה אחת יכולים להיות כמה מקורות. מסורות משותפות וערבוב מתקיימים לצד פערים וחוויות של אפליה. מוצא אינו קובע אופי, דתיות או עמדה פוליטית.',
    en: 'The Israeli mosaic: roots, immigration and identity',
    enIntro: 'Israeli society includes Jews, Arabs and other communities. This topic focuses on varied Jewish family backgrounds: Mizrahi, Ashkenazi, Ethiopian and former Soviet origins, among many others. These categories overlap: a Russian speaker may be Ashkenazi, an Israeli-born person may have Ethiopian roots, and one family may combine several backgrounds. Cultural exchange coexists with inequalities and experiences of discrimination. Origin does not determine personality, religious practice or politics.',
    words: [
      ['ルーツ', '', 'שורשים, רקע משפחתי', 'roots; family background'], ['ミズラヒム', '', 'מזרחים — שם כולל לקהילות מוצא שונות', 'Mizrahi Jews; an umbrella identity'],
      ['アシュケナジム', '', 'אשכנזים', 'Ashkenazi Jews'], ['エチオピア系', 'エチオピアけい', 'ממוצא אתיופי', 'of Ethiopian origin'],
      ['旧ソ連出身', 'きゅうソれんしゅっしん', 'יוצאי ברית המועצות לשעבר', 'from the former Soviet Union'], ['ロシア語話者', 'ロシアごわしゃ', 'דוברי רוסית', 'Russian speakers'],
      ['多様性', 'たようせい', 'מגוון, רבגוניות', 'diversity'], ['移住', 'いじゅう', 'הגירה, מעבר לארץ אחרת', 'migration; moving to another country'],
    ],
    lines: [
      ['イスラエルには、家族のルーツがいろいろな国にある人たちが暮らしてるんだ。', 'いすらえるには、かぞくのるーつがいろいろなくににあるひとたちがくらしてるんだ。', 'בישראל חיים אנשים ששורשי המשפחה שלהם בארצות רבות ושונות.', 'People living in Israel have family roots in many different countries.', ['g09-2', 'g12-1']],
      ['ミズラヒムは、中東や北アフリカにルーツを持つユダヤ人たちの呼び方なんだ。', 'みずらひむは、ちゅうとうやきたあふりかにるーつをもつゆだやじんたちのよびかたなんだ。', 'מזרחים הוא שם כולל ליהודים עם שורשים במזרח התיכון ובצפון אפריקה.', 'Mizrahi is an umbrella term for Jews with roots in the Middle East and North Africa.', ['g09-2', 'g11-4', 'g12-1']],
      ['アシュケナジムは、主に中央ヨーロッパや東ヨーロッパにルーツがあるんだ。', 'あしゅけなじむは、おもにちゅうおうよーろっぱやひがしよーろっぱにるーつがあるんだ。', 'לאשכנזים יש שורשים בעיקר במרכז אירופה ובמזרחה.', 'Ashkenazi Jews trace their roots mainly to central and eastern Europe.', ['g11-4', 'g12-1']],
      ['エチオピア系ユダヤ人には、シグドという祭りなど、独自の伝統があるよ。', 'えちおぴあけいゆだやじんには、しぐどというまつりなど、どくじのでんとうがあるよ。', 'ליהודים יוצאי אתיופיה יש מסורות ייחודיות, ובהן חג הסיגד.', 'Ethiopian Jews have distinctive traditions, including the Sigd festival.', ['g09-2']],
      ['ここで「ロシア人」って呼ばれる人の中には、ウクライナなど、ロシア以外にルーツがある人もいるんだ。', 'ここで「ろしあじん」ってよばれるひとのなかには、うくらいななど、ろしあいがいにるーつがあるひともいるんだ。', 'בין מי שמכונים כאן ״רוסים״ יש גם אנשים ששורשיהם באוקראינה ובמדינות אחרות, ולא ברוסיה.', 'Some people colloquially called “Russians” here have roots in Ukraine or other countries rather than Russia.', ['g09-2', 'g17-2', 'g21-1', 'g12-1']],
      ['ロシア語を話すアシュケナジムもいるし、両親のルーツが違う人もいるよ。', 'ろしあごをはなすあしゅけなじむもいるし、りょうしんのるーつがちがうひともいるよ。', 'יש אשכנזים דוברי רוסית, ויש אנשים ששורשי שני הוריהם שונים.', 'Some Ashkenazi Jews speak Russian, and some people have parents with different family roots.', ['g09-2', 'g13-2']],
      ['でも、ルーツだけで、その人の性格や考え方は分からないよね。', 'でも、るーつだけで、そのひとのせいかくやかんがえかたはわからないよね。', 'אבל מהשורשים בלבד אי אפשר לדעת מה האופי או דרך החשיבה של אדם.', 'But family roots alone do not tell you a person’s character or opinions.', ['g11-4']],
    ],
    question: ['正美お母さん、美礼ちゃん、日本では、家族のルーツや地方の文化について話すことってある？', 'まさみおかあさん、みのりちゃん、にほんでは、かぞくのるーつやちほうのぶんかについてはなすことってある？', 'מאסאמי, מינורי, ביפן יוצא לדבר על שורשי המשפחה ועל תרבויות אזוריות?', 'Masami, Minori, do people in Japan talk about family roots or regional cultures?', ['g11-4', 'g17-2']],
    notes: [
      ['〜系', 'מציין מוצא או זיקה משפחתית, ואינו אומר בהכרח שנולדת באותה ארץ או שאת אזרח שלה. אפשר לומר エチオピア系イスラエル人 — ישראלי ממוצא אתיופי.'],
      ['ミズラヒム／セファルディム', 'מזרחים וספרדים הם מונחים בעלי חפיפה, אך אינם זהים לחלוטין: ״ספרדי״ יכול להתייחס לשורשים בקהילות ספרד ולמסורות תפילה, ו״מזרחי״ כולל קהילות מוצא שונות.'],
      ['ロシア語話者／旧ソ連出身', '״דובר רוסית״ מתאר שפה; ״יוצא ברית המועצות לשעבר״ מתאר רקע גאוגרפי והיסטורי. אף אחד מהם אינו דת, והם יכולים לחפוף למוצא אשכנזי, מזרחי או אחר.'],
      ['差別や格差', 'אפליה ופערים הם גם חלק מהסיפור ההיסטורי והחברתי. ההיכרות עם מסורות וערבוב בין קהילות אינה אומרת שכל החוויות או ההזדמנויות שוות.'],
    ],
    sources: ['groups', 'roots', 'mizrahi', 'ethiopia', 'immigration', 'inequality'],
  },
];

export const COMMUNITIES = TOPICS.map((t) => ({
  id: t.id, cat: 'communities', he: t.he, ja: t.ja, photo: t.photo, intro: t.intro,
  words: t.words.map(([ja, reading, he]) => [ja, reading, he]),
  sentences: t.lines.map(([ja, reading, he, , grammar]) => [ja, reading, he, grammar]),
  ask: [t.question[0], t.question[1], t.question[2], t.question[4]],
  english: { title: t.en, intro: t.enIntro, words: t.words.map((w) => w[3]), sentences: t.lines.map((s) => s[3]), ask: t.question[3] },
  notes: t.notes,
  sources: t.sources.map((key) => SOURCES[key]),
}));
