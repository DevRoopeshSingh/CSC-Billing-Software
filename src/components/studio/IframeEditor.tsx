'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type Ref,
} from 'react';
import {
  avnacInboundMessageSchema,
  type AvnacCanvasState,
  type AvnacOutboundMessage,
} from '@/shared/avnac-types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IframeEditorProps {
  /** Full URL to the Avnac dev/prod server. Must be a valid URL string. */
  avnacUrl: string;
  /**
   * Short-lived scoped studio token issued by /api/studio/session-token.
   * NEVER pass the main session JWT here — that would expose it to a
   * cross-origin frame.
   */
  studioToken: string | null;
  /**
   * Called when Avnac fires DESIGN_SAVED (explicit user save) or when an
   * autosave flush is triggered by a DESIGN_DIRTY → GET_CURRENT_DESIGN round-
   * trip.  designData is the typed Fabric.js canvas JSON.
   */
  onDesignSave: (designData: AvnacCanvasState, designId: string) => void;
  /** Called after Avnac confirms a DESIGN_LOADED message. */
  onDesignLoaded: (designId: string) => void;
  /** Called once when the Avnac frame fires IFRAME_READY — use to set parent connection state. */
  onReady?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Imperative handle exposed to parent components via ref. */
export interface IframeEditorHandle {
  loadDesignById: (designId: string, data?: AvnacCanvasState) => void;
  startNewDesign: () => void;
  requestExport: (format?: 'png' | 'svg' | 'pdf') => void;
}

