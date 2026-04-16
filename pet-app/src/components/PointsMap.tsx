import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCityCoordinates } from '../data/pointCityCoordinates';
import { petTheme } from '../theme/palette';
import type { PointRecord } from '../types/petLogistics';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const iconProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
delete iconProto._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const DEFAULT_CENTER: [number, number] = [50.5, 10.5];
const DEFAULT_ZOOM = 4;
const SINGLE_ZOOM = 6;

function FitBounds ({ positions }: { positions: [number, number][] }): null {
    const map = useMap();
    useEffect(() => {
        if (positions.length === 0) {
            map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

            return;
        }
        if (positions.length === 1) {
            map.setView(positions[0], SINGLE_ZOOM);

            return;
        }
        const b = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
        map.fitBounds(b, { padding: [28, 28], maxZoom: 8 });
    }, [map, positions]);

    return null;
}

type MarkerItem = { key: string; lat: number; lng: number; point: PointRecord };

function buildMarkers (points: PointRecord[]): MarkerItem[] {
    const perCity = new Map<string, number>();
    const out: MarkerItem[] = [];
    for (const p of points) {
        const base = getCityCoordinates(p.city);
        if (!base) {
            continue;
        }
        const n = perCity.get(p.city) ?? 0;
        perCity.set(p.city, n + 1);
        const angle = n * 1.7;
        const d = 0.035 * Math.sqrt(n + 1);
        out.push({
            key: p.id,
            lat: base[0] + Math.cos(angle) * d,
            lng: base[1] + Math.sin(angle) * d,
            point: p,
        });
    }

    return out;
}

const KIND_LABEL: Record<PointRecord['kind'], string> = {
    hub: 'Hub',
    stop: 'Stop',
    airport: 'Airport',
};

/** Leaflet map: one marker per point, positioned by catalog city coordinates. */
export function PointsMap ({ points }: { points: PointRecord[] }): JSX.Element {
    const markers = useMemo(() => buildMarkers(points), [points]);
    const positions = useMemo(
        () => markers.map((m) => [m.lat, m.lng] as [number, number]),
        [markers]
    );

    return (
        <div
            data-testid="points-map"
            style={{
                height: 320,
                width: '100%',
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid ${petTheme.mutedBorder}`,
            }}
        >
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds positions={positions} />
                {markers.map((m) => (
                    <Marker key={m.key} position={[m.lat, m.lng]}>
                        <Popup>
                            <strong>{m.point.name}</strong>
                            <br />
                            {m.point.code} · {m.point.city}
                            <br />
                            {KIND_LABEL[m.point.kind]}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
