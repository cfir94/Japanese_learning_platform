// English/Japanese versions of the shared journey vocabulary, in the original word order.
import { ENTRIES } from './journey.js';
export const ENGLISH_JOURNEY = {
  'jerusalem': ['Jerusalem', ['old city','city wall','holy place','religion','Western Wall','Dome of the Rock','Church of the Holy Sepulchre','market'], 'What would you like to see in Jerusalem?'],
  'dead-sea': ['The Dead Sea', ['salt','float','mud','below sea level','sunscreen','sting','low','salty','sink','does not sink'], 'Would you like to try floating?'],
  'masada': ['Masada', ['Roman Empire','revolt','fortress','palace','siege','siege ramp','surrender','slave, slavery','freedom','courage, heroism','hero','mass suicide','oath','sunrise'], 'Is there a place in Japan with a sad history like this?'],
  'timna': ['Timna', ['desert','rock','red','copper mine','pillar','hot','hat','walk','on the way to'], 'Have you ever been to a desert?'],
  'eilat': ['Eilat', ['Red Sea','south','coral','fish','beach','swim','warm','tax-free'], 'Would you like to go swimming?'],
  'ramon': ['Ramon Crater', ['crater','rock layer','meteorite','star','view','erode','wind','jacket'], 'Shall we look at the stars?'],
  'galilee': ['The Sea of Galilee', ['lake','viewpoint','hill','hot spring','green','boat','fish dish','bloom'], 'Can we take a boat on the lake?'],
  'nazareth': ['Nazareth', ['Christianity','Jesus','church','childhood','town','Arab food','sweets','famous'], 'What is this town famous for?'],
  'haifa': ['Haifa', ['garden','stairs','mountain','port','lower town','night view','slope','building'], 'Where is the best view?'],
  'habonim': ['Habonim Beach', ['coast','wave','sunset','walk','seashell','nature','quiet','sink or set'], 'Shall we take a walk by the sea?'],
  'anemones': ['Anemones', ['flower','bloom','red','field','spring','season','national flower','pick'], 'When do these flowers bloom?'],
  'jaffa': ['Jaffa', ['port town','old','alley','flea market','clock tower','lighthouse','get lost or hesitate','meeting place'], 'Shall we explore the old streets?'],
  'tel-aviv': ['Tel Aviv', ['seaside','promenade','art museum','bicycle','lively','white','live music','first'], 'Would you prefer the beach or the museum?'],
  'hummus': ['Hummus', ['chickpea','sesame','olive oil','plate','tear','scoop','full','another serving'], 'How do you eat this?'],
  'falafel': ['Falafel', ['deep-fry','spicy','food stall','inexpensive','vegetable','everything','takeaway','bean'], "Could you make it without hot sauce?"],
  'shakshuka': ['Shakshuka', ['egg','tomato','frying pan','breakfast','how to make it','mix','how many','bread'], 'Would you like to cook this together?'],
  'knafeh': ['Knafeh', ['cheese','sweet','syrup','pistachio','freshly made','half','share','dessert'], 'Shall we share one?'],
  'malabi': ['Malabi', ['milk','pudding','rose','scent','cold','nuts','soft','allergy'], 'Does this contain nuts?'],
  'sahlab': ['Sahlab', ['drink','warm','cinnamon','winter','thick and creamy','just right','body','sprinkle or pour'], 'What is in this warm drink?'],
  'baklava': ['Baklava', ['dough','thin','layer','honey','walnut','souvenir','box','decide'], 'Could I have a small box?'],
  'druze-pita': ['Druze flatbread', ['freshly baked','bake or grill','village','herb','roll','right in front of us','the best','enough'], 'Could I watch how you make it?'],
  'labneh': ['Labneh', ['yogurt','sour','spread','taste','light and refreshing','pour or sprinkle','different','someone who prefers'], 'Is it a little sour?'],
  'snorkel': ['Snorkelling', ['mask','fins','breath','dive','shallow','deep','coral reef','touch'], 'Could you show me how to use the mask?'],
  'mud': ['Dead Sea mud', ['mud','spread','dry','rinse off','skin','smooth','whole body','souvenir'], 'How do I rinse this off?'],
  'bedouin': ['A Bedouin tent', ['tent','stay overnight','tea','blanket','floor','starry sky','hospitality','tonight'], 'Will we stay here tonight?'],
  'weaving': ['Rug making', ['rug','weave','thread','colour','pattern','handmade','workshop','by myself'], 'Could you show me one more time?'],
  'cooking': ['Cooking together', ['cooking','cut','onion','taste','pot','ingredient','recipe','good at'], 'Would you like me to cut the vegetables?'],
  'fishing': ['Fishing', ['fishing','catch a fish','be able to catch fish','boat','fresh','bait','sashimi','not at all'], 'How would you like to cook the fish?'],
  'market': ['The market and supermarket', ['market','supermarket','fruit','spice','food sample','how much','bag','be crowded'], 'May I taste this?'],
  'religions': ['Religions in Jerusalem', ['Judaism','Christianity','Islam','pray','Sabbath','clothing','Buddhist temple','Shinto shrine'], 'Could you explain what this place means to people?'],
  'geology': ['Geology', ['geology','rock layer','fault','crystal','erosion','evaporation','fossil','volcano'], 'How was this landscape formed?'],
  'history': ['Jewish history', ['history','temple','king','palace','festival','tradition','approximately','briefly'], 'Could you tell me a little about its history?'],
  'society': ['Israeli society', ['society','culture','immigrant','of Arab background','language','live','opinion','way of thinking'], 'What is everyday life like here?'],
  'war': ['Talking about war', ['war','attack','hostage','safety','worry','feeling','complicated','peace','soldier','gun','weapon','train','bus','unease','notice','protect','be afraid'], 'How do you feel about it?'],
  'sabich': ['Sabich', ['eggplant','fry','hard-boiled egg','pita','tahini','amba (mango pickle)','filling','put inside'], 'What do you like to eat for breakfast?'],
  'security': ['Everyday security', ['soldier','army','military service','gun','weapon','security guard','bag check','siren','shelter','safe','dangerous','calm down'], 'What do people do in Japan when there is an earthquake?'],
  'guiding': ['Guiding words', ['look','on our right','on our left','in front of us','remember?','about','in relation to','compared to','speaking of','for example','in other words','actually','at that time'], 'What words do Japanese tour guides often use?'],
  'culture': ['Cultural differences', ['culture','difference','be different','custom','say it directly','hold back (to be polite)','speak loudly','strict about time','wait in line','be surprised','get used to','read the room'], 'What feels most different here?'],
};

