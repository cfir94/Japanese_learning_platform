// Concrete vocabulary gets an actual subject image. Abstract words stay as text cards.
import { PLACE_PHOTOS } from './place-photos.js';
import { VOCAB_PHOTOS } from './vocab-photos.js';

const photos = Object.fromEntries([...PLACE_PHOTOS, ...VOCAB_PHOTOS].map(p => [p.id, p]));
export const WORD_IMAGE_IDS = {
  '市場':'market', '嘆きの壁':'western-wall', '岩のドーム':'jerusalem',
  '教会':'nazareth', '壁':'western-wall',
  '塩':'salt', '結晶':'salt', '泥':'dead-sea-mud',
  '要塞':'masada', '砂漠':'timna', '岩':'timna',
  'サンゴ':'eilat', 'サンゴ礁':'eilat', '魚':'eilat', 'ビーチ':'tel-aviv',
  'クレーター':'ramon', '地層':'ramon', '景色':'ramon', '湖':'galilee',
  '庭園':'haifa', '夜景':'haifa', '港':'fishing', '船':'fishing',
  '海岸':'habonim', '海辺':'tel-aviv', '遊歩道':'tel-aviv',
  '花':'anemones', '咲く':'anemones',
  '皿':'hummus', 'デザート':'knafeh', 'プリン':'malabi',
  '飲み物':'sahlab', 'シナモン':'sahlab', '焼く':'druze-pita',
  'じゅうたん':'weaving', '織る':'weaving', '模様':'weaving',
  '兵士':'security', '電車':'light-rail',
  'ゆで卵':'vocab-egg', '卵':'vocab-egg', 'なす':'vocab-eggplant',
  'ピタパン':'vocab-pita', 'パン':'vocab-pita',
  '玉ねぎ':'vocab-onion', 'ひよこ豆':'hummus', '豆':'hummus',
  'オリーブオイル':'vocab-oil', 'お茶':'vocab-tea', '糸':'vocab-thread', 'バラ':'vocab-flower',
};

export function wordImage(word) {
  return photos[WORD_IMAGE_IDS[word]] ?? null;
}
