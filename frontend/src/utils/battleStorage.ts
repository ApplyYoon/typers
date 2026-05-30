export interface BattleRecord {
  schoolId: string;
  schoolName: string;
  username: string;
  score: number; // CPM
  accuracy: number;
  timestamp: number;
}

export interface SchoolStat {
  schoolId: string;
  schoolName: string;
  topUsername: string; // 최고 점수 기록자 닉네임
  avgScore: number;
  topScore: number;
  count: number;
}

const KEY = 'typers_battle_records_v2';

export function saveRecord(record: BattleRecord): void {
  const records = getRecords();
  records.push(record);
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function getRecords(): BattleRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getSchoolStats(): SchoolStat[] {
  const records = getRecords();
  const map = new Map<string, { records: BattleRecord[] }>();

  for (const r of records) {
    if (!map.has(r.schoolId)) map.set(r.schoolId, { records: [] });
    map.get(r.schoolId)!.records.push(r);
  }

  return Array.from(map.entries())
    .map(([schoolId, { records: recs }]) => {
      const best = recs.reduce((a, b) => (a.score >= b.score ? a : b));
      const avgScore = Math.round(recs.reduce((a, b) => a + b.score, 0) / recs.length);
      return {
        schoolId,
        schoolName:  best.schoolName,
        topUsername: best.username,
        avgScore,
        topScore:    best.score,
        count:       recs.length,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

export function clearRecords(): void {
  localStorage.removeItem(KEY);
}
