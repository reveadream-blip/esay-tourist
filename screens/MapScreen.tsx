import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
const SEARCH_RADIUS_METERS = 50000;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadius = 6371000;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function MapScreen() {
  const { t, i18n } = useTranslation();
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
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const loadPois = useCallback(
    async (
      lat: number,
      lng: number,
      cat: string,
      query: string,
      preferredLanguage: string
    ) => {
      setApiMessage(null);
      setLoadingPois(true);
      try {
        const { pois, source } = await fetchNearbyPois(
          lat,
          lng,
          cat,
          query,
          preferredLanguage,
          SEARCH_RADIUS_METERS
        );
        const poisWithDistance = pois
          .map((poi) => ({
            ...poi,
            distanceMeters: getDistanceMeters(lat, lng, poi.latitude, poi.longitude),
          }))
          .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
        setDataSource(source);
        setRawPois(poisWithDistance);
        if (poisWithDistance.length === 0) {
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

  const requestUserLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLoadingLocation(true);
    setLocationError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      setLoadingLocation(false);
      return null;
    }
    setPermissionDenied(false);
    try {
      let pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });
      // If browser/device gives a very rough position, retry with best GPS accuracy.
      if (pos.coords.accuracy != null && pos.coords.accuracy > 3000) {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          mayShowUserSettingsDialog: true,
        });
      }
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      setLocationAccuracy(pos.coords.accuracy ?? null);
      return coords;
    } catch {
      setLocationError('locationError');
      return null;
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  useEffect(() => {
    if (!userCoords) {
      return;
    }
    const timer = setTimeout(() => {
      loadPois(userCoords.lat, userCoords.lng, category, search, i18n.resolvedLanguage || i18n.language);
    }, 350);
    return () => clearTimeout(timer);
  }, [userCoords, category, search, i18n.language, i18n.resolvedLanguage, loadPois]);

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
        <Pressable onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>{t('openSettings')}</Text>
        </Pressable>
      </View>
    );
  }

  if (locationError || !userCoords) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{t('locationError')}</Text>
        <Pressable onPress={requestUserLocation} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>{t('retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.chrome}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.subtitle}>{t('heroSubtitle')}</Text>
          {locationAccuracy != null && locationAccuracy > 3000 ? (
            <Text style={styles.accuracyWarning}>{t('locationApproximate')}</Text>
          ) : null}
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
            <Pressable
              style={styles.sourceBadge}
              onPress={() => {
                if (dataSource !== 'osm') {
                  return;
                }
                const url = `https://www.openstreetmap.org/?mlat=${userCoords.lat}&mlon=${userCoords.lng}#map=12/${userCoords.lat}/${userCoords.lng}`;
                Linking.openURL(url);
              }}
            >
              <Text style={styles.sourceBadgeText}>
                {dataSource === 'google'
                  ? 'Google'
                  : dataSource === 'osm'
                    ? 'OpenStreetMap'
                    : t('offlineFallback')}
              </Text>
            </Pressable>
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
            {selectedPoi.distanceMeters != null ? (
              <Text style={styles.selectionDistance}>
                {t('distanceAway', { distance: formatDistanceMeters(selectedPoi.distanceMeters) })}
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
            onPress={async () => {
              const fresh = await requestUserLocation();
              const coords = fresh ?? userCoords;
              if (!coords) {
                return;
              }
              await loadPois(
                coords.lat,
                coords.lng,
                category,
                search,
                i18n.resolvedLanguage || i18n.language
              );
            }}
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
  accuracyWarning: {
    marginTop: 6,
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
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
  selectionDistance: { color: '#67e8f9', fontSize: 12, marginTop: 6, fontWeight: '600' },
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
  permissionBtn: {
    marginTop: 14,
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionBtnText: { color: '#0c4a6e', fontWeight: '800' },
  settingsBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  settingsBtnText: { color: '#0ea5e9', fontWeight: '700' },
});
