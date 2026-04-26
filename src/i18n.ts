import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(LanguageDetector).use(initReactI18next).init({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        appTitle: 'Easy Travel',
        appSubtitle: 'Premium discovery around your exact location',
        loading: 'Finding places around you...',
        locationError: 'Location unavailable. Please enable geolocation.',
        noResults: 'No places found in this category.',
        itinerary: 'Directions',
        nearbyMap: 'Nearby map',
        yourPosition: 'Your position',
        categories: {
          hotels: 'Hotels',
          restos: 'Restaurants',
          bars: 'Bars',
          nightlife: 'Nightlife',
          spa: 'Spa',
          activities: 'Activities',
          monuments: 'Monuments',
          rentals: 'Rentals',
        },
      },
    },
    fr: {
      translation: {
        appTitle: 'Easy Travel',
        appSubtitle: 'Decouverte premium autour de votre position exacte',
        loading: 'Recherche des lieux autour de vous...',
        locationError: 'Position indisponible. Activez la geolocalisation.',
        noResults: 'Aucun lieu trouve dans cette categorie.',
        itinerary: 'Itineraire',
        nearbyMap: 'Carte autour de vous',
        yourPosition: 'Votre position',
        categories: {
          hotels: 'Hotels',
          restos: 'Restos',
          bars: 'Bars',
          nightlife: 'Nightlife',
          spa: 'Spa',
          activities: 'Activites',
          monuments: 'Monuments',
          rentals: 'Locations',
        },
      },
    },
  },
})

export default i18n
