'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback, useRef } from 'react';
import { IframeEditor, type IframeEditorHandle } from './IframeEditor';
import type { AvnacCanvasState } from '@/shared/avnac-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredDesign {
  id: string;
  name: string;
  thumbnail?: string; // base64 or public URL
  createdAt: string;
  updatedAt: string;
}

// FIX #9 (status bar): connection state is now derived from real signals,
// not hardcoded constants.
type ConnectionState = 'connecting' | 'ready' | 'error';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: string | null;
  syncError: string | null;
  pendingChanges: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertDesign(list: StoredDesign[], next: StoredDesign): StoredDesign[] {
  const idx = list.findIndex((d) => d.id === next.id);
  if (idx >= 0) {
    const clone = [...list];
    clone[idx] = next;
    return clone;
  }
  return [next, ...list];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CanvasEditor() {
  const { user } = useAuth();

  // FIX #10: avnacUrl from env var, not hardcoded.
  const avnacUrl = process.env.NEXT_PUBLIC_AVNAC_URL ?? '';

  // FIX #3: Scoped studio token instead of raw user.id / session JWT.
  const [studioToken, setStudioToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  const [designs, setDesigns] = useState<StoredDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    syncError: null,
    pendingChanges: 0,
  });

  // ── Studio session token ────────────────────────────────────────────────────
  // Issues a short-lived, HMAC-signed scoped token via our own API.
  // The main session JWT is never forwarded to Avnac (cross-origin untrusted frame).
  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();

    async function fetchToken() {
      try {
        const res = await fetch('/api/studio/session-token', {
          method: 'POST',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
        const { token } = await res.json() as { token: string };
        setStudioToken(token);
        setTokenError(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[Studio] Failed to fetch studio token:', err);
        setTokenError(true);
      }
    }

    fetchToken();

    // Rotate every 14 minutes — server token expires at 15 min.
    const rotateInterval = setInterval(() => {
      if (!controller.signal.aborted) fetchToken();
    }, 14 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(rotateInterval);
    };
  }, [user?.id]);


  // ── Fetch user's designs from the API ───────────────────────────────────────
  const fetchDesigns = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingDesigns(true);

    // FIX #6: AbortController replaces isMountedRef anti-pattern.
    const controller = new AbortController();

    try {
      // TODO Week 2: implement GET /api/studio/designs
      // const res = await fetch(`/api/studio/designs?userId=${user.id}`, {
      //   signal: controller.signal,
      // });
      // if (!res.ok) throw new Error(`Failed to fetch designs: ${res.status}`);
      // const data: StoredDesign[] = await res.json();
      // setDesigns(data);
      setDesigns([]); // PoC placeholder
      setSyncStatus((prev) => ({ ...prev, syncError: null }));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[Studio] Failed to fetch designs:', err);
      setSyncStatus((prev) => ({
        ...prev,
        syncError: 'Failed to load designs',
        lastSync: new Date().toISOString(),
      }));
    } finally {
      setIsLoadingDesigns(false);
    }

    return () => controller.abort();
  }, [user?.id]);

  // ── Save design to Supabase via API ─────────────────────────────────────────
  // FIX #6 + #7: AbortController + typed AvnacCanvasState (no `any`).
  const handleDesignSave = useCallback(
    async (designData: AvnacCanvasState, designId: string) => {
      if (!user?.id) return;

      setIsSaving(true);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: true,
        pendingChanges: prev.pendingChanges + 1,
        syncError: null,
      }));

      const controller = new AbortController();

      try {
        // TODO Week 2: implement POST /api/studio/designs
        // const res = await fetch('/api/studio/designs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   signal: controller.signal,
        //   body: JSON.stringify({
        //     userId: user.id,
        //     designId,
        //     data: designData,
        //   }),
        // });
        // if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        // const saved: StoredDesign = await res.json();

        // PoC simulation — remove once real endpoint exists.
        const saved: StoredDesign = {
          id: designId || `design_${Date.now()}`,
          name: `Design ${new Date().toLocaleTimeString()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDesigns((prev) => upsertDesign(prev, saved));
        setSelectedDesignId(saved.id);
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toISOString(),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
          isSyncing: prev.pendingChanges <= 1,
          syncError: null,
        }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[Studio] Failed to save design:', err);
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncError: 'Failed to save design',
          lastSync: new Date().toISOString(),
        }));
      } finally {
        setIsSaving(false);
      }

      return () => controller.abort();
    },
    [user?.id]
  );

  // ── Load design (sidebar click) ─────────────────────────────────────────────
  const handleDesignLoaded = useCallback((designId: string) => {
    setSelectedDesignId(designId);
    setSyncStatus((prev) => ({
      ...prev,
      lastSync: new Date().toISOString(),
    }));
  }, []);

  // ── Delete design ───────────────────────────────────────────────────────────
  const handleDeleteDesign = useCallback(
    async (designId: string) => {
      const controller = new AbortController();
      try {
        // TODO Week 2: DELETE /api/studio/designs/:designId
        // await fetch(`/api/studio/designs/${designId}`, {
        //   method: 'DELETE',
        //   signal: controller.signal,
        // });
        setDesigns((prev) => prev.filter((d) => d.id !== designId));
        if (selectedDesignId === designId) setSelectedDesignId(null);
        setSyncStatus((prev) => ({ ...prev, lastSync: new Date().toISOString() }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[Studio] Failed to delete design:', err);
        setSyncStatus((prev) => ({ ...prev, syncError: 'Failed to delete design' }));
      }
      return () => controller.abort();
    },
    [selectedDesignId]
  );

  const iframeEditorRef = useRef<IframeEditorHandle | null>(null);

  // ── Handle "New Design" button ──────────────────────────────────────────────
  const handleNewDesign = useCallback(() => {
    setSelectedDesignId(null);
    iframeEditorRef.current?.startNewDesign();
  }, []);

  // ── Handle design selection from sidebar ────────────────────────────────────
  const handleSelectDesign = useCallback(
    (design: StoredDesign) => {
      setSelectedDesignId(design.id);
      iframeEditorRef.current?.loadDesignById(design.id);
    },
    []
  );

  // ── Handle iframe ready (connection state) ──────────────────────────────────
  // IframeEditor sets isLoaded internally via IFRAME_READY. We track a
  // higher-level "connectionState" here for the status bar.
  const handleIframeReady = useCallback(() => {
    setConnectionState('ready');
  }, []);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  // ── Validate env var on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!avnacUrl) {
      console.error('[Studio] NEXT_PUBLIC_AVNAC_URL is not set. The design editor will not load.');
      setConnectionState('error');
    }
  }, [avnacUrl]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Studio Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">Design Studio</h2>
          <p className="text-muted-foreground text-sm">
            Create and edit designs with cloud sync
          </p>
        </div>

        <div className="flex flex-row flex-wrap gap-2 mt-4 sm:mt-0 items-center">
          {/* New Design */}
          <button
            id="studio-new-design-btn"
            onClick={handleNewDesign}
            disabled={isSaving || isLoadingDesigns}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          >
            <span className="mr-2 text-base leading-none">+</span>
            New Design
          </button>

          {designs.length > 0 && (
            <button
              id="studio-design-library-btn"
              className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
            >
              <span className="mr-2">📁</span>
              Design Library ({designs.length})
            </button>
          )}

          {/* FIX #9: Sync status wired to real state, not hardcoded strings */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {syncStatus.isSyncing && (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
            )}
            {!syncStatus.isSyncing && !syncStatus.syncError && syncStatus.lastSync && (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            )}
            {syncStatus.syncError && (
              <div className="h-2 w-2 rounded-full bg-destructive" />
            )}
            <span>
              {syncStatus.syncError
                ? `Sync error: ${syncStatus.syncError}`
                : syncStatus.isSyncing
                ? 'Syncing…'
                : syncStatus.lastSync
                ? `Synced ${new Date(syncStatus.lastSync).toLocaleTimeString()}`
                : 'Not yet synced'}
            </span>
            {syncStatus.pendingChanges > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                {syncStatus.pendingChanges} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Token / URL error banners ───────────────────────────────────────── */}
      {!avnacUrl && (
        <div className="mx-0 mt-3 px-4 py-2 rounded-md bg-destructive/10 text-destructive text-sm">
          ⚠️ <strong>NEXT_PUBLIC_AVNAC_URL</strong> is not configured. The design editor
          will not load. Add it to your <code>.env.local</code>.
        </div>
      )}
      {tokenError && (
        <div className="mx-0 mt-3 px-4 py-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
          ⚠️ Could not obtain a studio session token. Design saving may not work.
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Design Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingDesigns ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Loading designs…</p>
              </div>
            ) : designs.length === 0 ? (
              <div className="text-center py-8 px-2">
                <div className="text-4xl mb-3">🎨</div>
                <p className="text-muted-foreground text-sm">
                  No designs yet. Click <strong>+ New Design</strong> to start.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {designs.map((design) => (
                  <div
                    key={design.id}
                    id={`studio-design-${design.id}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectDesign(design)}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedDesignId === design.id ? 'bg-accent/75 ring-1 ring-primary/30' : ''
                    }`}
                    onClick={() => handleSelectDesign(design)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">
                        {design.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(design.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 w-8 h-8 bg-muted rounded flex items-center justify-center text-sm">
                      {design.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={design.thumbnail}
                          alt={design.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        '🖼️'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Design Actions */}
          {selectedDesignId && (
            <div className="border-t border-border p-4 space-y-2">
              <button
                id="studio-export-btn"
                onClick={() => iframeEditorRef.current?.requestExport('png')}
                disabled={isSaving || syncStatus.isSyncing}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="mr-2">📤</span>
                Export PNG
              </button>

              {designs.length > 1 && (
                <button
                  id="studio-delete-btn"
                  onClick={() => handleDeleteDesign(selectedDesignId)}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 text-sm"
                >
                  <span className="mr-2">🗑️</span>
                  Delete Design
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Editor Area */}
        <section className="flex-1 flex flex-col overflow-hidden relative">
          {/* FIX #9: Status bar wired to real connectionState + syncStatus */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              {/* Connection indicator */}
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    connectionState === 'ready'
                      ? 'bg-green-500'
                      : connectionState === 'error'
                      ? 'bg-destructive'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                {connectionState === 'ready'
                  ? 'Editor connected'
                  : connectionState === 'error'
                  ? 'Connection failed'
                  : 'Connecting…'}
              </span>

              {/* Save indicator */}
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    syncStatus.syncError
                      ? 'bg-destructive'
                      : syncStatus.lastSync
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/40'
                  }`}
                />
                {syncStatus.syncError
                  ? 'Sync error'
                  : syncStatus.lastSync
                  ? 'Synced to cloud'
                  : 'Not yet synced'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
              )}
              <span>
                {isSaving ? 'Saving…' : syncStatus.isSyncing ? 'Syncing…' : 'Saved'}
              </span>
            </div>
          </div>

          {/* Iframe Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            {avnacUrl ? (
              <IframeEditor
                ref={iframeEditorRef}
                avnacUrl={avnacUrl}
                studioToken={studioToken}
                onDesignSave={handleDesignSave}
                onDesignLoaded={handleDesignLoaded}
                onReady={handleIframeReady}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <span className="text-5xl">🔧</span>
                <p className="text-sm font-medium">Design editor not configured</p>
                <p className="text-xs">
                  Set <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_AVNAC_URL</code> to
                  your Avnac server address.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}