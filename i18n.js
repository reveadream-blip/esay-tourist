import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
};

function pickLanguage() {
  const code = Localization.getLocales()[0]?.languageCode;
  if (code && Object.prototype.hasOwnProperty.call(resources, code)) {
    return code;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: pickLanguage(),
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
