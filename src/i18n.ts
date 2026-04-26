import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: 'en',
  supportedLngs: ['en', 'fr'],
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: {
        appTitle: 'Easy Travel',
        appSubtitle: 'Discover premium spots around you instantly',
        locationStatus: 'Finding your location...',
        locationError:
          'Unable to access your location. Enable geolocation to discover places near you.',
        noPlaces: 'No places found in this category yet.',
        itinerary: 'Directions',
        aroundYou: 'Around you',
        yourLocation: 'Your location',
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
        appSubtitle: 'Decouvrez instantanement les meilleurs lieux autour de vous',
        locationStatus: 'Recherche de votre position...',
        locationError:
          "Impossible d'acceder a votre position. Activez la geolocalisation pour voir les lieux proches.",
        noPlaces: 'Aucun lieu trouve dans cette categorie pour le moment.',
        itinerary: 'Itineraire',
        aroundYou: 'Autour de vous',
        yourLocation: 'Votre position',
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