export const IframeEditor = forwardRef(function IframeEditor(
  {
    avnacUrl,
    studioToken,
    onDesignSave,
    onDesignLoaded,
    onReady,
  }: IframeEditorProps,
  ref: Ref<IframeEditorHandle>
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Store the validated origin so postMessage has a stable target.
  // Updated whenever avnacUrl changes (see effect below).
  const allowedOriginRef = useRef<string>('');

  // Tracks whether a GET_CURRENT_DESIGN is already in-flight to prevent
  // duplicate requests when DESIGN_DIRTY fires rapidly.
  const pendingDesignFetchRef = useRef(false);

  // Debounce timer for autosave triggered by DESIGN_DIRTY events.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Parse and store the allowed origin whenever avnacUrl changes ────────────
  useEffect(() => {
    try {
      allowedOriginRef.current = new URL(avnacUrl).origin;
      setHasError(false);
    } catch {
      console.error('[Avnac] Invalid avnacUrl provided:', avnacUrl);
      allowedOriginRef.current = '';
      setHasError(true);
    }
  }, [avnacUrl]);

  // ── Send a typed message to the iframe ─────────────────────────────────────
  // FIX #1: Depend on `avnacUrl` (not the primitive `allowedOriginRef.current`)
  // so the callback is recreated whenever the URL changes. The origin itself is
  // always read from the ref at call-time, which is always up to date.
  const sendMessage = useCallback(
    (message: AvnacOutboundMessage) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        console.warn('[Avnac] iframe contentWindow not available');
        return;
      }
      const targetOrigin = allowedOriginRef.current;
      if (!targetOrigin) {
        console.error('[Avnac] targetOrigin not set — avnacUrl may be invalid');
        return;
      }
      try {
        iframe.contentWindow.postMessage(message, targetOrigin);
      } catch (err) {
        console.error('[Avnac] postMessage failed:', err);
      }
    },
    [avnacUrl] // ← avnacUrl, NOT allowedOriginRef.current (which is a primitive)
  );

  // ── Inbound message handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Hard origin check — reject anything that isn't our Avnac origin.
      const allowed = allowedOriginRef.current;
      if (!allowed || event.origin !== allowed) {
        // Only warn for non-browser-internal origins to avoid noise from
        // React DevTools / extensions that also use postMessage.
        if (event.origin !== 'null' && !event.origin.startsWith('chrome-extension://')) {
          console.warn('[Avnac] Rejected message from unexpected origin:', event.origin);
        }
        return;
      }

      // FIX #5: Zod discriminated-union parse — replaces manual `as` casts.
      // Unknown/malformed messages are rejected with a structured error log.
      const parsed = avnacInboundMessageSchema.safeParse(event.data);
      if (!parsed.success) {
        console.warn(
          '[Avnac] Rejected malformed inbound message:',
          parsed.error.flatten().fieldErrors,
          'Raw:', event.data
        );
        return;
      }

      const msg = parsed.data;

      switch (msg.type) {
        case 'IFRAME_READY': {
          setIsLoaded(true);
          setHasError(false);
          // Notify parent that the frame is live (drives connection status indicator).
          onReady?.();
          // Send auth token now that the frame is ready to receive it.
          if (studioToken) {
            sendMessage({ type: 'SET_AUTH_CONTEXT', payload: { token: studioToken } });
          }
          break;
        }

        case 'DESIGN_SAVED': {
          // Explicit user-triggered save — persist immediately, no debounce.
          onDesignSave(msg.payload.data as AvnacCanvasState, msg.payload.id);
          break;
        }

        case 'DESIGN_LOADED': {
          onDesignLoaded(msg.payload.id);
          break;
        }

        case 'DESIGN_DIRTY': {
          // FIX #4: Replace blind 5-second polling with event-driven autosave.
          // Debounce: collapse rapid consecutive edits into a single fetch.
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = setTimeout(() => {
            if (!pendingDesignFetchRef.current) {
              pendingDesignFetchRef.current = true;
              sendMessage({ type: 'GET_CURRENT_DESIGN', payload: {} });
            }
          }, 2500); // 2.5 s debounce — balances responsiveness vs. serialisation cost
          break;
        }

        case 'CURRENT_DESIGN_RESPONSE': {
          // Response to our GET_CURRENT_DESIGN request, triggered by DESIGN_DIRTY.
          pendingDesignFetchRef.current = false;
          if (msg.payload.isDirty && msg.payload.designId) {
            onDesignSave(msg.payload.data as AvnacCanvasState, msg.payload.designId);
          }
          break;
        }

        default:
          // TypeScript exhaustiveness: `msg` should be `never` here if the
          // discriminated union is complete. This cast is a safety net for
          // future protocol additions not yet reflected in the schema.
          console.debug('[Avnac] Unhandled message type:', (msg as { type: string }).type);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [avnacUrl, sendMessage, studioToken, onDesignSave, onDesignLoaded, onReady]);

  // ── Re-send auth token when it rotates ─────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !studioToken) return;
    sendMessage({ type: 'SET_AUTH_CONTEXT', payload: { token: studioToken } });
  }, [isLoaded, studioToken, sendMessage]);

  // ── Cleanup debounce timer on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  // ── Public imperative API (accessed via ref from CanvasEditor) ──────────────
  // These are exposed as stable callbacks so the parent can trigger actions
  // without a prop-drilling chain.
  const loadDesignById = useCallback(
    (designId: string, data?: AvnacCanvasState) => {
      sendMessage({ type: 'LOAD_DESIGN_BY_ID', payload: { designId, data } });
    },
    [sendMessage]
  );

  const startNewDesign = useCallback(() => {
    sendMessage({ type: 'NEW_DESIGN', payload: {} });
  }, [sendMessage]);

  const requestExport = useCallback(
    (format: 'png' | 'svg' | 'pdf' = 'png') => {
      sendMessage({ type: 'EXPORT_DESIGN', payload: { format, quality: 1 } });
    },
    [sendMessage]
  );

  // Expose imperative methods to the parent via forwardRef + useImperativeHandle.
  // CanvasEditor calls these through its own `useRef<IframeEditorHandle>`.
  useImperativeHandle(
    ref,
    () => ({ loadDesignById, startNewDesign, requestExport }),
    [loadDesignById, startNewDesign, requestExport]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-muted-foreground">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm font-medium">Invalid Avnac URL</p>
        <code className="text-xs bg-muted px-2 py-1 rounded">{avnacUrl}</code>
        <p className="text-xs">Set NEXT_PUBLIC_AVNAC_URL to a valid server address.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={avnacUrl}
        title="Avnac Design Editor"
        className="w-full h-full border-none"
        // FIX #2: allow-same-origin REMOVED.
        // Combining allow-scripts + allow-same-origin lets a cross-origin frame
        // escape the sandbox entirely (access cookies, localStorage, call parent
        // APIs). Since Avnac runs on a different port it is cross-origin — we
        // do NOT need allow-same-origin.
        // add allow-popups only if Avnac uses modal dialogs (window.open).
        sandbox="allow-scripts allow-popups allow-downloads"
        referrerPolicy="no-referrer"
        // Deny every permission policy not required by a design editor.
        allow="clipboard-write 'src'"
        onLoad={() => {
          // onLoad fires for successful navigation — the IFRAME_READY message
          // is the authoritative signal that Avnac's React tree is mounted.
          // We don't setIsLoaded(true) here to avoid a premature state update.
        }}
        onError={() => {
          console.error('[Avnac] iframe failed to load:', avnacUrl);
          setHasError(true);
        }}
      />

      {/* Loading overlay — visible until IFRAME_READY fires */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading design editor…</p>
        </div>
      )}
    </div>
  );
// Close the forwardRef function body
});

IframeEditor.displayName = 'IframeEditor';

export type { IframeEditorProps };