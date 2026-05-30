export interface PracticeSession {
  date: string;      // 'YYYY-MM-DD'
  cpm: number;
  accuracy: number;
  mode: string;
  lang: string;
}

const KEY = 'typers_practice_sessions';

function load(): PracticeSession[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function savePracticeSession(s: PracticeSession): void {
  const all = load();
  all.push(s);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}

/** 최근 n일간 일별 평균 CPM 반환 (활동 차트용) */
export function getActivityData(days = 8): { label: string; cpm: number }[] {
  const sessions = load();
  const today    = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const label   = `${d.getMonth() + 1}/${d.getDate()}`;
    const day     = sessions.filter(s => s.date === dateStr);
    const cpm     = day.length
      ? Math.round(day.reduce((sum, s) => sum + s.cpm, 0) / day.length)
      : 0;
    return { label, cpm };
  });
}