export const ENGLISH_CATEGORIES = { places: ['Places','場所'], food: ['Food','食べ物'], activities: ['Activities','体験'], topics: ['Conversations','話題'] };

ENGLISH_JOURNEY['jewish-arab-relations'] = ['Jewish–Arab relations', [], 'What would you like to ask about this topic?'];
ENGLISH_JOURNEY['speaking-patterns'] = ['Conversation and explanation', [], 'Could you say that again slowly?'];
const EXTRA_GLOSS = {
  '教会':'church', '嘆き':'lamentation, grief', '嘆く':'lament, grieve', '泣く':'cry', '壁':'wall',
  '宗教':'religion', '興味':'interest', '興味がある':'be interested', '興味がない':'not be interested', 'とても':'very', 'めっちゃ':'really, very (casual)',
  '揚げなす':'fried eggplant', '焼きなす':'grilled eggplant', '焼く':'grill, bake', '二人':'two people', '食べてほしい':'want someone to eat', '入ってる':'be inside, contain (casual)',
  '味見する':'taste, check the flavour', '味見してほしい':'want someone to taste', '試食する':'try a food sample', '食べてみる':'try eating, try a food', '特に':'especially', '例えば':'for example', 'いろいろな':'various',
  'つなげる':'connect', 'つなげて':'connect (te-form)', '説明する':'explain', 'ゆっくり':'slowly, at ease', 'もう一回':'one more time', '一般的に':'in general',
  'ユダヤ人':'Jewish person, Jews', 'アラブ人':'Arab person, Arabs', '関係':'relationship', '状況':'situation', '土地':'land', '政治':'politics', '問題':'issue, problem', '複雑':'complicated', '微妙な':'delicate, tricky; ambiguous in some contexts', 'デリケートな':'sensitive, delicate', '考え方':'way of thinking', '一人一人':'each individual', '大切な場所':'important place',
  'について':'about', 'にとって':'for, from the standpoint of', '特別な':'special', '有名な':'famous', '大切な':'important', '考える':'think', 'ちょっと待って':'wait a moment', '完璧':'perfect', '続ける':'continue', '予約する':'book, reserve', '予約した':'booked, reserved', '二泊する':'stay two nights', '文':'sentence',
};
for (const entry of ENTRIES) {
  const words = ENGLISH_JOURNEY[entry.id][1];
  for (let i = words.length; i < entry.words.length; i++) {
    const ja = entry.words[i][0];
    if (!EXTRA_GLOSS[ja]) throw new Error(`Missing English gloss: ${ja}`);
    words.push(EXTRA_GLOSS[ja]);
  }
}

