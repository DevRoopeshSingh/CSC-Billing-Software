'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { NativeEditorHandle } from './NativeEditor';
import type { AvnacCanvasState } from '@/shared/avnac-types';

// Dynamically import the native editor to prevent SSR hydration errors with Fabric.js
const NativeEditor = dynamic(() => import('./NativeEditor'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredDesign {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

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

  const [designs, setDesigns] = useState<StoredDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    syncError: null,
    pendingChanges: 0,
  });

  const nativeEditorRef = useRef<NativeEditorHandle | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch user's designs from the API ───────────────────────────────────────
  const fetchDesigns = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingDesigns(true);

    const controller = new AbortController();

    try {
      const res = await fetch('/api/studio/designs', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch designs: ${res.status}`);
      const data: StoredDesign[] = await res.json();
      setDesigns(data);
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

  // ── Save design to API ──────────────────────────────────────────────────────
  const performSave = useCallback(async () => {
    if (!user?.id || !nativeEditorRef.current) return;

    const designState = nativeEditorRef.current.getDesignState();
    if (!designState) return;

    // Use current selected ID, or generate a new one if it's unsaved
    const targetDesignId = selectedDesignId || `design_${Date.now()}`;

    setIsSaving(true);
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      const res = await fetch('/api/studio/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: targetDesignId,
          data: designState,
        }),
      });

      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const saved: StoredDesign = await res.json();

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
      console.error('[Studio] Failed to save design:', err);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: 'Failed to save design',
      }));
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, selectedDesignId]);

  // ── Trigger save automatically on canvas changes (debounced) ────────────────
  const handleDesignDirty = useCallback(() => {
    setSyncStatus((prev) => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Auto-save debounce (2.5s)
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2500);
  }, [performSave]);

  // ── Load design ─────────────────────────────────────────────────────────────
  const handleSelectDesign = useCallback(async (design: StoredDesign) => {
    if (!user?.id) return;
    
    setSelectedDesignId(design.id);
    
    try {
      const res = await fetch(`/api/studio/designs/${design.id}`);
      if (!res.ok) throw new Error('Failed to load design data');
      const { data } = await res.json();
      
      nativeEditorRef.current?.loadDesignData(data);
      setSyncStatus((prev) => ({ ...prev, lastSync: new Date().toISOString() }));
    } catch (err) {
      console.error('[Studio] Error loading design:', err);
    }
  }, [user?.id]);

  // ── Delete design ───────────────────────────────────────────────────────────
  const handleDeleteDesign = useCallback(async (designId: string) => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`/api/studio/designs/${designId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
      if (selectedDesignId === designId) {
        setSelectedDesignId(null);
        nativeEditorRef.current?.loadDesignData({}); // Clear canvas
      }
    } catch (err) {
      console.error('[Studio] Failed to delete design:', err);
      setSyncStatus((prev) => ({ ...prev, syncError: 'Failed to delete design' }));
    }
  }, [selectedDesignId, user?.id]);

  // ── Handle "New Design" button ──────────────────────────────────────────────
  const handleNewDesign = useCallback(() => {
    setSelectedDesignId(null);
    nativeEditorRef.current?.loadDesignData({}); // Clear canvas
  }, []);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">Design Studio</h2>
          <p className="text-muted-foreground text-sm">
            Create and edit designs locally with direct cloud sync
          </p>
        </div>

        <div className="flex flex-row flex-wrap gap-2 mt-4 sm:mt-0 items-center">
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

      <div className="flex-1 flex overflow-hidden">
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDesignId && (
            <div className="border-t border-border p-4 space-y-2">
              <button
                onClick={() => {
                  const pngUrl = nativeEditorRef.current?.exportAsPng();
                  if (pngUrl) {
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = `design_${selectedDesignId}.png`;
                    a.click();
                  }
                }}
                disabled={isSaving || syncStatus.isSyncing}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="mr-2">📤</span>
                Export PNG
              </button>

              <button
                onClick={() => handleDeleteDesign(selectedDesignId)}
                disabled={isSaving}
                className="w-full flex items-center justify-center px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="mr-2">🗑️</span>
                Delete Design
              </button>
            </div>
          )}
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Editor active (Local Fabric.js)
              </span>

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
          </div>

          <div className="flex-1 relative overflow-hidden bg-white">
            <NativeEditor
              ref={nativeEditorRef}
              onDesignDirty={handleDesignDirty}
            />
          </div>
        </section>
      </div>
    </div>
  );
}