// Korean syllable → jamo decomposition + 2-set keyboard mapping

const HANGUL_BASE = 0xAC00;

const CHOSEONG  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 겹모음 → 단모음 분해 (ㅘ = ㅗ+ㅏ 등)
const JUNGSEONG_DECOMP: Record<string, [string, string]> = {
  'ㅘ':['ㅗ','ㅏ'], 'ㅙ':['ㅗ','ㅐ'], 'ㅚ':['ㅗ','ㅣ'],
  'ㅝ':['ㅜ','ㅓ'], 'ㅞ':['ㅜ','ㅔ'], 'ㅟ':['ㅜ','ㅣ'],
  'ㅢ':['ㅡ','ㅣ'],
};

// 겹받침 → 단자음 분해 (ㄳ = ㄱ+ㅅ 등)
const JONGSEONG_DECOMP: Record<string, [string, string]> = {
  'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'],
  'ㄺ':['ㄹ','ㄱ'], 'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'],
  'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ'],
  'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ'],
};

function syllableToJamos(char: string): string[] {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return [char]; // 한글 음절 아님 → 그대로

  const offset = code - HANGUL_BASE;
  const jongIdx = offset % 28;
  const jungIdx = Math.floor(offset / 28) % 21;
  const choIdx  = Math.floor(offset / 28 / 21);

  const cho  = CHOSEONG[choIdx];
  const jung = JUNGSEONG[jungIdx];
  const jong = JONGSEONG[jongIdx];

  const result: string[] = [cho];

  if (JUNGSEONG_DECOMP[jung]) {
    result.push(...JUNGSEONG_DECOMP[jung]);
  } else {
    result.push(jung);
  }

  if (jong) {
    if (JONGSEONG_DECOMP[jong]) {
      result.push(...JONGSEONG_DECOMP[jong]);
    } else {
      result.push(jong);
    }
  }

  return result;
}

export interface TextJamoInfo {
  jamoSequence: string[];                          // 전체 자모 배열
  syllableRanges: { start: number; end: number }[]; // 음절 i → jamoSequence의 [start, end)
}

export function decomposeText(text: string): TextJamoInfo {
  const jamoSequence: string[] = [];
  const syllableRanges: { start: number; end: number }[] = [];

  for (const char of text) {
    const start = jamoSequence.length;
    jamoSequence.push(...syllableToJamos(char));
    syllableRanges.push({ start, end: jamoSequence.length });
  }

  return { jamoSequence, syllableRanges };
}

// 두벌식 QWERTY → 한글 자모
export const KOREAN_KEY_TO_JAMO: Record<string, string> = {
  'r':'ㄱ', 'R':'ㄲ', 's':'ㄴ', 'e':'ㄷ', 'E':'ㄸ', 'f':'ㄹ',
  'a':'ㅁ', 'q':'ㅂ', 'Q':'ㅃ', 't':'ㅅ', 'T':'ㅆ', 'd':'ㅇ',
  'w':'ㅈ', 'W':'ㅉ', 'c':'ㅊ', 'z':'ㅋ', 'x':'ㅌ', 'v':'ㅍ', 'g':'ㅎ',
  'k':'ㅏ', 'o':'ㅐ', 'O':'ㅒ', 'i':'ㅑ', 'j':'ㅓ', 'p':'ㅔ', 'P':'ㅖ',
  'u':'ㅕ', 'h':'ㅗ', 'y':'ㅛ', 'n':'ㅜ', 'b':'ㅠ', 'm':'ㅡ', 'l':'ㅣ',
};

// e.code → QWERTY 기본 문자 (shift 무관)
export const CODE_TO_QWERTY: Record<string, string> = {
  'KeyA':'a','KeyB':'b','KeyC':'c','KeyD':'d','KeyE':'e',
  'KeyF':'f','KeyG':'g','KeyH':'h','KeyI':'i','KeyJ':'j',
  'KeyK':'k','KeyL':'l','KeyM':'m','KeyN':'n','KeyO':'o',
  'KeyP':'p','KeyQ':'q','KeyR':'r','KeyS':'s','KeyT':'t',
  'KeyU':'u','KeyV':'v','KeyW':'w','KeyX':'x','KeyY':'y',
  'KeyZ':'z','Space':' ',
};

export const isKoreanJamo = (c: string): boolean => {
  const code = c.charCodeAt(0);
  return code >= 0x3131 && code <= 0x3163;
};

/**
 * 자모 배열을 부분 음절로 합성해서 표시용 글자를 반환
 * ex) ['ㅅ'] → 'ㅅ', ['ㅅ','ㅏ'] → '사', ['ㅅ','ㅏ','ㅇ'] → '상'
 * 겹모음·겹받침도 처리
 */
export function composePartialJamos(jamos: string[]): string {
  if (jamos.length === 0) return '';
  if (jamos.length === 1) return jamos[0]; // 자모 단독

  const choIdx = CHOSEONG.indexOf(jamos[0]);
  if (choIdx === -1) return jamos[0]; // 초성이 아니면 그대로

  // ── 모음 결정 (겹모음 가능) ──
  let jungIdx: number;
  let afterJung: number; // jamos 중 모음 이후 시작 인덱스

  // jamos[1] + jamos[2] 가 겹모음인지 확인
  if (jamos.length >= 3) {
    const compound = Object.entries(JUNGSEONG_DECOMP).find(
      ([, [v1, v2]]) => v1 === jamos[1] && v2 === jamos[2],
    );
    if (compound) {
      jungIdx  = JUNGSEONG.indexOf(compound[0]);
      afterJung = 3;
    } else {
      jungIdx  = JUNGSEONG.indexOf(jamos[1]);
      afterJung = 2;
    }
  } else {
    jungIdx  = JUNGSEONG.indexOf(jamos[1]);
    afterJung = 2;
  }

  if (jungIdx === -1) return jamos[0];

  const base = HANGUL_BASE + (choIdx * 21 + jungIdx) * 28;

  const remaining = jamos.slice(afterJung);
  if (remaining.length === 0) return String.fromCharCode(base);

  // ── 받침 결정 (겹받침 가능) ──
  let jongIdx = 0;
  if (remaining.length >= 2) {
    const compound = Object.entries(JONGSEONG_DECOMP).find(
      ([, [c1, c2]]) => c1 === remaining[0] && c2 === remaining[1],
    );
    if (compound) jongIdx = JONGSEONG.indexOf(compound[0]);
  }
  if (jongIdx === 0) jongIdx = JONGSEONG.indexOf(remaining[0]);

  return String.fromCharCode(base + Math.max(jongIdx, 0));
}
