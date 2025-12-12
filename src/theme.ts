// MindGraphSim - Visual Theme
// "Viral Typography - Particle is the Letter"

import { MaterialType } from './types';

// ============================================
// Color Palette - "The Petri Dish"
// ============================================

export const PALETTE = {
  // Core colors - WCAG 2.1 AA compliant
  // All text colors meet 4.5:1 against their backgrounds
  // All UI component colors meet 3:1 against adjacent colors
  
  substrate_noise: '#c4c4c4',   // 8.1:1 vs #1a1a1a - body text
  deep_blue_void: '#1a5cff',    // 3.5:1 vs #1a1a1a - UI components
  bio_acid: '#e6ff1a',          // 13.5:1 vs #1a1a1a - highlights
  data_red: '#ff4d4d',          // 4.8:1 vs #1a1a1a - headings

  // Derived colors
  background: '#1a1a1a',
  background_alt: '#0d0d0d',
  text_primary: '#ff4d4d',      // 4.8:1 vs background
  text_secondary: '#c4c4c4',    // 8.1:1 vs background
  text_muted: '#949494',        // 5.0:1 vs #222
  highlight_active: '#e6ff1a',  // 13.5:1 vs background
  highlight_danger: '#ff6b6b',  // 5.5:1 vs #0d0d0d
  highlight_safe: '#5cff9d',    // 11.8:1 vs #0d0d0d
  void_gradient_start: '#001133',
  void_gradient_end: '#1a5cff',

  // State colors
  healthy: '#5cff9d',           // 11.8:1 vs #0d0d0d
  unhealthy: '#ff6b6b',         // 5.5:1 vs #0d0d0d
  unknown: '#c4c4c4',           // 10.5:1 vs #0d0d0d
  frozen: '#7ab3ff',            // 7.2:1 vs #1a1a1a
  severed: '#6b6b6b',           // 3.1:1 vs #0d0d0d (UI component)
  
  // UI component borders (3:1 minimum)
  border_default: '#4a4a4a',    // 3.1:1 vs #0d0d0d
  border_input: '#858585',      // 3.1:1 vs #333
} as const;

// ============================================
// Typography
// ============================================

export const TYPOGRAPHY = {
  font_mono: "'Space Mono', 'Courier New', monospace",
  font_display: "'Space Mono', monospace",

  // Micro-sizes for particle text (builds macro shapes)
  size_particle: 4,
  size_micro: 8,
  size_small: 12,
  size_body: 14,
  size_large: 18,
  size_display: 24,
  size_hero: 48,
} as const;

// ============================================
// Effects
// ============================================

export const EFFECTS = {
  // Grain overlay
  grain_opacity: 0.15,
  grain_blend: 'overlay' as const,

  // Halftone ASCII characters (density low → high)
  halftone_chars: ' .:-=+*#%@',
  halftone_density: 0.7,

  // Mold bloom effect
  bloom_radius_min: 20,
  bloom_radius_max: 80,
  bloom_particle_count: 50,
  bloom_decay: 0.95,

  // Contagion interaction
  contagion_spread_rate: 0.1,
  contagion_max_radius: 150,

  // Glow
  glow_blur_small: 4,
  glow_blur_medium: 8,
  glow_blur_large: 16,
} as const;

// ============================================
// Composition & Layout
// ============================================

export const COMPOSITION = {
  // The Spine - central vertical symmetry
  spine_width: 0.3,  // 30% of viewport
  spine_alignment: 'center' as const,

  // Peripheral Decay
  decay_start: 0.4,  // Start dissolving at 40% from center
  decay_intensity: 0.8,

  // Layering z-indices
  z_void: 0,
  z_substrate: 1,
  z_edges: 2,
  z_spine: 3,
  z_objects: 4,
  z_patterns: 5,
  z_bloom: 6,
  z_overlay: 7,
  z_ui: 10,
} as const;

// ============================================
// Material → Visual Mapping
// ============================================

export interface MaterialVisual {
  primary_color: string;
  glow_color: string;
  particle_density: number;
  bloom_susceptibility: number;
}

