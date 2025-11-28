// src/Components/MaterialsList.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// Gradient Generator Utility
class GradientTextureGenerator {
  static createLinearGradient(colors, stops, width = 512, height = 512, angle = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Calculate gradient coordinates based on angle
    const angleRad = (angle * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;
    const gradientLength = Math.sqrt(width * width + height * height) / 2;
    
    const x1 = centerX - Math.cos(angleRad) * gradientLength;
    const y1 = centerY - Math.sin(angleRad) * gradientLength;
    const x2 = centerX + Math.cos(angleRad) * gradientLength;
    const y2 = centerY + Math.sin(angleRad) * gradientLength;
    
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    
    colors.forEach((color, index) => {
      const stop = stops[index] !== undefined ? stops[index] : index / (colors.length - 1);
      gradient.addColorStop(stop, color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  static createRadialGradient(colors, stops, width = 512, height = 512, centerX = 0.5, centerY = 0.5, radius = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const cx = width * centerX;
    const cy = height * centerY;
    const r = Math.max(width, height) * radius;
    
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    
    colors.forEach((color, index) => {
      const stop = stops[index] !== undefined ? stops[index] : index / (colors.length - 1);
      gradient.addColorStop(stop, color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  static createConicGradient(colors, stops, width = 512, height = 512, centerX = 0.5, centerY = 0.5, startAngle = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const cx = width * centerX;
    const cy = height * centerY;
    
    // Check if conicGradient is supported
    if (ctx.createConicGradient) {
      const gradient = ctx.createConicGradient(startAngle * Math.PI / 180, cx, cy);
      
      colors.forEach((color, index) => {
        const stop = stops[index] !== undefined ? stops[index] : index / (colors.length - 1);
        gradient.addColorStop(stop, color);
      });
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback: manual conic gradient
      const imageData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let angle = Math.atan2(y - cy, x - cx) + Math.PI;
          angle = (angle + startAngle * Math.PI / 180) % (2 * Math.PI);
          const t = angle / (2 * Math.PI);
          
          const color = interpolateColors(colors, stops, t);
          const idx = (y * width + x) * 4;
          imageData.data[idx] = color.r;
          imageData.data[idx + 1] = color.g;
          imageData.data[idx + 2] = color.b;
          imageData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}

// Helper function to interpolate between colors
function interpolateColors(colors, stops, t) {
  if (colors.length === 1) {
    return hexToRgb(colors[0]);
  }
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i] && t <= stops[i + 1]) {
      const localT = (t - stops[i]) / (stops[i + 1] - stops[i]);
      const c1 = hexToRgb(colors[i]);
      const c2 = hexToRgb(colors[i + 1]);
      return {
        r: Math.round(c1.r + (c2.r - c1.r) * localT),
        g: Math.round(c1.g + (c2.g - c1.g) * localT),
        b: Math.round(c1.b + (c2.b - c1.b) * localT),
      };
    }
  }
  return hexToRgb(colors[colors.length - 1]);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 128, g: 128, b: 128 };
}

// Gradient Preview Component
function GradientPreview({ type, colors, stops, angle, centerX, centerY, radius, size = 60 }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let gradient;
    
    if (type === 'linear') {
      const angleRad = (angle * Math.PI) / 180;
      const centerXPos = width / 2;
      const centerYPos = height / 2;
      const gradientLength = Math.sqrt(width * width + height * height) / 2;
      
      const x1 = centerXPos - Math.cos(angleRad) * gradientLength;
      const y1 = centerYPos - Math.sin(angleRad) * gradientLength;
      const x2 = centerXPos + Math.cos(angleRad) * gradientLength;
      const y2 = centerYPos + Math.sin(angleRad) * gradientLength;
      
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else if (type === 'radial') {
      const cx = width * centerX;
      const cy = height * centerY;
      const r = Math.max(width, height) * radius;
      gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else if (type === 'conic' && ctx.createConicGradient) {
      const cx = width * centerX;
      const cy = height * centerY;
      gradient = ctx.createConicGradient(angle * Math.PI / 180, cx, cy);
    }
    
    if (gradient) {
      colors.forEach((color, index) => {
        const stop = stops[index] !== undefined ? stops[index] : index / (colors.length - 1);
        gradient.addColorStop(Math.max(0, Math.min(1, stop)), color);
      });
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }, [type, colors, stops, angle, centerX, centerY, radius]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      className="rounded border border-gray-600"
      style={{ width: size, height: size }}
    />
  );
}

// Color Stop Editor Component
function ColorStopEditor({ colors, stops, onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const trackRef = useRef(null);
  
  const handleAddColor = () => {
    if (colors.length >= 8) return;
    
    const newStop = 0.5;
    const newColors = [...colors];
    const newStops = [...stops];
    
    // Find insertion point
    let insertIndex = newStops.findIndex(s => s > newStop);
    if (insertIndex === -1) insertIndex = newStops.length;
    
    // Interpolate color at this position
    const prevIdx = Math.max(0, insertIndex - 1);
    const nextIdx = Math.min(colors.length - 1, insertIndex);
    const c1 = hexToRgb(colors[prevIdx]);
    const c2 = hexToRgb(colors[nextIdx]);
    const t = (newStop - stops[prevIdx]) / (stops[nextIdx] - stops[prevIdx]) || 0.5;
    
    const newColor = `#${Math.round(c1.r + (c2.r - c1.r) * t).toString(16).padStart(2, '0')}${Math.round(c1.g + (c2.g - c1.g) * t).toString(16).padStart(2, '0')}${Math.round(c1.b + (c2.b - c1.b) * t).toString(16).padStart(2, '0')}`;
    
    newColors.splice(insertIndex, 0, newColor);
    newStops.splice(insertIndex, 0, newStop);
    
    onChange(newColors, newStops);
  };
  
  const handleRemoveColor = (index) => {
    if (colors.length <= 2) return;
    
    const newColors = colors.filter((_, i) => i !== index);
    const newStops = stops.filter((_, i) => i !== index);
    
    // Normalize stops
    newStops[0] = 0;
    newStops[newStops.length - 1] = 1;
    
    onChange(newColors, newStops);
  };
  
  const handleColorChange = (index, color) => {
    const newColors = [...colors];
    newColors[index] = color;
    onChange(newColors, stops);
  };
  
  const handleStopDrag = (e, index) => {
    if (!trackRef.current || index === 0 || index === colors.length - 1) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    const newStops = [...stops];
    newStops[index] = Math.max(stops[index - 1] + 0.01, Math.min(stops[index + 1] - 0.01, x));
    
    onChange(colors, newStops);
  };
  
  return (
    <div className="space-y-2">
      {/* Gradient Track */}
      <div 
        ref={trackRef}
        className="relative h-6 rounded border border-gray-600 cursor-crosshair"
        style={{
          background: `linear-gradient(to right, ${colors.map((c, i) => `${c} ${stops[i] * 100}%`).join(', ')})`
        }}
        onClick={(e) => {
          if (dragIndex === null && colors.length < 8) {
            const rect = trackRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            
            // Add new color at clicked position
            const newColors = [...colors];
            const newStops = [...stops];
            
            let insertIndex = newStops.findIndex(s => s > x);
            if (insertIndex === -1) insertIndex = newStops.length;
            
            const prevIdx = Math.max(0, insertIndex - 1);
            const nextIdx = Math.min(colors.length - 1, insertIndex);
            const c1 = hexToRgb(colors[prevIdx]);
            const c2 = hexToRgb(colors[nextIdx]);
            const t = stops[nextIdx] !== stops[prevIdx] 
              ? (x - stops[prevIdx]) / (stops[nextIdx] - stops[prevIdx]) 
              : 0.5;
            
            const newColor = `#${Math.round(c1.r + (c2.r - c1.r) * t).toString(16).padStart(2, '0')}${Math.round(c1.g + (c2.g - c1.g) * t).toString(16).padStart(2, '0')}${Math.round(c1.b + (c2.b - c1.b) * t).toString(16).padStart(2, '0')}`;
            
            newColors.splice(insertIndex, 0, newColor);
            newStops.splice(insertIndex, 0, x);
            
            onChange(newColors, newStops);
          }
        }}
      >
        {/* Color Stops */}
        {colors.map((color, index) => (
          <div
            key={index}
            className={`absolute top-full mt-1 transform -translate-x-1/2 cursor-${index === 0 || index === colors.length - 1 ? 'default' : 'ew-resize'}`}
            style={{ left: `${stops[index] * 100}%` }}
            onMouseDown={(e) => {
              if (index !== 0 && index !== colors.length - 1) {
                setDragIndex(index);
                const handleMouseMove = (e) => handleStopDrag(e, index);
                const handleMouseUp = () => {
                  setDragIndex(null);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }
            }}
          >
            <div 
              className="w-3 h-3 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: color }}
            />
          </div>
        ))}
      </div>
      
      {/* Color Inputs */}
      <div className="grid grid-cols-4 gap-1 mt-4">
        {colors.map((color, index) => (
          <div key={index} className="relative group">
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              className="w-full h-8 rounded cursor-pointer bg-transparent border border-gray-600"
            />
            {colors.length > 2 && (
              <button
                onClick={() => handleRemoveColor(index)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {colors.length < 8 && (
          <button
            onClick={handleAddColor}
            className="h-8 rounded border-2 border-dashed border-gray-600 text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors flex items-center justify-center"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

// Preset Gradients
const PRESET_GRADIENTS = {
  linear: [
    { name: 'Sunset', colors: ['#FF512F', '#F09819'], stops: [0, 1] },
    { name: 'Ocean', colors: ['#2193b0', '#6dd5ed'], stops: [0, 1] },
    { name: 'Forest', colors: ['#134E5E', '#71B280'], stops: [0, 1] },
    { name: 'Purple', colors: ['#8E2DE2', '#4A00E0'], stops: [0, 1] },
    { name: 'Fire', colors: ['#f12711', '#f5af19'], stops: [0, 1] },
    { name: 'Ice', colors: ['#74ebd5', '#ACB6E5'], stops: [0, 1] },
    { name: 'Rainbow', colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'], stops: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    { name: 'Gold', colors: ['#F7971E', '#FFD200'], stops: [0, 1] },
    { name: 'Metal', colors: ['#304352', '#d7d2cc'], stops: [0, 1] },
    { name: 'Rose', colors: ['#ff9a9e', '#fecfef'], stops: [0, 1] },
    { name: 'Night', colors: ['#0f0c29', '#302b63', '#24243e'], stops: [0, 0.5, 1] },
    { name: 'Neon', colors: ['#00f260', '#0575e6'], stops: [0, 1] },
  ],
  radial: [
    { name: 'Sun', colors: ['#FFD200', '#F7971E', '#ff5f6d'], stops: [0, 0.5, 1] },
    { name: 'Glow', colors: ['#ffffff', '#6dd5ed', '#2193b0'], stops: [0, 0.4, 1] },
    { name: 'Energy', colors: ['#f5af19', '#f12711', '#000000'], stops: [0, 0.6, 1] },
    { name: 'Portal', colors: ['#8E2DE2', '#4A00E0', '#000000'], stops: [0, 0.5, 1] },
    { name: 'Orb', colors: ['#ffffff', '#74ebd5', '#134E5E'], stops: [0, 0.3, 1] },
    { name: 'Core', colors: ['#FFD200', '#FF512F', '#1a1a2e'], stops: [0, 0.4, 1] },
  ],
  conic: [
    { name: 'Wheel', colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff', '#ff0000'], stops: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1] },
    { name: 'Spiral', colors: ['#2193b0', '#6dd5ed', '#2193b0'], stops: [0, 0.5, 1] },
    { name: 'Vortex', colors: ['#8E2DE2', '#4A00E0', '#8E2DE2'], stops: [0, 0.5, 1] },
  ]
};

function MaterialsList({ model, onMaterialUpdate }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [colorMode, setColorMode] = useState('solid'); // 'solid', 'linear', 'radial', 'conic'
  
  // Gradient state
  const [gradientColors, setGradientColors] = useState(['#6366F1', '#EC4899']);
  const [gradientStops, setGradientStops] = useState([0, 1]);
  const [gradientAngle, setGradientAngle] = useState(0);
  const [gradientCenterX, setGradientCenterX] = useState(0.5);
  const [gradientCenterY, setGradientCenterY] = useState(0.5);
  const [gradientRadius, setGradientRadius] = useState(0.7);
  
  // Store original materials for reset
  const originalMaterialsRef = useRef(new Map());

  // Extract materials from model
  useEffect(() => {
    if (!model) {
      setMaterials([]);
      originalMaterialsRef.current.clear();
      return;
    }

    const materialMap = new Map();
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        
        mats.forEach((mat) => {
          const key = mat.uuid;
          if (!materialMap.has(key)) {
            // Store original material properties
            if (!originalMaterialsRef.current.has(key)) {
              originalMaterialsRef.current.set(key, {
                color: mat.color ? mat.color.clone() : null,
                map: mat.map,
                metalness: mat.metalness,
                roughness: mat.roughness,
                opacity: mat.opacity,
              });
            }
            
            materialMap.set(key, {
              uuid: mat.uuid,
              name: mat.name || child.name || `Material ${materialMap.size + 1}`,
              material: mat,
              meshName: child.name,
              color: mat.color ? '#' + mat.color.getHexString() : '#808080',
              type: mat.type,
              metalness: mat.metalness ?? 0,
              roughness: mat.roughness ?? 1,
              opacity: mat.opacity ?? 1,
              transparent: mat.transparent ?? false,
              hasGradient: !!mat.map && mat.map.isCanvasTexture,
            });
          }
        });
      }
    });

    setMaterials(Array.from(materialMap.values()));
  }, [model]);

  const handleColorChange = (materialData, newColor) => {
    if (materialData.material.color) {
      // Remove any gradient texture
      materialData.material.map = null;
      materialData.material.color.set(newColor);
      materialData.material.needsUpdate = true;
      
      setMaterials(prev => prev.map(m => 
        m.uuid === materialData.uuid 
          ? { ...m, color: newColor, hasGradient: false }
          : m
      ));
      
      onMaterialUpdate?.();
    }
  };

  const applyGradient = useCallback((materialData, type, colors, stops, options = {}) => {
    let texture;
    
    switch (type) {
      case 'linear':
        texture = GradientTextureGenerator.createLinearGradient(
          colors, stops, 512, 512, options.angle || 0
        );
        break;
      case 'radial':
        texture = GradientTextureGenerator.createRadialGradient(
          colors, stops, 512, 512, 
          options.centerX || 0.5, 
          options.centerY || 0.5, 
          options.radius || 0.7
        );
        break;
      case 'conic':
        texture = GradientTextureGenerator.createConicGradient(
          colors, stops, 512, 512,
          options.centerX || 0.5,
          options.centerY || 0.5,
          options.angle || 0
        );
        break;
      default:
        return;
    }
    
    materialData.material.map = texture;
    materialData.material.color.set('#ffffff');
    materialData.material.needsUpdate = true;
    
    setMaterials(prev => prev.map(m => 
      m.uuid === materialData.uuid 
        ? { ...m, hasGradient: true, gradientType: type }
        : m
    ));
    
    onMaterialUpdate?.();
  }, [onMaterialUpdate]);

  const handleApplyGradient = (materialData) => {
    applyGradient(materialData, colorMode, gradientColors, gradientStops, {
      angle: gradientAngle,
      centerX: gradientCenterX,
      centerY: gradientCenterY,
      radius: gradientRadius,
    });
  };

  const handlePresetGradient = (materialData, preset, type) => {
    setGradientColors(preset.colors);
    setGradientStops(preset.stops);
    applyGradient(materialData, type, preset.colors, preset.stops, {
      angle: gradientAngle,
      centerX: gradientCenterX,
      centerY: gradientCenterY,
      radius: gradientRadius,
    });
  };

  const handleMetalnessChange = (materialData, value) => {
    if ('metalness' in materialData.material) {
      materialData.material.metalness = value;
      materialData.material.needsUpdate = true;
      
      setMaterials(prev => prev.map(m => 
        m.uuid === materialData.uuid 
          ? { ...m, metalness: value }
          : m
      ));
      
      onMaterialUpdate?.();
    }
  };

  const handleRoughnessChange = (materialData, value) => {
    if ('roughness' in materialData.material) {
      materialData.material.roughness = value;
      materialData.material.needsUpdate = true;
      
      setMaterials(prev => prev.map(m => 
        m.uuid === materialData.uuid 
          ? { ...m, roughness: value }
          : m
      ));
      
      onMaterialUpdate?.();
    }
  };

  const handleOpacityChange = (materialData, value) => {
    materialData.material.opacity = value;
    materialData.material.transparent = value < 1;
    materialData.material.needsUpdate = true;
    
    setMaterials(prev => prev.map(m => 
      m.uuid === materialData.uuid 
        ? { ...m, opacity: value, transparent: value < 1 }
        : m
    ));
    
    onMaterialUpdate?.();
  };

  const handleResetMaterial = (materialData) => {
    const original = originalMaterialsRef.current.get(materialData.uuid);
    if (original) {
      if (original.color) materialData.material.color.copy(original.color);
      materialData.material.map = original.map;
      if (original.metalness !== undefined) materialData.material.metalness = original.metalness;
      if (original.roughness !== undefined) materialData.material.roughness = original.roughness;
      materialData.material.opacity = original.opacity;
      materialData.material.transparent = original.opacity < 1;
      materialData.material.needsUpdate = true;
      
      setMaterials(prev => prev.map(m => 
        m.uuid === materialData.uuid 
          ? { 
              ...m, 
              color: original.color ? '#' + original.color.getHexString() : '#808080',
              metalness: original.metalness ?? 0,
              roughness: original.roughness ?? 1,
              opacity: original.opacity ?? 1,
              hasGradient: false,
            }
          : m
      ));
      
      onMaterialUpdate?.();
    }
  };

  const presetColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#FFFFFF', '#9CA3AF', '#374151'
  ];

  if (!model || materials.length === 0) {
    return null;
  }

  return (
    <div className="p-5 border-b border-gray-700/50">
      <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
        <span>🎨</span>
        Materials ({materials.length})
      </h2>
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {materials.map((mat) => (
          <div 
            key={mat.uuid}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
              selectedMaterial?.uuid === mat.uuid 
                ? 'bg-blue-500/20 border-blue-500/50' 
                : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
            }`}
            onClick={() => setSelectedMaterial(
              selectedMaterial?.uuid === mat.uuid ? null : mat
            )}
          >
            <div className="flex items-center gap-2">
              {/* Color/Gradient Preview */}
              <div 
                className="w-8 h-8 rounded border border-gray-500 flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: mat.hasGradient ? 'transparent' : mat.color }}
              >
                {mat.hasGradient && (
                  <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500" />
                )}
              </div>
              
              {/* Material Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate font-medium">
                  {mat.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {mat.hasGradient ? `${mat.gradientType || 'Gradient'}` : mat.type.replace('Material', '')}
                </p>
              </div>
              
              {/* Expand Icon */}
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  selectedMaterial?.uuid === mat.uuid ? 'rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Expanded Controls */}
            {selectedMaterial?.uuid === mat.uuid && (
              <div className="mt-3 space-y-4" onClick={(e) => e.stopPropagation()}>
                
                {/* Color Mode Tabs */}
                <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                  {[
                    { id: 'solid', label: 'Solid', icon: '■' },
                    { id: 'linear', label: 'Linear', icon: '▬' },
                    { id: 'radial', label: 'Radial', icon: '◉' },
                    { id: 'conic', label: 'Conic', icon: '◐' },
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => setColorMode(id)}
                      className={`flex-1 px-2 py-1 rounded text-[0.65vw] text-xs font-medium transition-all ${
                        colorMode === id 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <span className="mr-1">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Solid Color Mode */}
                {colorMode === 'solid' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Solid Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={mat.color}
                        onChange={(e) => handleColorChange(mat, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border border-gray-600"
                      />
                      <input
                        type="text"
                        value={mat.color.toUpperCase()}
                        onChange={(e) => {
                          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                            handleColorChange(mat, e.target.value);
                          }
                        }}
                        className="flex-1 px-2 py-2 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 uppercase"
                      />
                    </div>
                    
                    {/* Preset Colors */}
                    <div className="grid grid-cols-10 gap-1 mt-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(mat, color)}
                          className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                            mat.color.toUpperCase() === color 
                              ? 'border-white scale-110' 
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Linear Gradient Mode */}
                {colorMode === 'linear' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <GradientPreview 
                        type="linear"
                        colors={gradientColors}
                        stops={gradientStops}
                        angle={gradientAngle}
                        size={60}
                      />
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">Angle: {gradientAngle}°</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={gradientAngle}
                          onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                    
                    <ColorStopEditor 
                      colors={gradientColors}
                      stops={gradientStops}
                      onChange={(colors, stops) => {
                        setGradientColors(colors);
                        setGradientStops(stops);
                      }}
                    />
                    
                    {/* Preset Gradients */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Presets</label>
                      <div className="grid grid-cols-4 gap-1">
                        {PRESET_GRADIENTS.linear.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => handlePresetGradient(mat, preset, 'linear')}
                            className="h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                            style={{
                              background: `linear-gradient(to right, ${preset.colors.map((c, i) => `${c} ${preset.stops[i] * 100}%`).join(', ')})`
                            }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleApplyGradient(mat)}
                      className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded text-xs font-medium text-white transition-colors"
                    >
                      Apply Linear Gradient
                    </button>
                  </div>
                )}

                {/* Radial Gradient Mode */}
                {colorMode === 'radial' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <GradientPreview 
                        type="radial"
                        colors={gradientColors}
                        stops={gradientStops}
                        centerX={gradientCenterX}
                        centerY={gradientCenterY}
                        radius={gradientRadius}
                        size={60}
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-gray-400">Center X: {(gradientCenterX * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={gradientCenterX}
                            onChange={(e) => setGradientCenterX(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Center Y: {(gradientCenterY * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={gradientCenterY}
                            onChange={(e) => setGradientCenterY(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Radius: {(gradientRadius * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0.1"
                            max="1.5"
                            step="0.01"
                            value={gradientRadius}
                            onChange={(e) => setGradientRadius(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <ColorStopEditor 
                      colors={gradientColors}
                      stops={gradientStops}
                      onChange={(colors, stops) => {
                        setGradientColors(colors);
                        setGradientStops(stops);
                      }}
                    />
                    
                    {/* Preset Gradients */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Presets</label>
                      <div className="grid grid-cols-3 gap-1">
                        {PRESET_GRADIENTS.radial.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => handlePresetGradient(mat, preset, 'radial')}
                            className="h-8 rounded border border-gray-600 hover:border-gray-400 transition-colors overflow-hidden"
                            title={preset.name}
                          >
                            <div 
                              className="w-full h-full"
                              style={{
                                background: `radial-gradient(circle, ${preset.colors.map((c, i) => `${c} ${preset.stops[i] * 100}%`).join(', ')})`
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleApplyGradient(mat)}
                      className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 rounded text-xs font-medium text-white transition-colors"
                    >
                      Apply Radial Gradient
                    </button>
                  </div>
                )}

                {/* Conic Gradient Mode */}
                {colorMode === 'conic' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <GradientPreview 
                        type="conic"
                        colors={gradientColors}
                        stops={gradientStops}
                        centerX={gradientCenterX}
                        centerY={gradientCenterY}
                        angle={gradientAngle}
                        size={60}
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-gray-400">Start Angle: {gradientAngle}°</label>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={gradientAngle}
                            onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Center X: {(gradientCenterX * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={gradientCenterX}
                            onChange={(e) => setGradientCenterX(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Center Y: {(gradientCenterY * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={gradientCenterY}
                            onChange={(e) => setGradientCenterY(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <ColorStopEditor 
                      colors={gradientColors}
                      stops={gradientStops}
                      onChange={(colors, stops) => {
                        setGradientColors(colors);
                        setGradientStops(stops);
                      }}
                    />
                    
                    {/* Preset Gradients */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Presets</label>
                      <div className="grid grid-cols-3 gap-1">
                        {PRESET_GRADIENTS.conic.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => handlePresetGradient(mat, preset, 'conic')}
                            className="h-8 rounded border border-gray-600 hover:border-gray-400 transition-colors overflow-hidden"
                            title={preset.name}
                          >
                            <div 
                              className="w-full h-full"
                              style={{
                                background: `conic-gradient(${preset.colors.map((c, i) => `${c} ${preset.stops[i] * 360}deg`).join(', ')})`
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleApplyGradient(mat)}
                      className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded text-xs font-medium text-white transition-colors"
                    >
                      Apply Conic Gradient
                    </button>
                  </div>
                )}
                
                {/* Material Properties (Always Visible) */}
                <div className="pt-3 border-t border-gray-700/50 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase">Material Properties</h4>
                  
                  {/* Metalness Slider */}
                  {mat.material.metalness !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-gray-400">Metalness</label>
                        <span className="text-xs text-gray-500">{(mat.metalness * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={mat.metalness}
                        onChange={(e) => handleMetalnessChange(mat, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}
                  
                  {/* Roughness Slider */}
                  {mat.material.roughness !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-gray-400">Roughness</label>
                        <span className="text-xs text-gray-500">{(mat.roughness * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={mat.roughness}
                        onChange={(e) => handleRoughnessChange(mat, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                  )}
                  
                  {/* Opacity Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-gray-400">Opacity</label>
                      <span className="text-xs text-gray-500">{(mat.opacity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mat.opacity}
                      onChange={(e) => handleOpacityChange(mat, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
                
                {/* Reset Button */}
                <button
                  onClick={() => handleResetMaterial(mat)}
                  className="w-full px-2 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs text-gray-300 transition-colors"
                >
                  Reset Material
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bulk Actions */}
      {materials.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 mb-2">Bulk Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
                materials.forEach(mat => handleColorChange(mat, randomColor));
              }}
              className="px-2 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs text-gray-300"
            >
              Uniform Color
            </button>
            <button
              onClick={() => {
                materials.forEach((mat, i) => {
                  handleColorChange(mat, presetColors[i % presetColors.length]);
                });
              }}
              className="px-2 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs text-gray-300"
            >
              Rainbow
            </button>
            <button
              onClick={() => {
                const preset = PRESET_GRADIENTS.linear[Math.floor(Math.random() * PRESET_GRADIENTS.linear.length)];
                materials.forEach(mat => {
                  applyGradient(mat, 'linear', preset.colors, preset.stops, { angle: Math.random() * 360 });
                });
              }}
              className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded text-xs text-white"
            >
              Random Linear
            </button>
            <button
              onClick={() => {
                const preset = PRESET_GRADIENTS.radial[Math.floor(Math.random() * PRESET_GRADIENTS.radial.length)];
                materials.forEach(mat => {
                  applyGradient(mat, 'radial', preset.colors, preset.stops, { 
                    centerX: 0.5, centerY: 0.5, radius: 0.7 
                  });
                });
              }}
              className="px-2 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded text-xs text-white"
            >
              Random Radial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialsList;