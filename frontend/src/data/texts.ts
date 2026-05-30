// ── BattleArena 하위 호환 ────────────────────────────────────
export type Lang = 'ko' | 'en' | 'mixed';

export const TEXTS: Record<'ko' | 'en', string[]> = {
  ko: [
    '빠른 갈색 여우가 게으른 개를 뛰어 넘었습니다. 타이핑 연습을 매일 꾸준히 하면 실력이 빠르게 늘어납니다.',
    '오늘 하루도 열심히 타이핑 연습을 해서 손가락이 키보드 위에서 춤을 추는 날까지 포기하지 말고 계속 나아가 봅시다.',
    '포도알이 주렁주렁 열린 포도밭에서 포도 농부가 싱싱한 포도를 따며 즐거운 하루를 보내고 있습니다.',
    '하늘을 나는 새처럼 자유롭고 빠르게 타이핑하는 실력을 키우기 위해서는 꾸준한 연습만이 답입니다.',
    '세상에서 가장 빠른 타이피스트는 매일 꾸준히 연습한 결과로 그 자리에 오를 수 있었습니다.',
    '봄에는 꽃이 피고 여름에는 녹음이 우거지며 가을에는 단풍이 물들고 겨울에는 눈이 내립니다.',
    '컴퓨터 앞에 앉아 빠른 손가락으로 키보드를 두드리는 소리가 마치 음악처럼 들릴 때가 있습니다.',
    '열 손가락을 모두 활용하는 올바른 타이핑 자세를 익히면 속도와 정확도가 동시에 향상됩니다.',
  ],
  en: [
    'The quick brown fox jumps over the lazy dog. Practice typing every day to improve your speed and accuracy.',
    'To be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows.',
    'All that glitters is not gold often have you heard that told many a man his life hath sold.',
    'It was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness.',
    'The only way to do great work is to love what you do if you have not found it yet keep looking.',
    'Two roads diverged in a wood and I took the one less traveled by and that has made all the difference.',
    'Ask not what your country can do for you ask what you can do for your country.',
    'In the beginning God created the heavens and the earth the earth was without form and void and darkness.',
  ],
};

const battleLastPicked: Record<'ko' | 'en', number> = { ko: -1, en: -1 };

export function getRandomText(lang: Lang): string {
  const key: 'ko' | 'en' = lang === 'mixed'
    ? (Math.random() < 0.7 ? 'ko' : 'en')
    : lang as 'ko' | 'en';
  const pool = TEXTS[key];
  let idx: number;
  do { idx = Math.floor(Math.random() * pool.length); }
  while (pool.length > 1 && idx === battleLastPicked[key]);
  battleLastPicked[key] = idx;
  return pool[idx];
}

// ── 연습 모드 ────────────────────────────────────────────────
export type TypingMode = 'consonant' | 'vowel' | 'left' | 'right' | 'word' | 'short' | 'long';

export interface ModeMeta {
  label: string;
  hasLang: boolean;   // 언어 토글 표시 (단어·짧은글·긴글만)
  hasTimer: boolean;  // 시간 선택 표시 (짧은글·긴글만) — 없으면 60초 고정
}

export const MODE_META: Record<TypingMode, ModeMeta> = {
  consonant: { label: '자음',    hasLang: false, hasTimer: false },
  vowel:     { label: '모음',    hasLang: false, hasTimer: false },
  left:      { label: '왼손',    hasLang: false, hasTimer: false },
  right:     { label: '오른손',  hasLang: false, hasTimer: false },
  word:      { label: '단어',    hasLang: true,  hasTimer: false },
  short:     { label: '짧은 글', hasLang: true,  hasTimer: true  },
  long:      { label: '긴 글',   hasLang: true,  hasTimer: true  },
};

