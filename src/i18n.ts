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
        noResults: 'No places found for this search in a 50 km radius.',
        itinerary: 'Directions',
        nearbyMap: 'Nearby map',
        yourPosition: 'Your position',
        searchPlaceholder: 'Search a place, hotel, restaurant...',
        radiusLabel: 'Showing places from 0 m to 50 km around you',
        searchResultCard: 'Top search result',
        categories: {
          all: 'All',
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
        noResults: 'Aucun lieu trouve pour cette recherche dans un rayon de 50 km.',
        itinerary: 'Itineraire',
        nearbyMap: 'Carte autour de vous',
        yourPosition: 'Votre position',
        searchPlaceholder: 'Rechercher un lieu, hotel, resto...',
        radiusLabel: 'Lieux affiches de 0 m a 50 km autour de vous',
        searchResultCard: 'Resultat principal',
        categories: {
          all: 'Toutes',
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
