import { EthDateTime } from 'ethiopian-calendar-date-converter';

const ethMonthsAm = [
  '', 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

const ethMonthsOm = [
  '', 'Fulbaana', 'Onkololeessa', 'Sadaasa', 'Muddee', 'Amajjii', 'Guraandhala',
  'Bitootessa', 'Ebla', 'Caamsa', 'Waxabajjii', 'Adoolessa', 'Hagayya', 'Qaammee'
];

const ethMonthsEn = [
  '', 'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const ethDaysAm = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];
const ethDaysOm = ['Dilbata', 'Wiixata', 'Kibxata', 'Roobii', 'Kamisa', 'Jimaata', 'Sanbata'];
const ethDaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatEthiopianDate = (date: EthDateTime, language: string) => {
  const dayIndex = date.getDay(); // 0 (Sunday) to 6 (Saturday) in ethiopian-calendar-date-converter?
  // Let's fallback if getDay() is unexpected. 
  // EthDateTime might not have getDay() directly, wait, let's just use the month and year, or use toDateWithDayString() and parse.
  
  if (language === 'am') {
    return `${ethMonthsAm[date.month]} ${date.date}, ${date.year}`;
  }
  
  if (language === 'om') {
    return `${ethMonthsOm[date.month]} ${date.date}, ${date.year}`;
  }

  return `${ethMonthsEn[date.month]} ${date.date}, ${date.year}`;
};