// 두벌식 왼손(자음) 키가 다수 연속되는 문장 — 받침·겹받침 집중
const CONSONANT_KO = [
  '갈매기 날개 달린 깜짝 선물 박스를 갖다 놓고 달려갔습니다.',
  '낙타 등에 짐 싣고 끝없는 사막을 달리는 대장정이 시작됩니다.',
  '딱따구리가 딱딱딱 나무를 두드리는 소리가 숲속에 울려 퍼집니다.',
  '꽃잎 떨어지는 봄날 벚꽃 아래서 행복한 한때를 보냈습니다.',
  '박물관 입구에서 특별 전시가 펼쳐져 관람객들이 몰려들었습니다.',
  '국밥 한 그릇 먹고 나면 기운이 솟구쳐 오르는 느낌이 듭니다.',
  '닭볶음탕 떡볶이 족발 보쌈이 함께 나오는 한상 차림이었습니다.',
  '복잡한 골목길을 따라 걷다 보면 작은 빵집이 나옵니다.',
  '직업의 귀천은 없다지만 각자의 역할이 사회에서 중요합니다.',
  '속담에는 조상들의 삶의 지혜가 깊이 녹아들어 있습니다.',
  '학생들이 책상 앞에 앉아 집중하며 열심히 공부하고 있습니다.',
  '목적지까지 걸어서 도착하는 것이 건강에 가장 좋습니다.',
  '먹구름이 몰려오더니 순식간에 비가 쏟아지기 시작했습니다.',
  '축구 선수들이 박진감 넘치는 경기를 선보이며 관중을 사로잡았습니다.',
  '닭갈비 맛집을 찾아 전국 각지를 돌아다니는 사람들이 늘고 있습니다.',
];

// 다양한 모음과 겹모음을 집중 연습 — ㅘ ㅙ ㅚ ㅝ ㅟ ㅢ 포함
const VOWEL_KO = [
  '아야어여오요우유으이 순서대로 외우면 타자 실력이 빨라집니다.',
  '아버지와 어머니께서 오이와 야채를 사러 시장에 가셨습니다.',
  '예쁜 야채 요리를 아이에게 이유식으로 우유와 함께 드렸어요.',
  '어이없이 이유도 없이 야채를 아예 안 먹는 아이가 있어요.',
  '우유와 요거트를 야채 주스와 함께 아이에게 주면 유익해요.',
  '귀여운 강아지가 의자 뒤에서 뛰어나와 봐봐 소리쳤어요.',
  '봐봐 뭐야 됐어요 귀여운 돼지가 외국 의자에 앉아 있어요.',
  '화이팅 외치며 봐봐 귀여운 강아지가 의자 뒤에서 뛰어나왔어요.',
  '외로운 나그네가 의지할 데 없어 뒤돌아보며 희망을 찾았어요.',
  '아이야 어서 이리 와서 야채 오이 주스 마시고 이야기하자.',
  '화요일에 봐야 할 영화가 획기적으로 귀여운 내용이었어요.',
  '귀뚜라미 소리가 뒤에서 들려왔고 의자에 앉아 봐봐 들었어요.',
  '봐요 봐봐요 봐봐봐봐요 귀여워요 뭐야 뭐예요 됐어요.',
  '뭐야 봐봐 됐어 봐요 최고야 귀여워요 외로워요 의미없어요.',
  '아이가 이야기를 야채처럼 예쁘게 요리처럼 설명해줬어요.',
];

// 두벌식 왼손 영역(자음)을 집중하는 문장 — 받침 많고 자음 전환 빈번
const LEFT_KO = [
  '긁다 읽다 밟다 삶다 굵다 넓다 닳다 없다 않다 핥다 훑다.',
  '닭갈비 떡볶이 국밥 족발 보쌈 곱창 순대 감자탕 설렁탕 삼겹살.',
  '목적 득점 박자 작곡 독서 특기 각도 혁신 박물관 학생 직업.',
  '박격포 독립문 탁구대 낙낙하다 넉넉하다 딱딱하다 막막하다.',
  '붙들다 볶다 닦다 긁다 읽다 밟다 삶다 굵다 넓다 짧다 깊다.',
  '학교 직장 목표 작업 독특 각별 특별 전문직 국문학 법학 독학.',
  '국물에 밥 말아 꿀꺽꿀꺽 먹다 보니 닭다리가 없어졌습니다.',
  '딱딱한 딱밤을 딱딱딱 두드리니 딱따구리가 깜짝 놀랐습니다.',
  '학생들이 각자의 목표를 갖고 독학으로 전문직에 도달했습니다.',
  '꽁꽁 얼어붙은 날씨에도 꾸준히 연습하는 학생이 늘고 있습니다.',
  '닭갈비 만드는 법을 독학으로 배워 박물관 앞 식당을 열었습니다.',
  '박물관에서 특별 전시를 보며 독특한 작품들에 감탄했습니다.',
  '낙낙하고 넉넉한 마음으로 전국 각지를 돌아다니고 싶습니다.',
  '꽃잎 낙엽 딱따구리 빨갛게 까맣게 파랗게 노랗게 새하얗게.',
  '복잡한 골목길 박물관 꽃잎 딱딱 꽉꽉 꽁꽁 꿀꺽 탁탁탁.',
];

