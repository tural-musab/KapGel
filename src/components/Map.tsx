'use client';

import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface CourierPosition {
  lat: number;
  lng: number;
  heading?: number;
  accuracy?: number;
  timestamp?: string;
}

interface DeliveryZone {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

interface MapProps {
  /**
   * Center coordinates for initial map view
   */
  center?: [number, number];
  /**
   * Initial zoom level (0-22)
   */
  zoom?: number;
  /**
   * Delivery zone GeoJSON to display
   */
  deliveryZone?: DeliveryZone | null;
  /**
   * Current courier position with optional heading
   */
  courierPosition?: CourierPosition | null;
  /**
   * Delivery address marker
   */
  deliveryAddress?: { lat: number; lng: number; label?: string } | null;
  /**
   * Branch/pickup location marker
   */
  branchLocation?: { lat: number; lng: number; label?: string } | null;
  /**
   * Map container height (Tailwind class or CSS value)
   */
  height?: string;
  /**
   * Map container width (Tailwind class or CSS value)
   */
  width?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Callback when map is ready
   */
  onMapReady?: (map: maplibregl.Map) => void;
}

/**
 * MapLibre GL component for displaying delivery zones, courier location, and order tracking.
 *
 * Features:
 * - OSM tiles (configurable via NEXT_PUBLIC_MAP_TILES_URL)
 * - Delivery zone polygon overlay
 * - Animated courier marker with heading indicator
 * - Delivery address and branch markers
 * - Responsive sizing with ResizeObserver
 * - SSR-safe with dynamic import
 *
 * @example
 * ```tsx
 * <Map
 *   center={[49.8671, 40.4093]} // [lng, lat] Baku
 *   zoom={12}
 *   courierPosition={{ lat: 40.4093, lng: 49.8671, heading: 45 }}
 *   deliveryAddress={{ lat: 40.4100, lng: 49.8700, label: "Home" }}
 * />
 * ```
 */
export default function Map({
  center = [49.8671, 40.4093], // Default: Baku, Azerbaijan
  zoom = 13,
  deliveryZone,
  courierPosition,
  deliveryAddress,
  branchLocation,
  height = 'h-96',
  width = 'w-full',
  className = '',
  onMapReady,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const courierMarker = useRef<maplibregl.Marker | null>(null);
  const deliveryMarker = useRef<maplibregl.Marker | null>(null);
  const branchMarker = useRef<maplibregl.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const maplibregl = (await import('maplibre-gl')).default;

        const tilesUrl =
          process.env.NEXT_PUBLIC_MAP_TILES_URL ||
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: [tilesUrl],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center,
          zoom,
        });

        mapInstance.addControl(
          new maplibregl.NavigationControl(),
          'top-right'
        );
        mapInstance.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        mapInstance.on('load', () => {
          map.current = mapInstance;
          setIsLoading(false);
          onMapReady?.(mapInstance);
        });

        mapInstance.on('error', (e) => {
          console.error('Map error:', e);
          setError('Harita yüklenirken hata oluştu');
          setIsLoading(false);
        });

        // ResizeObserver for responsive sizing
        const resizeObserver = new ResizeObserver(() => {
          mapInstance.resize();
        });

        if (mapContainer.current) {
          resizeObserver.observe(mapContainer.current);
        }

