// src/shared/avnac-types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared type contract for the Avnac iframe ↔ CSC parent message channel.
// Import in both IframeEditor.tsx and the /api/studio route so the entire
// surface is typed end-to-end without `any`.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Canvas data shape (Fabric.js JSON envelope) ───────────────────────────────

export interface AvnacCanvasObject {
  type: string;
  version?: string;
  [key: string]: unknown; // Fabric.js objects have many optional props
}

export interface AvnacCanvasState {
  version: string; // Fabric.js canvas JSON version e.g. "5.3.0"
  objects: AvnacCanvasObject[];
  background?: string;
  width?: number;
  height?: number;
}

export const avnacCanvasStateSchema = z.object({
  version: z.string().optional(),
  objects: z.array(z.record(z.unknown())),
  background: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
}).passthrough();


// ── Zod schemas for runtime validation of incoming postMessages ───────────────

/**
 * Discriminated union of every message Avnac can send to the parent frame.
 * Add new variants here when the Avnac protocol is extended.
 *
 * Using z.discriminatedUnion gives O(1) parsing — Zod jumps straight to the
 * matching schema branch instead of trying all variants.
 */
export const avnacInboundMessageSchema = z.discriminatedUnion('type', [
  // Avnac fires this once its React tree is mounted and ready to receive.
  z.object({
    type: z.literal('IFRAME_READY'),
  }),

  // Fired when the user explicitly saves (Ctrl+S / Save button).
  z.object({
    type: z.literal('DESIGN_SAVED'),
    payload: z.object({
      id: z.string().min(1).max(128),
      data: z.object({
        version: z.string(),
        objects: z.array(z.record(z.unknown())),
        background: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
      timestamp: z.number().int().positive(),
    }),
  }),

  // Fired after Avnac successfully loads a design from a LOAD_DESIGN_BY_ID command.
  z.object({
    type: z.literal('DESIGN_LOADED'),
    payload: z.object({
      id: z.string().min(1).max(128),
    }),
  }),

  // Response to GET_CURRENT_DESIGN — used for event-driven autosave.
  z.object({
    type: z.literal('CURRENT_DESIGN_RESPONSE'),
    payload: z.object({
      designId: z.string().min(1).max(128).nullable(),
      data: z.object({
        version: z.string(),
        objects: z.array(z.record(z.unknown())),
        background: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
      isDirty: z.boolean(), // true if there are unsaved changes since last DESIGN_SAVED
    }),
  }),

  // Fired whenever the canvas content changes — drives debounced autosave.
  z.object({
    type: z.literal('DESIGN_DIRTY'),
    payload: z.object({
      designId: z.string().min(1).max(128).nullable(),
    }),
  }),
]);

export type AvnacInboundMessage = z.infer<typeof avnacInboundMessageSchema>;

// ── Messages the parent sends TO Avnac ────────────────────────────────────────

export interface SetAuthContextMessage {
  type: 'SET_AUTH_CONTEXT';
  payload: {
    /** Short-lived scoped studio token, NOT the main session JWT. */
    token: string;
  };
}

export interface GetCurrentDesignMessage {
  type: 'GET_CURRENT_DESIGN';
  payload: Record<string, never>; // empty by design
}

export interface LoadDesignByIdMessage {
  type: 'LOAD_DESIGN_BY_ID';
  payload: {
    designId: string;
    /** Optional pre-fetched canvas JSON. If omitted, Avnac fetches it itself. */
    data?: AvnacCanvasState;
  };
}

export interface NewDesignMessage {
  type: 'NEW_DESIGN';
  payload: Record<string, never>;
}

export interface ExportDesignMessage {
  type: 'EXPORT_DESIGN';
  payload: {
    format: 'png' | 'svg' | 'pdf';
    quality?: number; // 0–1, PNG only
  };
}

export type AvnacOutboundMessage =
  | SetAuthContextMessage
  | GetCurrentDesignMessage
  | LoadDesignByIdMessage
  | NewDesignMessage
  | ExportDesignMessage;
