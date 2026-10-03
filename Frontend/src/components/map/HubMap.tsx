import React, { useEffect, useRef } from 'react';
import { Hub, Transfer } from '../../types';
import L from 'leaflet';

interface HubMapProps {
  hubs: Hub[];
  transfers?: Transfer[];
  selectedHubId?: string;
  onSelectHub?: (hubId: string) => void;
  className?: string;
}

export const HubMap: React.FC<HubMapProps> = ({
  hubs,
  transfers = [],
  selectedHubId,
  onSelectHub,
  className = 'h-96 w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on Puget Sound / WA region where seed hubs are located
    const defaultLat = 47.55;
    const defaultLng = -122.25;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old layers except tilelayer
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Draw active in-transit routes between hubs
    transfers
      .filter(t => t.status === 'in_transit' || t.status === 'approved')
      .forEach(t => {
        const source = hubs.find(h => h.id === t.sourceHubId);
        const dest = hubs.find(h => h.id === t.destHubId);
        if (source && dest) {
          const latlngs: [number, number][] = [
            [source.lat, source.lng],
            [dest.lat, dest.lng],
          ];

          const line = L.polyline(latlngs, {
            color: t.status === 'in_transit' ? '#2563eb' : '#059669',
            weight: 3,
            dashArray: t.status === 'in_transit' ? '6, 8' : undefined,
            opacity: 0.8,
          }).addTo(map);

          line.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong>${t.transferCode}</strong> (${t.status.toUpperCase()})<br/>
              <span>${source.name} &rarr; ${dest.name}</span><br/>
              <span>${t.quantity}x ${t.productName}</span><br/>
              <span style="color: #059669;">Emissions: ${t.emissionsKg} kg CO2e</span>
            </div>
          `);
        }
      });

    // Add Hub markers
    hubs.forEach(hub => {
      const isSelected = hub.id === selectedHubId;
      const occupancyPct = Math.round((hub.currentOccupancy / hub.capacity) * 100);
      const isNearCapacity = occupancyPct > 85;

      const markerColor = isNearCapacity
        ? '#d97706' // amber
        : hub.operatingStatus === 'active'
        ? '#059669' // emerald
        : '#dc2626'; // red

      const customIcon = L.divIcon({
        className: 'custom-hub-pin',
        html: `
          <div style="
            background: white;
            border: 2px solid ${isSelected ? '#1e293b' : markerColor};
            border-radius: 9999px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: sans-serif;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            color: #0f172a;
            transform: translate(-50%, -50%);
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: ${markerColor};
              display: inline-block;
            "></span>
            <span>${hub.name.split(' ')[0]}</span>
            <span style="
              font-size: 9px;
              color: ${isNearCapacity ? '#b45309' : '#64748b'};
              background: #f1f5f9;
              padding: 1px 4px;
              border-radius: 4px;
            ">${occupancyPct}%</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([hub.lat, hub.lng], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${hub.name}</h4>
          <p style="margin: 0; color: #64748b;">${hub.address}, ${hub.city}</p>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px;">
            <div><strong>Type:</strong> ${hub.type.toUpperCase()}</div>
            <div><strong>Capacity:</strong> ${hub.currentOccupancy} / ${hub.capacity} (${occupancyPct}%)</div>
            <div><strong>Status:</strong> <span style="color: ${markerColor}; font-weight: 600;">${hub.operatingStatus.toUpperCase()}</span></div>
            <div><strong>Contact:</strong> ${hub.contactPerson}</div>
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectHub) {
          onSelectHub(hub.id);
        }
      });
    });
  }, [hubs, transfers, selectedHubId, onSelectHub]);

  return (
    <div className="relative isolate z-0">
      <div ref={mapContainerRef} className={className} />
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] shadow-sm z-[1000] flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Active Hub
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> &gt;85% Load
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-blue-600 border-dashed inline-block" /> In-Transit Route
        </span>
      </div>
    </div>
  );
};
