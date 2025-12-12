// MindGraphSim - Visualization Adapter
// Structured data for rendering

import { SimulationState, Vector3 } from './types';
import {
  PALETTE,
  COMPOSITION,
  MATERIAL_VISUALS,
  getObjectVisualState,
  densityToChar,
  getPatternColor,
} from './theme';

// ============================================
// Renderable Types
// ============================================

export interface RenderableObject {
  id: string;
  label: string;
  position: Vector3;
  velocity: Vector3;
  // Visual properties
  color: string;
  glow_color: string;
  opacity: number;
  scale: number;
  particle_density: number;
  glow_intensity: number;
  // State
  bloom_active: boolean;
  in_spine: boolean;
  decay_factor: number;
  frozen: boolean;
  // ASCII representation
  ascii_char: string;
  // Data
  activation: number;
  mass: number;
  material_type: string;
}

export interface RenderableEdge {
  id: string;
  source_id: string;
  target_id: string;
  source_pos: Vector3;
  target_pos: Vector3;
  weight: number;
  tension: number;
  severed: boolean;
  recovery_progress: number;
  color: string;
  opacity: number;
  dash_pattern: number[] | null;
}

export interface RenderablePattern {
  id: string;
  type: string;
  archetype: string;
  member_ids: string[];
  color: string;
  opacity: number;
  vitality: number;
  persistence: number;
}

export interface AmbientVisuals {
  noise_level: number;
  safety_index: number;
  arousal: number;
  grain_opacity: number;
  void_color: string;
  bias_vector: Vector3;
}

export interface SceneData {
  objects: RenderableObject[];
  edges: RenderableEdge[];
  patterns: RenderablePattern[];
  ambient: AmbientVisuals;
  composition: {
    spine_center: number;
    spine_width: number;
    viewport_width: number;
    viewport_height: number;
  };
  telemetry: {
    step: number;
    object_count: number;
    edge_count: number;
    pattern_count: number;
    overload_count: number;
    severed_edge_count: number;
  };
  palette: typeof PALETTE;
}

// ============================================
// Visualization Adapter
// ============================================

export class VisualizationAdapter {
  private viewportWidth: number = 1920;
  private viewportHeight: number = 1080;
  private positionScale: number = 50;

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  setPositionScale(scale: number): void {
    this.positionScale = scale;
  }

  // ============================================
  // Main Scene Data
  // ============================================

  getSceneData(state: SimulationState): SceneData {
    const spineCenter = this.viewportWidth / 2;
    const spineHalfWidth = (this.viewportWidth * COMPOSITION.spine_width) / 2;

    // Track overloaded objects
    const overloadedIds = new Set(
      state.overload_events
        .filter(e => e.step >= state.step - 10)
        .map(e => e.trigger_object_id)
    );

    // Build renderable objects
    const objects = this.buildRenderableObjects(state, spineCenter, spineHalfWidth, overloadedIds);

    // Build renderable edges
    const edges = this.buildRenderableEdges(state);

    // Build renderable patterns
    const patterns = this.buildRenderablePatterns(state);

    // Build ambient visuals
    const ambient = this.buildAmbientVisuals(state);

    // Count severed edges
    const severedCount = Array.from(state.edges.values()).filter(e => e.severed).length;

    return {
      objects,
      edges,
      patterns,
      ambient,
      composition: {
        spine_center: spineCenter,
        spine_width: spineHalfWidth * 2,
        viewport_width: this.viewportWidth,
        viewport_height: this.viewportHeight,
      },
      telemetry: {
        step: state.step,
        object_count: state.objects.size,
        edge_count: state.edges.size,
        pattern_count: state.patterns.size,
        overload_count: state.overload_events.length,
        severed_edge_count: severedCount,
      },
      palette: PALETTE,
    };
  }

