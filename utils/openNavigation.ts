import { Linking, Platform } from 'react-native';

/**
 * Opens the default maps app with turn-by-turn directions to the given coordinates.
 */
export async function openNavigation(latitude: number, longitude: number): Promise<boolean> {
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const apple = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
  const androidNav = `google.navigation:q=${latitude},${longitude}`;

  const primary =
    Platform.OS === 'ios'
      ? apple
      : Platform.OS === 'android'
        ? androidNav
        : gmaps;

  try {
    if (await Linking.canOpenURL(primary)) {
      await Linking.openURL(primary);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    if (await Linking.canOpenURL(gmaps)) {
      await Linking.openURL(gmaps);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}
