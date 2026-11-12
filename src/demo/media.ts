/** Presentation artwork stays inside the demo module. No remote or database media. */
export function demoArtwork(label: string, background: string, foreground = "#f8faf6"): string {
  const safeLabel = label.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
    <rect width="960" height="640" fill="${background}"/>
    <circle cx="820" cy="90" r="120" fill="#ffffff" fill-opacity="0.12"/>
    <circle cx="120" cy="540" r="150" fill="#ffffff" fill-opacity="0.08"/>
    <text x="64" y="300" fill="${foreground}" font-family="Georgia, serif" font-size="54">${safeLabel}</text>
    <text x="64" y="360" fill="${foreground}" fill-opacity="0.8" font-family="sans-serif" font-size="22">Agroconnect · Demonstração</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const DEMO_MEDIA = {
  seeds: demoArtwork("Sementes", "#2f6b3a"),
  fertilizer: demoArtwork("Adubo", "#6b5a2f"),
  irrigation: demoArtwork("Rega", "#1f5f73"),
  equipment: demoArtwork("Equipamento", "#3d4a3a"),
  animalHealth: demoArtwork("Sanidade", "#6b3a3a"),
  produce: demoArtwork("Colheita", "#8a5a22"),
  courseMaize: demoArtwork("Milho", "#3f6b32"),
  courseCattle: demoArtwork("Pecuária", "#5c4632"),
  courseWater: demoArtwork("Água", "#24586a"),
  agronomy: demoArtwork("Agronomia", "#3e6b45"),
  veterinary: demoArtwork("Veterinária", "#6a4038"),
  transport: demoArtwork("Transporte", "#3a4a62"),
  machinery: demoArtwork("Máquinas", "#4a5144"),
  advisory: demoArtwork("Assessoria", "#3f5a48"),
} as const;