  private buildRenderableObjects(
    state: SimulationState,
    spineCenter: number,
    spineHalfWidth: number,
    overloadedIds: Set<string>
  ): RenderableObject[] {
    const objects: RenderableObject[] = [];

    for (const obj of state.objects.values()) {
      const visual = MATERIAL_VISUALS[obj.material_type] ?? MATERIAL_VISUALS.carbon;
      const isOverloaded = overloadedIds.has(obj.id);
      const visualState = getObjectVisualState(obj.activation, isOverloaded, obj.frozen);

      // Map 3D position to screen
      const screenX = spineCenter + obj.position.x * this.positionScale;
      // const screenY = this.viewportHeight / 2 + obj.position.y * this.positionScale; // Unused

      // Determine if in spine
      const distFromSpine = Math.abs(screenX - spineCenter);
      const inSpine = distFromSpine < spineHalfWidth;

      // Decay factor for peripheral objects
      const decayStart = spineHalfWidth / COMPOSITION.decay_start;
      const decayFactor = inSpine
        ? 0
        : Math.min(1, (distFromSpine - spineHalfWidth) / decayStart) * COMPOSITION.decay_intensity;

      objects.push({
        id: obj.id,
        label: obj.label,
        position: obj.position,
        velocity: obj.velocity,
        color: visualState.color_shift,
        glow_color: visual.glow_color,
        opacity: visualState.opacity * (1 - decayFactor * 0.5),
        scale: visualState.scale,
        particle_density: visual.particle_density,
        glow_intensity: visualState.glow_intensity,
        bloom_active: visualState.bloom_active,
        in_spine: inSpine,
        decay_factor: decayFactor,
        frozen: obj.frozen,
        ascii_char: densityToChar(obj.activation),
        activation: obj.activation,
        mass: obj.mass,
        material_type: obj.material_type,
      });
    }

    return objects;
  }

  private buildRenderableEdges(state: SimulationState): RenderableEdge[] {
    const edges: RenderableEdge[] = [];

    for (const edge of state.edges.values()) {
      const src = state.objects.get(edge.source_id);
      const tgt = state.objects.get(edge.target_id);
      if (!src || !tgt) continue;

      let color: string;
      let opacity: number;
      let dashPattern: number[] | null = null;

      if (edge.severed) {
        color = PALETTE.severed;
        opacity = 0.2 + edge.recovery_progress * 0.3;
        dashPattern = [4, 4];
      } else if (edge.tension > 0.7) {
        color = PALETTE.highlight_danger;
        opacity = 0.6 + edge.tension * 0.3;
      } else {
        color = PALETTE.text_secondary;
        opacity = 0.3 + edge.weight * 0.4;
      }

      edges.push({
        id: edge.id,
        source_id: edge.source_id,
        target_id: edge.target_id,
        source_pos: src.position,
        target_pos: tgt.position,
        weight: edge.weight,
        tension: edge.tension,
        severed: edge.severed,
        recovery_progress: edge.recovery_progress,
        color,
        opacity,
        dash_pattern: dashPattern,
      });
    }

    return edges;
  }

  private buildRenderablePatterns(state: SimulationState): RenderablePattern[] {
    const patterns: RenderablePattern[] = [];

    for (const pattern of state.patterns.values()) {
      patterns.push({
        id: pattern.id,
        type: pattern.type,
        archetype: pattern.archetype,
        member_ids: pattern.member_ids,
        color: getPatternColor(pattern.archetype),
        opacity: 0.3 + pattern.persistence_score * 0.5,
        vitality: pattern.vitality,
        persistence: pattern.persistence_score,
      });
    }

    return patterns;
  }

  private buildAmbientVisuals(state: SimulationState): AmbientVisuals {
    const field = state.ambient_field;

    // Interpolate void color based on safety
    const voidColor = field.safety_index > 0.5
      ? PALETTE.deep_blue_void
      : this.lerpColor(PALETTE.deep_blue_void, PALETTE.highlight_danger, 1 - field.safety_index);

    return {
      noise_level: field.noise_level,
      safety_index: field.safety_index,
      arousal: field.baseline_arousal,
      grain_opacity: 0.1 + field.noise_level * 0.15,
      void_color: voidColor,
      bias_vector: field.field_bias,
    };
  }

