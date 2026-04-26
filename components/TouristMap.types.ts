import type { Poi } from '../services/placesApi';

export type TouristMapProps = {
  userLat: number;
  userLng: number;
  pois: Poi[];
  selectedPoiId: string | null;
  onSelectPoi: (poi: Poi) => void;
};