// 두벌식 오른손 영역(모음)을 집중하는 문장 — 다양한 모음 전환 빈번
const RIGHT_KO = [
  '아이야 어서 이리 오렴 야채 오이 주스 마셔봐 이렇게 유익해.',
  '우리 아이가 야채를 이야기하며 요리를 예쁘게 해줬어요.',
  '아야어여 오요우유으이 이렇게 연습하면 타자 실력이 늘어요.',
  '야채와 오이로 아이를 위한 이유식을 예쁘게 만들었습니다.',
  '이야기를 야채처럼 예쁘게 요리하여 아이에게 들려주었어요.',
  '예쁜 이유가 있어도 아이야 야채 먹기를 꺼리면 안 돼요.',
  '야호 아이야 어서 와요 이야기 야채 요리 오이 유리 있어요.',
  '아이가 이야기를 이유없이 아예 안 해요 어이없어요 야야야.',
  '아야어여오요우유으이 이렇게 외우며 연습하면 빨라져요.',
  '이유없이 아이가 야채 오이 요리를 아예 안 먹는다고 해요.',
  '오이와 야채가 이유식에 이야기처럼 예쁘게 담겨있었어요.',
  '아이유 노래에 맞춰 야호 외치며 이야기하며 어울려 놀았어요.',
  '야채 요리를 아이에게 이야기하며 예쁘게 먹이려 했지만 어요.',
  '야채 주스 아이 이야기 오이 요리 유리 예쁘다 이유 야호.',
  '어이구 아이야 야채도 오이도 이야기도 이렇게 예쁘잖아요.',
];

// 자주 쓰이는 한국어 단어 묶음
const WORD_KO = [
  '가방 나무 다리 라디오 마음 바람 사랑 아기 자동차 차례 카드 타자',
  '국가 대학 미국 방법 사회 안전 학교 회사 인간 문화 역사 과학',
  '시작 연습 타이핑 키보드 컴퓨터 프로그램 소프트웨어 인터넷 데이터',
  '봄날 여름 가을 겨울 하늘 구름 바다 강물 산봉우리 들판 숲속',
  '커피 초콜릿 아이스크림 케이크 쿠키 빵 과일 야채 음료 식사 간식',
  '행복 기쁨 슬픔 분노 두려움 설렘 사랑 우정 신뢰 희망 용기 평화',
  '사과 배 포도 딸기 수박 참외 귤 오렌지 레몬 바나나 키위 체리',
  '달리기 수영 축구 야구 농구 배드민턴 탁구 테니스 골프 스키 스케이트',
  '책상 의자 창문 문 바닥 천장 벽 계단 복도 화장실 거실 주방',
  '아침 점심 저녁 밥 국 반찬 김치 된장국 미역국 순두부 비빔밥 볶음밥',
  '빨강 파랑 노랑 초록 보라 하늘색 분홍 주황 검정 하양 회색 갈색',
  '월요일 화요일 수요일 목요일 금요일 토요일 일요일 주말 평일 공휴일',
  '봄비 여름비 가을비 겨울눈 봄눈 가랑비 소나기 장마 폭설 우박 안개',
  '하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열 스물 서른 마흔 쉰',
  '서울 부산 대구 인천 광주 대전 울산 세종 수원 창원 고양 용인',
];

