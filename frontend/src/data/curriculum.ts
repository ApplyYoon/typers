import type { TypingMode } from './texts';

export interface CurriculumStageMeta {
  id: number;
  mode: TypingMode;
  title: string;
  description: string;
}

// 독수리 타법 탈출 로드맵: 왼손 → 오른손 → 양손(자음/모음/단어/문장)
export const CURRICULUM_META: CurriculumStageMeta[] = [
  { id: 1, mode: 'left',      title: '왼손',     description: '왼손이 담당하는 자음 키에 익숙해져요' },
  { id: 2, mode: 'right',     title: '오른손',   description: '오른손이 담당하는 모음 키에 익숙해져요' },
  { id: 3, mode: 'consonant', title: '자음',     description: '받침까지 포함한 모든 자음을 연습해요' },
  { id: 4, mode: 'vowel',     title: '모음',     description: '겹모음을 포함한 모든 모음을 연습해요' },
  { id: 5, mode: 'word',      title: '단어',     description: '자주 쓰이는 단어를 빠르게 입력해요' },
  { id: 6, mode: 'short',     title: '짧은 문장', description: '짧은 문장으로 속도와 정확도를 키워요' },
  { id: 7, mode: 'long',      title: '긴 글',    description: '긴 문단을 타이핑하며 지속력을 키워요' },
];
