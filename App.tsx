import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { View, StyleSheet } from 'react-native';

import i18n from './i18n';
import { MapScreen } from './screens/MapScreen';

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <MapScreen />
      </View>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
});
