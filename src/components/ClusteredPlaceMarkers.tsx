import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

export type ClusterPlace = {
  id: string
  lat: number
  lng: number
  name: string
}

type Props = {
  places: ClusterPlace[]
}

export function ClusteredPlaceMarkers({ places }: Props) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    const group = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 56 })
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    group.clearLayers()
    for (const place of places) {
      const marker = L.marker([place.lat, place.lng])
      marker.bindPopup(place.name)
      group.addLayer(marker)
    }
  }, [places])

  return null
}
