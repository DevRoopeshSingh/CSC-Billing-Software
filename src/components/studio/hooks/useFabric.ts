import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';

interface UseFabricProps {
  onDesignDirty?: () => void;
  initialData?: any; // AvnacCanvasState
}

export function useFabric({ onDesignDirty, initialData }: UseFabricProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || initialized.current) return;

    // Initialize Fabric Canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    initialized.current = true;
    setCanvas(fabricCanvas);

    // Event listeners for tracking dirty state
    const handleModification = () => {
      if (onDesignDirty) onDesignDirty();
    };

    fabricCanvas.on('object:modified', handleModification);
    fabricCanvas.on('object:added', handleModification);
    fabricCanvas.on('object:removed', handleModification);

    // Load initial data if provided
    if (initialData && Object.keys(initialData).length > 0) {
      fabricCanvas.loadFromJSON(initialData, () => {
        fabricCanvas.renderAll();
      });
    }

    return () => {
      // Cleanup to prevent memory leaks, especially in React 18 Strict Mode
      fabricCanvas.off('object:modified', handleModification);
      fabricCanvas.off('object:added', handleModification);
      fabricCanvas.off('object:removed', handleModification);
      fabricCanvas.dispose();
      initialized.current = false;
    };
  }, [initialData, onDesignDirty]);

  // Expose basic helper methods
  const addText = useCallback((textStr: string) => {
    if (!canvas) return;
    const text = new fabric.IText(textStr, {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fill: '#333333',
      fontSize: 24,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    if (onDesignDirty) onDesignDirty();
  }, [canvas, onDesignDirty]);

  const addRectangle = useCallback(() => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'red',
      width: 100,
      height: 100,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    if (onDesignDirty) onDesignDirty();
  }, [canvas, onDesignDirty]);

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach(obj => {
        canvas.remove(obj);
      });
      if (onDesignDirty) onDesignDirty();
    }
  }, [canvas, onDesignDirty]);

  const exportAsPng = useCallback((): string | null => {
    if (!canvas) return null;
    return canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1, // Change for high-res exports
    });
  }, [canvas]);

  const getDesignState = useCallback(() => {
    if (!canvas) return null;
    return canvas.toJSON();
  }, [canvas]);

  return {
    canvasRef,
    canvas,
    addText,
    addRectangle,
    deleteSelected,
    exportAsPng,
    getDesignState,
  };
}
