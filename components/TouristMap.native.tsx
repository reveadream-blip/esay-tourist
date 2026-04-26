import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import type { TouristMapProps } from './TouristMap.types';

const DEFAULT_DELTA = 0.04;

export function TouristMap({
  userLat,
  userLng,
  pois,
  selectedPoiId,
  onSelectPoi,
}: TouristMapProps) {
  const initialRegion: Region = useMemo(
    () => ({
      latitude: userLat,
      longitude: userLng,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }),
    [userLat, userLng]
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        mapType="standard"
      >
        {pois.map((poi) => {
          const selected = poi.id === selectedPoiId;
          return (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
              title={poi.name}
              description={poi.address}
              pinColor={selected ? '#ea580c' : '#16a34a'}
              onPress={() => onSelectPoi(poi)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});