// Common English word groups
const WORD_EN = [
  'apple banana cherry date elderberry fig grape honeydew kiwi lemon',
  'keyboard mouse monitor laptop desktop printer scanner camera tablet phone',
  'running swimming cycling hiking climbing surfing skiing skating rowing',
  'mountain river ocean desert forest meadow valley canyon lake waterfall',
  'happy sad angry surprised confused excited nervous calm peaceful joyful',
  'red blue green yellow orange purple pink brown black white gray silver',
  'spring summer autumn winter season weather sunshine rainfall thunderstorm',
  'book magazine newspaper journal article essay poem story novel biography',
  'doctor lawyer teacher engineer scientist artist musician chef architect',
  'fast slow big small tall short heavy light warm cold rough smooth sharp',
  'Monday Tuesday Wednesday Thursday Friday Saturday Sunday morning evening',
  'January February March April May June July August September October',
  'coffee tea water juice milk smoothie soda lemonade sparkling mineral',
  'one two three four five six seven eight nine ten hundred thousand million',
  'house apartment building office school hospital library park bridge road',
];

// 짧은 글 — 한국어
const SHORT_KO = [
  '빠른 갈색 여우가 게으른 개를 뛰어 넘었습니다. 타이핑 연습을 매일 꾸준히 하면 실력이 빠르게 늘어납니다.',
  '오늘 하루도 열심히 타이핑 연습을 해서 손가락이 키보드 위에서 춤을 추는 날까지 포기하지 말고 계속 나아가 봅시다.',
  '포도알이 주렁주렁 열린 포도밭에서 포도 농부가 싱싱한 포도를 따며 즐거운 하루를 보내고 있습니다.',
  '하늘을 나는 새처럼 자유롭고 빠르게 타이핑하는 실력을 키우기 위해서는 꾸준한 연습만이 답입니다.',
  '세상에서 가장 빠른 타이피스트는 매일 꾸준히 연습한 결과로 그 자리에 오를 수 있었습니다.',
  '봄에는 꽃이 피고 여름에는 녹음이 우거지며 가을에는 단풍이 물들고 겨울에는 눈이 내립니다.',
  '컴퓨터 앞에 앉아 빠른 손가락으로 키보드를 두드리는 소리가 마치 음악처럼 들릴 때가 있습니다.',
  '열 손가락을 모두 활용하는 올바른 타이핑 자세를 익히면 속도와 정확도가 동시에 향상됩니다.',
  '강아지가 꼬리를 흔들며 주인을 반기는 모습을 보면 하루의 피로가 싹 사라지는 것 같습니다.',
  '노을빛 하늘을 바라보며 오늘 하루도 최선을 다해 살았다는 생각에 마음이 뿌듯해집니다.',
  '도서관에서 책을 읽으면 새로운 세계가 열리고 상상력과 창의력이 무한히 발전합니다.',
  '매일 아침 따뜻한 커피 한 잔과 함께 하루를 시작하면 기분이 상쾌하고 활기차집니다.',
  '친구들과 함께 산을 오르며 나누는 이야기는 어떤 대화보다 솔직하고 가슴에 와 닿습니다.',
  '바닷가에서 들려오는 파도 소리는 마음을 평온하게 만들고 모든 걱정을 잊게 해줍니다.',
  '새벽녘에 피어나는 이슬 맺힌 꽃잎들을 바라보면 자연의 경이로움에 감탄하게 됩니다.',
  '오랜 친구와 오랜만에 만나 나누는 추억 이야기는 시간 가는 줄 모르게 만듭니다.',
  '어린 시절 뛰어놀던 골목길을 다시 걸으면 그때의 설레임과 순수함이 되살아납니다.',
  '훌륭한 요리사는 최상의 재료를 고르는 안목과 정성을 다하는 마음을 함께 갖추고 있습니다.',
  '밤하늘의 별을 세며 우주의 광대함을 느낄 때 인간의 존재가 얼마나 작은지 깨닫게 됩니다.',
  '산들바람이 불어오는 봄날 공원에서 책을 읽는 것은 최고의 사치이자 행복입니다.',
  '빗소리를 들으며 따뜻한 방에서 책을 읽는 것보다 더 아늑한 시간은 없습니다.',
  '실패는 성공의 어머니라는 말처럼 포기하지 않고 다시 도전하는 것이 성장의 핵심입니다.',
  '언어를 배운다는 것은 새로운 세계를 이해하고 다른 문화와 소통하는 능력을 키우는 일입니다.',
  '고요한 숲길을 걸으며 자연의 소리에 귀를 기울이면 마음속 복잡한 생각들이 정리됩니다.',
  '꿈을 향해 나아가는 여정에서 만나는 어려움들은 결국 더 단단한 사람으로 만들어줍니다.',
  '새벽 시장에서 풍기는 갓 구운 빵의 향기는 어떤 향수보다 진하고 기억에 남습니다.',
  '오랫동안 기다려온 여행지에 드디어 도착했을 때의 그 설렘은 말로 표현할 수 없습니다.',
  '음악은 국경과 언어를 초월하여 사람들의 마음을 하나로 이어주는 특별한 힘을 가집니다.',
  '좋은 습관을 만드는 것은 어렵지만 한번 자리잡은 습관은 삶을 크게 바꾸어 놓습니다.',
  '지식을 나누는 것은 촛불로 다른 촛불에 불을 붙이는 것과 같아서 나누어도 줄어들지 않습니다.',
];

