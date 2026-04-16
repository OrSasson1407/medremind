import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../store/storage';

const resources = {
  en: {
    translation: {
      goodMorning: "Good Morning",
      goodAfternoon: "Good Afternoon",
      goodEvening: "Good Evening",
      timeForMedication: "It's time for your medication",
      taken: "Taken",
      skip: "Skip",
      undo: "Undo",
      allCaughtUp: "All Caught Up!",
      noPending: "You have no pending medications right now.",
      playAudio: "Play Audio",
      settings: "Settings",
      language: "Language",
      selectLanguage: "Select your preferred language:",
      logout: "Logout",
      logoutConfirm: "Are you sure you want to log out?",
      cancel: "Cancel",
      refresh: "Refresh",
      skipReasonTitle: "Why are you skipping?",
      feelingSick: "Feeling sick",
      alreadyTookIt: "Already took it",
      sideEffects: "Side effects",
      otherReason: "Other",
      offlineBanner: "No internet — changes saved locally",
      unlockApp: "Unlock MedRemind",
      enterPinToUnlock: "Enter your PIN to unlock",
      unlock: "Unlock",
      incorrectPin: "Incorrect PIN",
      useBiometrics: "Use Face ID / Fingerprint",
      emergencyContact: "Emergency Contact",
      callCaregiver: "Call your primary caregiver?",
      call: "Call Now",
      accessibilityMode: "Accessibility Mode",
      accessibilityDesc: "Increases text size and contrast",
      perfectStreak: "🔥 {{count}}-Day Perfect Streak!"
    }
  },
  he: {
    translation: {
      goodMorning: "בוקר טוב",
      goodAfternoon: "צהריים טובים",
      goodEvening: "ערב טוב",
      timeForMedication: "הגיע הזמן לתרופה שלך",
      taken: "נלקח",
      skip: "דלג",
      undo: "בטל",
      allCaughtUp: "הכל הושלם!",
      noPending: "אין לך תרופות ממתינות כרגע.",
      playAudio: "הפעל שמע",
      settings: "הגדרות",
      language: "שפה",
      selectLanguage: "בחר את השפה המועדפת עליך:",
      logout: "התנתקות",
      logoutConfirm: "האם אתה בטוח שברצונך להתנתק?",
      cancel: "ביטול",
      refresh: "רענן",
      skipReasonTitle: "מדוע אתה מדלג?",
      feelingSick: "מרגיש חולה",
      alreadyTookIt: "כבר לקחתי",
      sideEffects: "תופעות לוואי",
      otherReason: "אחר",
      offlineBanner: "אין אינטרנט - השינויים נשמרו מקומית",
      unlockApp: "שחרר את MedRemind",
      enterPinToUnlock: "הזן את קוד ה-PIN שלך לשחרור",
      unlock: "שחרר",
      incorrectPin: "קוד PIN שגוי",
      useBiometrics: "השתמש בזיהוי פנים / טביעת אצבע",
      emergencyContact: "איש קשר חירום",
      callCaregiver: "להתקשר למטפל הראשי שלך?",
      call: "התקשר עכשיו",
      accessibilityMode: "מצב נגישות",
      accessibilityDesc: "מגדיל את גודל הטקסט והניגודיות",
      perfectStreak: "🔥 רצף מושלם של {{count}} ימים!"
    }
  },
  ar: {
    translation: {
      goodMorning: "صباح الخير",
      goodAfternoon: "طاب مساؤك",
      goodEvening: "مساء الخير",
      timeForMedication: "حان وقت الدواء الخاص بك",
      taken: "تم الأخذ",
      skip: "تخطي",
      undo: "تراجع",
      allCaughtUp: "تم إنجاز كل شيء!",
      noPending: "ليس لديك أدوية معلقة في الوقت الحالي.",
      playAudio: "تشغيل الصوت",
      settings: "إعدادات",
      language: "لغة",
      selectLanguage: ":اختر لغتك المفضلة",
      logout: "تسجيل الخروج",
      logoutConfirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      cancel: "إلغاء",
      refresh: "تحديث",
      skipReasonTitle: "لماذا تتخطى؟",
      feelingSick: "أشعر بالمرض",
      alreadyTookIt: "أخذته بالفعل",
      sideEffects: "آثار جانبية",
      otherReason: "أخرى",
      offlineBanner: "لا يوجد إنترنت - تم حفظ التغييرات محليًا",
      unlockApp: "افتح MedRemind",
      enterPinToUnlock: "أدخل رقم التعريف الشخصي لفتح",
      unlock: "فتح",
      incorrectPin: "رقم التعريف الشخصي غير صحيح",
      useBiometrics: "استخدام بصمة الوجه / الإصبع",
      emergencyContact: "جهة اتصال للطوارئ",
      callCaregiver: "اتصل بمقدم الرعاية الأساسي الخاص بك؟",
      call: "اتصل الان",
      accessibilityMode: "وضع سهولة الاستخدام",
      accessibilityDesc: "يزيد من حجم النص والتباين",
      perfectStreak: "🔥 سلسلة مثالية لـ {{count}} أيام!"
    }
  }
};

const savedLanguage = storage.getString('app-language') || 'he';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;