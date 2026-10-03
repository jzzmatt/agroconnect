/** Subtle dark styling for Google Maps (roadmap). */
export const GOOGLE_MAP_DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2c1f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3a0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a2e1d" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b8dfc4" }],
  },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9f7d" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#243828" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2f4534" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1f3325" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d5a44" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2a3f30" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a12" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4d7a5c" }] },
];
