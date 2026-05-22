'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { useFabric } from './hooks/useFabric';

export interface NativeEditorHandle {
  exportAsPng: () => string | null;
  getDesignState: () => any;
  loadDesignData: (data: any) => void;
}

interface NativeEditorProps {
  initialData?: any;
  onDesignDirty?: () => void;
}

const NativeEditor = forwardRef<NativeEditorHandle, NativeEditorProps>(
  ({ initialData, onDesignDirty }, ref) => {
    const {
      canvasRef,
      canvas,
      addText,
      addRectangle,
      deleteSelected,
      exportAsPng,
      getDesignState,
    } = useFabric({ onDesignDirty, initialData });

    // Expose methods to the parent CanvasEditor
    useImperativeHandle(
      ref,
      () => ({
        exportAsPng,
        getDesignState,
        loadDesignData: (data: any) => {
          if (canvas && data && Object.keys(data).length > 0) {
            canvas.loadFromJSON(data, () => {
              canvas.renderAll();
            });
          } else if (canvas) {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
          }
        },
      }),
      [exportAsPng, getDesignState, canvas]
    );

    return (
      <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Simple Editor Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-b border-border shadow-sm shrink-0">
          <button
            onClick={() => addText('New Text')}
            className="px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors font-medium"
          >
            + Text
          </button>
          <button
            onClick={addRectangle}
            className="px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors font-medium"
          >
            + Shape
          </button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <button
            onClick={deleteSelected}
            className="px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors font-medium"
          >
            Delete Selected
          </button>
        </div>

        {/* Canvas Work Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-muted/30">
          <div className="shadow-lg rounded-sm overflow-hidden border border-border/50 bg-white">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    );
  }
);

NativeEditor.displayName = 'NativeEditor';

export default NativeEditor;
