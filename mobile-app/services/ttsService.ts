import * as Speech from 'expo-speech';

export type SupportedLanguage = 'he' | 'ar' | 'en';

// Map our internal language codes to native OS locale tags
const localeMap: Record<SupportedLanguage, string> = {
  he: 'he-IL',
  ar: 'ar-SA', // or ar-AE depending on preference
  en: 'en-US',
};

export const ttsService = {
  speak: (text: string, language: SupportedLanguage = 'he') => {
    // Stop any currently playing speech to prevent overlapping audio
    Speech.stop();
    
    Speech.speak(text, {
      language: localeMap[language],
      pitch: 1.0,
      rate: 0.85, // Slower rate for better comprehension by elderly users
    });
  },

  playMedicationReminder: (medName: string, dosage: string, language: SupportedLanguage = 'he') => {
    let text = '';
    
    // Generate localized strings
    switch (language) {
      case 'he':
        text = `הגיע הזמן לקחת ${medName}, במינון של ${dosage}.`;
        break;
      case 'ar':
        text = `حان الوقت لتناول ${medName}، بجرعة ${dosage}.`;
        break;
      case 'en':
      default:
        text = `It is time to take your ${medName}, dosage ${dosage}.`;
        break;
    }
    
    ttsService.speak(text, language);
  },
  
  stop: () => {
    Speech.stop();
  }
};