// Short passages — English
const SHORT_EN = [
  'The quick brown fox jumps over the lazy dog. Practice typing every day to improve your speed and accuracy.',
  'To be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows.',
  'All that glitters is not gold often have you heard that told many a man his life hath sold.',
  'It was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness.',
  'The only way to do great work is to love what you do if you have not found it yet keep looking.',
  'Two roads diverged in a wood and I took the one less traveled by and that has made all the difference.',
  'Ask not what your country can do for you ask what you can do for your country.',
  'In the beginning God created the heavens and the earth the earth was without form and void and darkness.',
  'Success is not final failure is not fatal it is the courage to continue that counts above all else.',
  'The greatest glory in living lies not in never falling but in rising every time we fall.',
  'Life is what happens when you are busy making other plans so make each moment count.',
  'Spread love everywhere you go let no one ever come to you without leaving happier than before.',
  'When you reach the end of your rope tie a knot in it and hang on with all your might.',
  'Always remember that you are absolutely unique just like everyone else in this wide world.',
  'Do not go where the path may lead go instead where there is no path and leave a trail behind.',
  'You will face many defeats in life but never let yourself be defeated by them in the end.',
  'In the end it is not the years in your life that count but the life that you put into your years.',
  'Never let the fear of striking out keep you from playing the great game of life to the fullest.',
  'Darkness cannot drive out darkness only light can do that hate cannot drive out hate only love can.',
  'The future belongs to those who believe in the beauty of their dreams and work hard every day.',
];

// 긴 글 — 한국어 단락
const LONG_KO = [
  '타이핑은 현대 사회에서 없어서는 안 될 기술 중 하나입니다. 매일 컴퓨터와 스마트폰을 사용하는 시대에 빠르고 정확한 타이핑 실력은 업무 효율을 크게 높여줍니다. 처음에는 느리고 어색하게 느껴지더라도 꾸준한 연습을 통해 누구나 빠른 타이피스트가 될 수 있습니다. 오늘도 포기하지 말고 한 발 한 발 나아가 보세요.',
  '한글은 세종대왕이 만든 아름다운 문자입니다. 과학적으로 설계된 한글은 자음과 모음이 조화를 이루어 수천 개의 음절을 표현할 수 있습니다. 두벌식 자판은 자음을 왼손으로 모음을 오른손으로 입력하여 양손이 균형 있게 사용됩니다. 한글 타이핑의 특성을 이해하면 더 빠르게 실력을 키울 수 있습니다.',
  '인공지능 기술이 발전하면서 우리 삶의 많은 부분이 변화하고 있습니다. 자율주행 자동차부터 의료 진단 시스템까지 다양한 분야에서 활용되고 있으며 앞으로도 그 영역은 계속 확대될 것입니다. 그러나 인공지능이 대체할 수 없는 인간만의 창의력과 감성은 여전히 소중합니다. 기술과 인간이 함께 공존하는 미래를 만들어 나가야 합니다.',
  '독서는 지식을 쌓고 상상력을 키우는 가장 좋은 방법 중 하나입니다. 책을 통해 다른 사람의 삶을 간접 경험하고 새로운 시각으로 세상을 바라볼 수 있습니다. 매일 조금씩이라도 책을 읽는 습관을 들이면 언어 능력과 사고력이 함께 발전합니다. 좋은 책 한 권은 훌륭한 스승이자 평생 친구가 될 수 있습니다.',
  '운동은 신체 건강뿐만 아니라 정신 건강에도 매우 중요합니다. 규칙적인 운동을 통해 스트레스를 해소하고 긍정적인 에너지를 충전할 수 있습니다. 걷기 달리기 수영 등 자신에게 맞는 운동을 찾아 꾸준히 실천하는 것이 중요합니다. 건강한 몸과 마음이 있어야 원하는 삶을 살아갈 수 있습니다.',
];

