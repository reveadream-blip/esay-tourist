import React from 'react';
import { Platform } from 'react-native';

import type { TouristMapProps } from './TouristMap.types';

const TouristMapImpl: React.ComponentType<TouristMapProps> =
  Platform.OS === 'web'
    ? require('./TouristMap.web').TouristMap
    : require('./TouristMap.native').TouristMap;

export function TouristMap(props: TouristMapProps) {
  return <TouristMapImpl {...props} />;
}

export type { TouristMapProps };
