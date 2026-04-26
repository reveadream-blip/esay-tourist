import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TouristMapProps } from './TouristMap.types';

function formatDistanceMeters(meters?: number): string | null {
  if (meters == null) {
    return null;
  }
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function TouristMap({ pois, selectedPoiId, onSelectPoi }: TouristMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Explore nearby places</Text>
        <Text style={styles.bannerText}>
          Web list mode - select a place to open directions.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {pois.map((poi) => {
          const selected = poi.id === selectedPoiId;
          const distanceLabel = formatDistanceMeters(poi.distanceMeters);
          return (
            <Pressable
              key={poi.id}
              onPress={() => onSelectPoi(poi)}
              style={[styles.item, selected && styles.itemSelected]}
            >
              <View style={styles.itemTopRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {poi.name}
                </Text>
                {distanceLabel ? <Text style={styles.itemDistance}>{distanceLabel}</Text> : null}
              </View>
              {poi.address ? <Text style={styles.itemSub}>{poi.address}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  banner: {
    margin: 12,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    padding: 12,
  },
  bannerTitle: { color: '#f8fafc', fontWeight: '800', marginBottom: 4 },
  bannerText: { color: '#94a3b8', fontSize: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  item: {
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  itemSelected: { borderColor: '#06b6d4', backgroundColor: '#083344' },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: { color: '#f8fafc', fontWeight: '700' },
  itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  itemDistance: { color: '#67e8f9', fontSize: 12, fontWeight: '700' },
});