// Long passages — English
const LONG_EN = [
  'Technology has transformed the way we communicate and work in the modern world. From sending emails to writing code, typing skills have become essential in virtually every profession. The ability to type quickly and accurately not only saves time but also allows thoughts to flow more freely onto the page. Investing time in improving your typing speed is one of the best productivity decisions you can make.',
  'The Korean alphabet Hangul was created by King Sejong the Great in the fifteenth century. Unlike many writing systems that evolved over thousands of years Hangul was scientifically designed with specific linguistic principles in mind. Each consonant represents the shape of the mouth when making that sound while vowels are based on three elements representing heaven earth and humanity. This elegant design makes Hangul one of the most systematic writing systems in the world.',
  'Learning a new skill requires patience dedication and consistent practice over time. Whether you are learning to play an instrument speak a foreign language or improve your typing speed the fundamentals remain the same. Small daily improvements compound into significant gains over weeks and months. The key is to show up every day even when progress feels slow and maintain belief in the process.',
  'The science of habit formation tells us that behaviors become automatic through repetition and reward. When you practice typing regularly your fingers begin to find the keys without conscious thought allowing your mind to focus entirely on the content you are creating. This state of automatic movement is called muscle memory and it is the foundation of expert performance in any field requiring physical precision.',
  'Reading widely and writing regularly are two of the most powerful ways to develop your mind and communication skills. The more you read the larger your vocabulary grows and the more naturally ideas come to you. Writing forces you to clarify your thinking and organize your thoughts in ways that speaking alone cannot achieve. Together reading and writing form a virtuous cycle of intellectual growth that compounds over a lifetime.',
];

// 모드별 텍스트 풀
const PRACTICE_TEXTS: Record<TypingMode, Partial<Record<'ko' | 'en', string[]>>> = {
  consonant: { ko: CONSONANT_KO },
  vowel:     { ko: VOWEL_KO },
  left:      { ko: LEFT_KO },
  right:     { ko: RIGHT_KO },
  word:      { ko: WORD_KO, en: WORD_EN },
  short:     { ko: SHORT_KO, en: SHORT_EN },
  long:      { ko: LONG_KO, en: LONG_EN },
};

const practiceLastPicked: Partial<Record<string, number>> = {};

export function getPracticeText(mode: TypingMode, lang: 'ko' | 'en' = 'ko'): string {
  const pool = PRACTICE_TEXTS[mode][lang] ?? PRACTICE_TEXTS[mode].ko!;
  const key  = `${mode}:${lang}`;
  let idx: number;
  do { idx = Math.floor(Math.random() * pool.length); }
  while (pool.length > 1 && idx === practiceLastPicked[key]);
  practiceLastPicked[key] = idx;
  return pool[idx];
}

// ── 커스텀 사전 지원 ─────────────────────────────────────────
// 단어 목록을 받아 자연스러운 연습 문장을 만들어 반환.
// 단어가 없으면 기본 short 텍스트로 폴백.
let customLastIdx = -1;

export function getTextFromWords(words: string[]): string {
  if (!words.length) return getPracticeText('short', 'ko');
  let idx: number;
  do { idx = Math.floor(Math.random() * words.length); }
  while (words.length > 1 && idx === customLastIdx);
  customLastIdx = idx;
  return words[idx];
}