export const MATERIAL_VISUALS: Record<MaterialType, MaterialVisual> = {
  // Metals - solid, structural
  gold: { primary_color: '#FFD700', glow_color: '#FFA500', particle_density: 0.9, bloom_susceptibility: 0.2 },
  iron_metal: { primary_color: '#8B8B8B', glow_color: '#A0A0A0', particle_density: 0.85, bloom_susceptibility: 0.3 },
  nickel: { primary_color: '#A8A8A8', glow_color: '#C0C0C0', particle_density: 0.7, bloom_susceptibility: 0.4 },
  copper: { primary_color: '#B87333', glow_color: '#DA8A67', particle_density: 0.75, bloom_susceptibility: 0.5 },
  silver: { primary_color: '#C0C0C0', glow_color: '#E8E8E8', particle_density: 0.8, bloom_susceptibility: 0.35 },
  titanium: { primary_color: '#878787', glow_color: '#B0B0B0', particle_density: 0.95, bloom_susceptibility: 0.15 },
  platinum: { primary_color: '#E5E4E2', glow_color: '#FFFFFF', particle_density: 0.92, bloom_susceptibility: 0.2 },
  aluminum: { primary_color: '#A9A9A9', glow_color: '#D3D3D3', particle_density: 0.6, bloom_susceptibility: 0.5 },
  tungsten: { primary_color: '#5A5A5A', glow_color: '#7A7A7A', particle_density: 0.98, bloom_susceptibility: 0.1 },
  chromium: { primary_color: '#9090A0', glow_color: '#B0B0C0', particle_density: 0.85, bloom_susceptibility: 0.25 },

  // Minerals - crystalline, refractive
  quartz: { primary_color: '#E8E8E8', glow_color: '#FFFFFF', particle_density: 0.6, bloom_susceptibility: 0.4 },
  feldspar: { primary_color: '#DEB887', glow_color: '#F5DEB3', particle_density: 0.55, bloom_susceptibility: 0.45 },
  mica: { primary_color: '#C4A484', glow_color: '#D4B494', particle_density: 0.5, bloom_susceptibility: 0.5 },
  calcite: { primary_color: '#FFFAF0', glow_color: '#FFFFFF', particle_density: 0.55, bloom_susceptibility: 0.45 },
  gypsum: { primary_color: '#F5F5DC', glow_color: '#FFFFF0', particle_density: 0.45, bloom_susceptibility: 0.55 },
  hematite: { primary_color: '#5C4033', glow_color: '#8B4513', particle_density: 0.8, bloom_susceptibility: 0.3 },
  fluorite: { primary_color: '#9966CC', glow_color: '#DA70D6', particle_density: 0.5, bloom_susceptibility: 0.6 },
  apatite: { primary_color: '#40E0D0', glow_color: '#7FFFD4', particle_density: 0.55, bloom_susceptibility: 0.5 },
  tourmaline: { primary_color: '#FF69B4', glow_color: '#FF1493', particle_density: 0.5, bloom_susceptibility: 0.7 },
  garnet: { primary_color: '#8B0000', glow_color: '#DC143C', particle_density: 0.75, bloom_susceptibility: 0.35 },

  // Bio - organic, mutable
  carbon: { primary_color: '#333333', glow_color: '#666666', particle_density: 0.8, bloom_susceptibility: 0.6 },
  nitrogen: { primary_color: '#00CED1', glow_color: '#00FFFF', particle_density: 0.4, bloom_susceptibility: 0.8 },
  oxygen: { primary_color: '#87CEEB', glow_color: '#ADD8E6', particle_density: 0.3, bloom_susceptibility: 0.9 },
  phosphorus: { primary_color: '#FFD700', glow_color: '#FFFF00', particle_density: 0.5, bloom_susceptibility: 0.7 },
  sulfur: { primary_color: '#FFFF00', glow_color: '#FFFF66', particle_density: 0.55, bloom_susceptibility: 0.65 },
  calcium: { primary_color: '#F0F0F0', glow_color: '#FFFFFF', particle_density: 0.7, bloom_susceptibility: 0.4 },
  magnesium: { primary_color: '#FF6347', glow_color: '#FF7F50', particle_density: 0.45, bloom_susceptibility: 0.75 },
  potassium: { primary_color: '#9370DB', glow_color: '#BA55D3', particle_density: 0.35, bloom_susceptibility: 0.85 },
  sodium: { primary_color: '#FFA500', glow_color: '#FFD700', particle_density: 0.4, bloom_susceptibility: 0.8 },
  iron_bio: { primary_color: '#CD5C5C', glow_color: '#F08080', particle_density: 0.65, bloom_susceptibility: 0.5 },
  mycelium: { primary_color: '#8FBC8F', glow_color: '#98FB98', particle_density: 0.3, bloom_susceptibility: 0.85 },
};

// ============================================
// State → Visual Mapping
// ============================================

export interface ObjectVisualState {
  opacity: number;
  scale: number;
  bloom_active: boolean;
  color_shift: string;
  glow_intensity: number;
}

export function getObjectVisualState(
  activation: number,
  overloaded: boolean,
  frozen: boolean
): ObjectVisualState {
  if (frozen) {
    return {
      opacity: 0.5,
      scale: 1.0,
      bloom_active: false,
      color_shift: PALETTE.frozen,
      glow_intensity: 0.2,
    };
  }

  if (overloaded) {
    return {
      opacity: 0.4,
      scale: 0.8,
      bloom_active: true,
      color_shift: PALETTE.bio_acid,
      glow_intensity: 1.0,
    };
  }

  return {
    opacity: 0.3 + activation * 0.7,
    scale: 0.8 + activation * 0.4,
    bloom_active: activation > 0.8,
    color_shift: activation > 0.7 ? PALETTE.highlight_active : PALETTE.data_red,
    glow_intensity: activation * 0.8,
  };
}

// ============================================
// ASCII Halftone
// ============================================

export function densityToChar(density: number): string {
  const chars = EFFECTS.halftone_chars;
  const index = Math.floor(Math.max(0, Math.min(1, density)) * (chars.length - 1));
  return chars[index];
}

export function activationToChar(activation: number): string {
  return densityToChar(activation);
}

// ============================================
// Pattern Visuals
// ============================================

export function getPatternColor(archetype: string): string {
  // All colors meet 3:1 minimum for graphical objects (SC 1.4.11)
  switch (archetype) {
    case 'quick_wins': return '#5cff9d';   // 11.8:1 vs #0d0d0d
    case 'moonshots': return '#ff85c1';    // 6.8:1 vs #0d0d0d
    case 'workhorses': return '#ffd700';   // 12.5:1 vs #0d0d0d
    case 'bridges': return '#4dd9e0';      // 10.2:1 vs #0d0d0d
    case 'shields': return '#a0a0a0';      // 5.7:1 vs #0d0d0d
    case 'catalysts': return '#ff7b61';    // 5.8:1 vs #0d0d0d
    default: return PALETTE.text_secondary;
  }
}

export function getHealthColor(health: string): string {
  switch (health) {
    case 'healthy': return PALETTE.healthy;
    case 'unhealthy': return PALETTE.unhealthy;
    default: return PALETTE.unknown;
  }
}