        return () => {
          resizeObserver.disconnect();
          mapInstance.remove();
        };
      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError('Harita başlatılamadı');
        setIsLoading(false);
      }
    };

    initMap();
  }, [center, zoom, onMapReady]);

  // Update delivery zone
  useEffect(() => {
    if (!map.current || !deliveryZone) return;

    const mapInstance = map.current;

    // Remove existing layer and source
    if (mapInstance.getLayer('delivery-zone-fill')) {
      mapInstance.removeLayer('delivery-zone-fill');
    }
    if (mapInstance.getLayer('delivery-zone-outline')) {
      mapInstance.removeLayer('delivery-zone-outline');
    }
    if (mapInstance.getSource('delivery-zone')) {
      mapInstance.removeSource('delivery-zone');
    }

    // Add new delivery zone
    mapInstance.addSource('delivery-zone', {
      type: 'geojson',
      data: deliveryZone as GeoJSON.Feature,
    });

    mapInstance.addLayer({
      id: 'delivery-zone-fill',
      type: 'fill',
      source: 'delivery-zone',
      paint: {
        'fill-color': '#FF6B35',
        'fill-opacity': 0.2,
      },
    });

    mapInstance.addLayer({
      id: 'delivery-zone-outline',
      type: 'line',
      source: 'delivery-zone',
      paint: {
        'line-color': '#FF6B35',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });
  }, [deliveryZone]);

  // Update courier marker
  useEffect(() => {
    if (!map.current) return;

    const maplibregl = require('maplibre-gl').default;

    if (courierPosition) {
      if (!courierMarker.current) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'courier-marker';
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        `;

        if (courierPosition.heading !== undefined) {
          el.style.transform = `rotate(${courierPosition.heading}deg)`;
        }

        courierMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([courierPosition.lng, courierPosition.lat])
          .addTo(map.current);

        // Add popup with last update time
        if (courierPosition.timestamp) {
          const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="text-sm">
              <strong>Kurye</strong><br/>
              Son güncelleme: ${new Date(
                courierPosition.timestamp
              ).toLocaleTimeString('tr-TR')}
              ${
                courierPosition.accuracy
                  ? `<br/>Doğruluk: ±${Math.round(courierPosition.accuracy)}m`
                  : ''
              }
            </div>`
          );
          courierMarker.current?.setPopup(popup);
        }
      } else {
        // Update existing marker position with smooth animation
        courierMarker.current?.setLngLat([
          courierPosition.lng,
          courierPosition.lat,
        ]);

        // Update heading rotation
        if (courierPosition.heading !== undefined && courierMarker.current) {
          const el = courierMarker.current.getElement();
          el.style.transform = `rotate(${courierPosition.heading}deg)`;
        }

        // Update popup
        const popup = courierMarker.current?.getPopup();
        if (popup && courierPosition.timestamp) {
          popup.setHTML(
            `<div class="text-sm">
              <strong>Kurye</strong><br/>
              Son güncelleme: ${new Date(
                courierPosition.timestamp
              ).toLocaleTimeString('tr-TR')}
              ${
                courierPosition.accuracy
                  ? `<br/>Doğruluk: ±${Math.round(courierPosition.accuracy)}m`
                  : ''
              }
            </div>`
          );
        }
      }
    } else if (courierMarker.current) {
      courierMarker.current.remove();
      courierMarker.current = null;
    }
  }, [courierPosition]);

  // Update delivery address marker
  useEffect(() => {
    if (!map.current) return;

    const maplibregl = require('maplibre-gl').default;

    if (deliveryAddress) {
      if (!deliveryMarker.current) {
        // Create home marker
        const el = document.createElement('div');
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: #10B981;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        `;

        deliveryMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([deliveryAddress.lng, deliveryAddress.lat])
          .addTo(map.current);

        if (deliveryAddress.label) {
          const popup = new maplibregl.Popup({ offset: 25 }).setText(
            deliveryAddress.label
          );
          deliveryMarker.current?.setPopup(popup);
        }
      } else {
        deliveryMarker.current?.setLngLat([
          deliveryAddress.lng,
          deliveryAddress.lat,
        ]);
      }
    } else if (deliveryMarker.current) {
      deliveryMarker.current.remove();
      deliveryMarker.current = null;
    }
  }, [deliveryAddress]);

  // Update branch location marker
  useEffect(() => {
    if (!map.current) return;

    const maplibregl = require('maplibre-gl').default;

    if (branchLocation) {
      if (!branchMarker.current) {
        // Create store marker
        const el = document.createElement('div');
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: #EF4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
          </svg>
        `;

        branchMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([branchLocation.lng, branchLocation.lat])
          .addTo(map.current);

        if (branchLocation.label) {
          const popup = new maplibregl.Popup({ offset: 25 }).setText(
            branchLocation.label
          );
          branchMarker.current?.setPopup(popup);
        }
      } else {
        branchMarker.current?.setLngLat([
          branchLocation.lng,
          branchLocation.lat,
        ]);
      }
    } else if (branchMarker.current) {
      branchMarker.current.remove();
      branchMarker.current = null;
    }
  }, [branchLocation]);

  // Auto-fit bounds when markers change
  useEffect(() => {
    if (!map.current) return;

    const points: [number, number][] = [];

    if (courierPosition) {
      points.push([courierPosition.lng, courierPosition.lat]);
    }
    if (deliveryAddress) {
      points.push([deliveryAddress.lng, deliveryAddress.lat]);
    }
    if (branchLocation) {
      points.push([branchLocation.lng, branchLocation.lat]);
    }

    if (points.length > 1) {
      const maplibregl = require('maplibre-gl').default;
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((point) => bounds.extend(point));
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [courierPosition, deliveryAddress, branchLocation]);

  return (
    <div className={`relative ${width} ${height} ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Harita yükleniyor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center text-red-600">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-1">Lütfen sayfayı yenileyin</p>
          </div>
        </div>
      )}

      {courierPosition && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
          Kurye konumu canlı
        </div>
      )}
    </div>
  );
}
