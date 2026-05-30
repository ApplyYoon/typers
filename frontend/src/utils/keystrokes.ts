/**
 * 초성: 항상 1타 (ㄲ,ㄸ,ㅃ,ㅆ,ㅉ도 shift 포함 단타)
 *
 * 중성: 복합 모음은 2타
 * ㅘ(ㅗ+ㅏ), ㅙ(ㅗ+ㅐ), ㅚ(ㅗ+ㅣ),
 * ㅝ(ㅜ+ㅓ), ㅞ(ㅜ+ㅔ), ㅟ(ㅜ+ㅣ), ㅢ(ㅡ+ㅣ)
 *
 * 종성: 없으면 0, 복합 자음은 2타
 * ㄳ(ㄱ+ㅅ), ㄵ(ㄴ+ㅈ), ㄶ(ㄴ+ㅎ), ㄺ(ㄹ+ㄱ), ㄻ(ㄹ+ㅁ),
 * ㄼ(ㄹ+ㅂ), ㄽ(ㄹ+ㅅ), ㄾ(ㄹ+ㅌ), ㄿ(ㄹ+ㅍ), ㅀ(ㄹ+ㅎ), ㅄ(ㅂ+ㅅ)
 */

// 중성 인덱스(0~20)별 타수
const JUNGSEONG_KEYS = [
  1, // ㅏ
  1, // ㅐ
  1, // ㅑ
  1, // ㅒ
  1, // ㅓ
  1, // ㅔ
  1, // ㅕ
  1, // ㅖ
  1, // ㅗ
  2, // ㅘ = ㅗ+ㅏ
  2, // ㅙ = ㅗ+ㅐ
  2, // ㅚ = ㅗ+ㅣ
  1, // ㅛ
  1, // ㅜ
  2, // ㅝ = ㅜ+ㅓ
  2, // ㅞ = ㅜ+ㅔ
  2, // ㅟ = ㅜ+ㅣ
  1, // ㅠ
  1, // ㅡ
  2, // ㅢ = ㅡ+ㅣ
  1, // ㅣ
];

// 종성 인덱스(0~27)별 타수 (0 = 받침 없음)
const JONGSEONG_KEYS = [
  0, // (없음)
  1, // ㄱ
  1, // ㄲ (shift 단타)
  2, // ㄳ = ㄱ+ㅅ
  1, // ㄴ
  2, // ㄵ = ㄴ+ㅈ
  2, // ㄶ = ㄴ+ㅎ
  1, // ㄷ
  1, // ㄹ
  2, // ㄺ = ㄹ+ㄱ
  2, // ㄻ = ㄹ+ㅁ
  2, // ㄼ = ㄹ+ㅂ
  2, // ㄽ = ㄹ+ㅅ
  2, // ㄾ = ㄹ+ㅌ
  2, // ㄿ = ㄹ+ㅍ
  2, // ㅀ = ㄹ+ㅎ
  1, // ㅁ
  1, // ㅂ
  2, // ㅄ = ㅂ+ㅅ
  1, // ㅅ
  1, // ㅆ (shift 단타)
  1, // ㅇ
  1, // ㅈ
  1, // ㅊ
  1, // ㅋ
  1, // ㅌ
  1, // ㅍ
  1, // ㅎ
];

/**
 * 글자 하나의 실제 키입력 수를 반환한다.
 * - 한글 음절: 초성(1) + 중성(1~2) + 종성(0~2)
 * - 그 외: 1
 */
export function keystrokesForChar(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const offset     = code - 0xac00;
    const jongseong  = offset % 28;
    const jungseong  = Math.floor(offset / 28) % 21;
    return 1 + JUNGSEONG_KEYS[jungseong] + JONGSEONG_KEYS[jongseong];
  }
  return 1;
}

/** 문자열 전체 키입력 수 */
export function keystrokesForText(text: string): number {
  let total = 0;
  for (const char of text) total += keystrokesForChar(char);
  return total;
}
