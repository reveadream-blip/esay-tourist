import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

import { TouristMap } from '../components/TouristMap';
import {
  categoryToPlaceType,
  fetchNearbyPois,
  type Poi,
  type PoiDataSource,
} from '../services/placesApi';
import { openNavigation } from '../utils/openNavigation';

const CATEGORY_KEYS = Object.keys(categoryToPlaceType) as (keyof typeof categoryToPlaceType)[];

export function MapScreen() {
  const { t } = useTranslation();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [rawPois, setRawPois] = useState<Poi[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPois, setLoadingPois] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<PoiDataSource | null>(null);

  const loadPois = useCallback(
    async (lat: number, lng: number, cat: string, query: string) => {
      setApiMessage(null);
      setLoadingPois(true);
      try {
        const { pois, source } = await fetchNearbyPois(lat, lng, cat, query);
        setDataSource(source);
        setRawPois(pois);
        if (pois.length === 0) {
          setApiMessage('noResults');
        } else if (source === 'osm') {
          setApiMessage('dataSourceOsm');
        } else if (source === 'fallback') {
          setApiMessage('fallbackData');
        }
      } catch {
        setRawPois([]);
        setApiMessage('apiError');
      } finally {
        setLoadingPois(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingLocation(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setPermissionDenied(true);
          setLoadingLocation(false);
        }
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setLocationError('locationError');
        }
      } finally {
        if (!cancelled) {
          setLoadingLocation(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userCoords) {
      return;
    }
    const timer = setTimeout(() => {
      loadPois(userCoords.lat, userCoords.lng, category, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [userCoords, category, search, loadPois]);

  const onDirections = async () => {
    if (!selectedPoi) {
      return;
    }
    const ok = await openNavigation(selectedPoi.latitude, selectedPoi.longitude);
    if (!ok) {
      setApiMessage('openMapsError');
    }
  };

  if (loadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>{t('loadingMap')}</Text>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{t('locationDenied')}</Text>
      </View>
    );
  }

  if (locationError || !userCoords) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{t('locationError')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.chrome}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.subtitle}>{t('heroSubtitle')}</Text>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor="#94a3b8"
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATEGORY_KEYS.map((key) => {
            const active = category === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setCategory(key);
                  setSelectedPoi(null);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`categories.${key}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {apiMessage && <Text style={styles.apiBanner}>{t(apiMessage)}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.countText}>
            {t('resultsCount', { count: rawPois.length })}
          </Text>
          {dataSource ? (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {dataSource === 'google'
                  ? 'Google'
                  : dataSource === 'osm'
                    ? 'OpenStreetMap'
                    : t('offlineFallback')}
              </Text>
            </View>
          ) : null}
        </View>
        {selectedPoi && (
          <View style={styles.selection}>
            <Text style={styles.selectionTitle} numberOfLines={2}>
              {selectedPoi.name}
            </Text>
            {selectedPoi.address ? (
              <Text style={styles.selectionSub} numberOfLines={2}>
                {selectedPoi.address}
              </Text>
            ) : null}
            <Pressable onPress={onDirections} style={styles.routeBtn}>
              <Text style={styles.routeBtnText}>{t('route')}</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.toolbar}>
          {loadingPois ? <ActivityIndicator /> : null}
          <Pressable
            onPress={() => userCoords && loadPois(userCoords.lat, userCoords.lng, category, search)}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshText}>{t('refresh')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <TouristMap
          userLat={userCoords.lat}
          userLng={userCoords.lng}
          pois={rawPois}
          selectedPoiId={selectedPoi?.id ?? null}
          onSelectPoi={setSelectedPoi}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  mapWrap: { flex: 1 },
  chrome: {
    paddingTop: 52,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#020617',
  },
  hero: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#93c5fd',
    fontSize: 13,
  },
  search: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  chips: { gap: 8, paddingVertical: 4, paddingBottom: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 4,
  },
  chipActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  chipText: { color: '#e2e8f0', fontSize: 13 },
  chipTextActive: { color: '#0f172a', fontWeight: '600' },
  metaRow: {
    marginTop: 2,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: { color: '#bae6fd', fontSize: 12 },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#082f49',
    borderColor: '#0ea5e9',
    borderWidth: 1,
  },
  sourceBadgeText: { color: '#e0f2fe', fontSize: 11, fontWeight: '700' },
  selection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  selectionTitle: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  selectionSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  routeBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#34d399',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  routeBtnText: { color: '#064e3b', fontWeight: '800' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  refreshBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  refreshText: { color: '#38bdf8', fontWeight: '700' },
  apiBanner: { color: '#fbbf24', fontSize: 12, marginTop: 4, marginBottom: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { textAlign: 'center', color: '#0f172a', fontSize: 16 },
  muted: { marginTop: 8, color: '#64748b' },
});
