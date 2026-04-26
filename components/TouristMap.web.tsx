import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TouristMapProps } from './TouristMap.types';

export function TouristMap({ pois, selectedPoiId, onSelectPoi }: TouristMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Web mode</Text>
        <Text style={styles.bannerText}>
          react-native-maps n&apos;est pas rendu sur web dans cette configuration.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {pois.map((poi) => {
          const selected = poi.id === selectedPoiId;
          return (
            <Pressable
              key={poi.id}
              onPress={() => onSelectPoi(poi)}
              style={[styles.item, selected && styles.itemSelected]}
            >
              <Text style={styles.itemTitle}>{poi.name}</Text>
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
    borderRadius: 10,
    backgroundColor: '#1e293b',
    padding: 10,
  },
  bannerTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 4 },
  bannerText: { color: '#94a3b8', fontSize: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  item: {
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
  },
  itemSelected: { borderColor: '#22c55e', backgroundColor: '#052e16' },
  itemTitle: { color: '#f8fafc', fontWeight: '600' },
  itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