  private lerpColor(a: string, b: string, t: number): string {
    const parseHex = (hex: string) => {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    };

    const ca = parseHex(a);
    const cb = parseHex(b);

    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  }

  // ============================================
  // ASCII View
  // ============================================

  generateASCIIView(state: SimulationState, width: number = 80, height: number = 24): string[] {
    const grid: string[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(' '));

    const objects = Array.from(state.objects.values());
    if (objects.length === 0) return grid.map(row => row.join(''));

    // Find bounds
    const positions = objects.map(o => o.position);
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Plot objects
    for (const obj of objects) {
      const x = Math.floor(((obj.position.x - minX) / rangeX) * (width - 2)) + 1;
      const y = Math.floor(((obj.position.y - minY) / rangeY) * (height - 2)) + 1;

      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[y][x] = densityToChar(obj.activation);
      }
    }

    // Draw edges (simple line drawing)
    for (const edge of state.edges.values()) {
      if (edge.severed) continue;

      const src = state.objects.get(edge.source_id);
      const tgt = state.objects.get(edge.target_id);
      if (!src || !tgt) continue;

      const x1 = Math.floor(((src.position.x - minX) / rangeX) * (width - 2)) + 1;
      const y1 = Math.floor(((src.position.y - minY) / rangeY) * (height - 2)) + 1;
      const x2 = Math.floor(((tgt.position.x - minX) / rangeX) * (width - 2)) + 1;
      const y2 = Math.floor(((tgt.position.y - minY) / rangeY) * (height - 2)) + 1;

      // Simple Bresenham-ish line
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = Math.round(x1 + (x2 - x1) * t);
        const y = Math.round(y1 + (y2 - y1) * t);
        if (x >= 0 && x < width && y >= 0 && y < height && grid[y][x] === ' ') {
          grid[y][x] = edge.tension > 0.5 ? '~' : '-';
        }
      }
    }

    return grid.map(row => row.join(''));
  }

  // ============================================
  // D3-Compatible Data
  // ============================================

  getD3GraphData(state: SimulationState): {
    nodes: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
      r: number;
      color: string;
      activation: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      weight: number;
      color: string;
    }>;
  } {
    const nodes = Array.from(state.objects.values()).map(obj => {
      const visual = MATERIAL_VISUALS[obj.material_type] ?? MATERIAL_VISUALS.carbon;
      return {
        id: obj.id,
        label: obj.label,
        x: obj.position.x * this.positionScale,
        y: obj.position.y * this.positionScale,
        r: 5 + obj.mass * 10,
        color: visual.primary_color,
        activation: obj.activation,
      };
    });

    const links = Array.from(state.edges.values())
      .filter(e => !e.severed)
      .map(edge => ({
        source: edge.source_id,
        target: edge.target_id,
        weight: edge.weight,
        color: edge.tension > 0.5 ? PALETTE.highlight_danger : PALETTE.text_secondary,
      }));

    return { nodes, links };
  }

  // ============================================
  // Light Cone Visualization
  // ============================================

  getLightConeData(
    state: SimulationState,
    objectId: string
  ): {
    center: { x: number; y: number; z: number };
    spatial_radius: number;
    temporal_depth: number;
    reachable_ids: string[];
  } | null {
    const obj = state.objects.get(objectId);
    if (!obj) return null;

    const reachable: string[] = [];
    const spatialRadius = obj.light_cone.spatial_reach * this.positionScale;

    for (const other of state.objects.values()) {
      if (other.id === objectId) continue;

      const dx = other.position.x - obj.position.x;
      const dy = other.position.y - obj.position.y;
      const dz = other.position.z - obj.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= obj.light_cone.spatial_reach) {
        reachable.push(other.id);
      }
    }

    return {
      center: {
        x: obj.position.x * this.positionScale,
        y: obj.position.y * this.positionScale,
        z: obj.position.z * this.positionScale,
      },
      spatial_radius: spatialRadius,
      temporal_depth: obj.light_cone.temporal_reach,
      reachable_ids: reachable,
    };
  }
}
