import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../store/storage';

const resources = {
  en: {
    translation: {
      goodMorning: "Good Morning",
      timeForMedication: "It's time for your medication",
      taken: "Taken",
      skip: "Skip",
      allCaughtUp: "All Caught Up!",
      noPending: "You have no pending medications right now.",
      playAudio: "Play Audio",
      settings: "Settings",
      language: "Language",
      selectLanguage: "Select your preferred language:"
    }
  },
  he: {
    translation: {
      goodMorning: "בוקר טוב",
      timeForMedication: "הגיע הזמן לתרופה שלך",
      taken: "נלקח",
      skip: "דלג",
      allCaughtUp: "הכל הושלם!",
      noPending: "אין לך תרופות ממתינות כרגע.",
      playAudio: "הפעל שמע",
      settings: "הגדרות",
      language: "שפה",
      selectLanguage: "בחר את השפה המועדפת עליך:"
    }
  },
  ar: {
    translation: {
      goodMorning: "صباح الخير",
      timeForMedication: "حان وقت الدواء الخاص بك",
      taken: "تم الأخذ",
      skip: "تخطي",
      allCaughtUp: "تم إنجاز كل شيء!",
      noPending: "ليس لديك أدوية معلقة في الوقت الحالي.",
      playAudio: "تشغيل الصوت",
      settings: "إعدادات",
      language: "لغة",
      selectLanguage: ":اختر لغتك المفضلة"
    }
  }
};

// Pull saved language from MMKV, default to Hebrew for MVP
const savedLanguage = storage.getString('app-language') || 'he';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;