export const photoCatalog=[
  {
    "id": "memory-01",
    "src": "./assets/memories/memory-01.jpg",
    "alt": "טיול משותף מתחת לפריחת הדובדבן",
    "position": "50% 45%"
  },
  {
    "id": "memory-02",
    "src": "./assets/memories/memory-02.jpg",
    "alt": "פריחת הדובדבן וזיכרון מהטיול",
    "position": "50% 55%"
  },
  {
    "id": "memory-03",
    "src": "./assets/memories/memory-03.jpg",
    "alt": "רגע קטן של אוכל ולמידה",
    "position": "50% 45%"
  },
  {
    "id": "memory-04",
    "src": "./assets/memories/memory-04.jpg",
    "alt": "סביב שולחן ביחד",
    "position": "50% 25%"
  },
  {
    "id": "memory-05",
    "src": "./assets/memories/memory-05.jpg",
    "alt": "מקום מהטיול ביפן",
    "position": "50% 50%"
  },
  {
    "id": "memory-06",
    "src": "./assets/memories/memory-06.jpg",
    "alt": "ארוחה משותפת ביפן",
    "position": "50% 50%"
  },
  {
    "id": "memory-07",
    "src": "./assets/memories/memory-07.jpg",
    "alt": "צילום משותף ליד מקדש",
    "position": "50% 62%"
  },
  {
    "id": "memory-08",
    "src": "./assets/memories/memory-08.jpg",
    "alt": "חיוך עם כלב קטן",
    "position": "50% 43%"
  },
  {
    "id": "memory-09",
    "src": "./assets/memories/memory-09.jpg",
    "alt": "טיול משותף ליד מקדש אדום",
    "position": "50% 68%"
  },
  {
    "id": "memory-10",
    "src": "./assets/memories/memory-10.jpg",
    "alt": "טועמות משהו בשוק",
    "position": "50% 42%"
  },
  {
    "id": "memory-11",
    "src": "./assets/memories/memory-11.jpg",
    "alt": "רגע משותף עם מתנה",
    "position": "50% 45%"
  },
  {
    "id": "memory-12",
    "src": "./assets/memories/memory-12.jpg",
    "alt": "מבשלים יחד",
    "position": "50% 52%"
  },
  {
    "id": "memory-13",
    "src": "./assets/memories/memory-13.jpg",
    "alt": "צילום משותף מול השקיעה",
    "position": "50% 48%"
  },
  {
    "id": "memory-14",
    "src": "./assets/memories/memory-14.jpg",
    "alt": "עוצרים למשהו טעים",
    "position": "50% 44%"
  },
  {
    "id": "memory-15",
    "src": "./assets/memories/memory-15.jpg",
    "alt": "זיכרון משותף עם חברים",
    "position": "50% 55%"
  },
  {
    "id": "memory-16",
    "src": "./assets/memories/memory-16.jpg",
    "alt": "עוד רגע משותף עם חברים",
    "position": "50% 55%"
  }
];
export function dailyMemories(day) {
  let seed=2166136261;
  for(const c of day)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const result=[...photoCatalog];
  for(let i=result.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const captions=['また一緒に。','עוד רגע ביחד','思い出','בשביל השיחות שעוד יהיו','少しずつ。','הדרך שלנו'];
export function memoryMarkup(photo,index=0) {
  const angle=[-5,5,-3,4,-4,3][index%6];
  return '<figure class="pinned-memory memory-style-'+index%3+'" style="--tilt:'+angle+'deg"><span class="memory-pin" aria-hidden="true"></span><img src="'+photo.src+'" alt="'+photo.alt+'" loading="lazy" width="1000" height="1000" style="object-position:'+photo.position+'"><figcaption>'+captions[index%captions.length]+'</figcaption></figure>';
}
