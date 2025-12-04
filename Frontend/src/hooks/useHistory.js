// hooks/useHistory.js
import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

const MAX_HISTORY = 50;

export default function useHistory() {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [layers, setLayers] = useState([]);
  const layerIdRef = useRef(1);

  // Record a new action
  const recordAction = useCallback((action) => {
    const timestamp = Date.now();
    const layerId = layerIdRef.current++;
    
    const historyEntry = {
      id: layerId,
      timestamp,
      ...action,
    };

    setUndoStack(prev => {
      const newStack = [...prev, historyEntry];
      return newStack.slice(-MAX_HISTORY);
    });
    
    // Clear redo stack when new action is performed
    setRedoStack([]);

    // Add to layers for visual tracking
    setLayers(prev => [...prev, {
      id: layerId,
      name: action.name || 'Unknown Action',
      type: action.type,
      icon: getLayerIcon(action.type),
      timestamp,
      active: true,
      data: action
    }]);

    return historyEntry;
  }, []);

  // Undo last action
  const undo = useCallback(() => {
    if (undoStack.length === 0) return null;

    const lastAction = undoStack[undoStack.length - 1];
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);
    
    // Update layer visibility
    setLayers(prev => prev.map(layer => 
      layer.id === lastAction.id ? { ...layer, active: false } : layer
    ));

    return { action: lastAction, direction: 'undo' };
  }, [undoStack]);

  // Redo last undone action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return null;

    const lastUndone = redoStack[redoStack.length - 1];
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastUndone]);
    
    // Update layer visibility
    setLayers(prev => prev.map(layer => 
      layer.id === lastUndone.id ? { ...layer, active: true } : layer
    ));

    return { action: lastUndone, direction: 'redo' };
  }, [redoStack]);

  // Remove specific layer
  const removeLayer = useCallback((layerId) => {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    setUndoStack(prev => prev.filter(a => a.id !== layerId));
    setRedoStack(prev => prev.filter(a => a.id !== layerId));
  }, []);

  // Toggle layer visibility
  const toggleLayer = useCallback((layerId) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, active: !layer.active } : layer
    ));
    
    // Return the layer data for re-applying or reverting
    const layer = layers.find(l => l.id === layerId);
    return layer;
  }, [layers]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    setLayers([]);
    layerIdRef.current = 1;
  }, []);

  return {
    recordAction,
    undo,
    redo,
    removeLayer,
    toggleLayer,
    clearHistory,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    layers,
    undoCount: undoStack.length,
    redoCount: redoStack.length
  };
}

// Helper to get icon for layer type
function getLayerIcon(type) {
  switch (type) {
    case 'MATERIAL_COLOR': return '🎨';
    case 'MATERIAL_PBR': return '🖼️';
    case 'MATERIAL_GRADIENT': return '🌈';
    case 'TRANSFORM': return '📐';
    case 'VISIBILITY': return '👁️';
    default: return '📝';
  }
}