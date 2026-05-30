export interface School {
  id: string;
  name: string;
  shortName: string;
  color: string;
  emoji: string;
}

export const SCHOOLS: School[] = [
  { id: 'snu', name: '서울대학교', shortName: '서울대', color: '#003876', emoji: '🔵' },
  { id: 'yonsei', name: '연세대학교', shortName: '연세대', color: '#00205B', emoji: '🔷' },
  { id: 'korea', name: '고려대학교', shortName: '고려대', color: '#8B0029', emoji: '🔴' },
  { id: 'sogang', name: '서강대학교', shortName: '서강대', color: '#003DA5', emoji: '🟦' },
  { id: 'sungkyunkwan', name: '성균관대학교', shortName: '성균관대', color: '#003087', emoji: '💙' },
  { id: 'hanyang', name: '한양대학교', shortName: '한양대', color: '#C8102E', emoji: '❤️' },
  { id: 'ewha', name: '이화여자대학교', shortName: '이화여대', color: '#005F6A', emoji: '🌸' },
  { id: 'cau', name: '중앙대학교', shortName: '중앙대', color: '#002D62', emoji: '🌟' },
  { id: 'konkuk', name: '건국대학교', shortName: '건국대', color: '#006DB7', emoji: '🐄' },
  { id: 'dongguk', name: '동국대학교', shortName: '동국대', color: '#8B0000', emoji: '🏯' },
  { id: 'hongik', name: '홍익대학교', shortName: '홍익대', color: '#00539B', emoji: '🎨' },
  { id: 'sejong', name: '세종대학교', shortName: '세종대', color: '#003087', emoji: '👑' },
];
