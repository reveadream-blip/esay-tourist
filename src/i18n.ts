import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(LanguageDetector).use(initReactI18next).init({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  load: 'languageOnly',
  nonExplicitSupportedLngs: true,
  detection: {
    order: ['navigator', 'htmlTag', 'querystring'],
    caches: [],
    convertDetectedLanguage: (lng) => lng.split('-')[0].toLowerCase(),
  },
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
        onlyPlacesWithPhotos: 'Only places with a photo',
        photoFilterLoading:
          'Loading or resolving photos… Places without an image yet are hidden. Uncheck the filter to see all.',
        photoFilterExcluded:
          'No places with a photo match this search. Try another query or turn off “only places with a photo”.',
        searchResultCard: 'Top search result',
        estimatedRating: 'Indicative',
        estimatedRatingHint: 'This score is an estimate when OpenStreetMap has no official rating.',
        aria: {
          categoryNav: 'Filter by category',
          searchLabel: 'Search for a place by name',
          mapSection: 'Map of nearby places',
          resultsList: 'List of places',
        },
        categories: {
          all: 'All',
          hotels: 'Hotels',
          restos: 'Restaurants',
          bars: 'Bars',
          markets: 'Markets',
          agencies: 'Agencies',
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
        appSubtitle: 'Découverte premium autour de votre position exacte',
        loading: 'Recherche des lieux autour de vous...',
        locationError: 'Position indisponible. Activez la géolocalisation.',
        noResults: 'Aucun lieu trouvé pour cette recherche dans un rayon de 50 km.',
        itinerary: 'Itinéraire',
        nearbyMap: 'Carte autour de vous',
        yourPosition: 'Votre position',
        searchPlaceholder: 'Rechercher un lieu, hôtel, restaurant...',
        radiusLabel: 'Lieux affichés de 0 m à 50 km autour de vous',
        onlyPlacesWithPhotos: 'Lieux avec photo uniquement',
        photoFilterLoading:
          'Chargement des photos… Les lieux sans image encore trouvée sont masqués. Décochez pour tout afficher.',
        photoFilterExcluded:
          'Aucun lieu avec photo ne correspond à cette recherche. Essayez une autre requête ou désactivez le filtre.',
        searchResultCard: 'Résultat principal',
        estimatedRating: 'Indicatif',
        estimatedRatingHint:
          'Note indicative lorsque la base OpenStreetMap ne fournit pas de notation officielle.',
        aria: {
          categoryNav: 'Filtrer par catégorie',
          searchLabel: 'Rechercher un lieu par nom',
          mapSection: 'Carte des lieux à proximité',
          resultsList: 'Liste des lieux',
        },
        categories: {
          all: 'Toutes',
          hotels: 'Hôtels',
          restos: 'Restos',
          bars: 'Bars',
          markets: 'Marchés',
          agencies: 'Agences',
          nightlife: 'Nightlife',
          spa: 'Spa',
          activities: 'Activités',
          monuments: 'Monuments',
          rentals: 'Locations',
        },
      },
    },
  },
})

export default i18n
