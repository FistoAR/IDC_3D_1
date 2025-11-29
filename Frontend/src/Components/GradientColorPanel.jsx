// Components/GradientColorPanel.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

const GRADIENT_TYPES = {
  linear: {
    name: 'Linear',
    icon: '↔️',
    description: 'Straight line gradient'
  },
  radial: {
    name: 'Radial',
    icon: '🔘',
    description: 'Center outward gradient'
  },
  angular: {
    name: 'Angular',
    icon: '🔄',
    description: 'Rotational gradient'
  },
  diamond: {
    name: 'Diamond',
    icon: '💎',
    description: 'Diamond shape gradient'
  },
  stripe: {
    name: 'Stripe',
    icon: '📊',
    description: 'Striped pattern'
  }
};

const PRESET_GRADIENTS = [
  { name: 'Rainbow', colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'] },
  { name: 'Sunset', colors: ['#ff512f', '#f09819', '#ff5e62'] },
  { name: 'Ocean', colors: ['#2193b0', '#6dd5ed', '#00d4ff'] },
  { name: 'Forest', colors: ['#134e5e', '#71b280', '#2d5016'] },
  { name: 'Fire', colors: ['#f12711', '#f5af19', '#fffc00'] },
  { name: 'Purple', colors: ['#667eea', '#764ba2', '#f093fb'] },
  { name: 'Mint', colors: ['#11998e', '#38ef7d', '#00d9ff'] },
  { name: 'Gold', colors: ['#f7971e', '#ffd200', '#ffa751'] },
  { name: 'Steel', colors: ['#485563', '#29323c', '#6a7b8b'] },
  { name: 'Neon', colors: ['#00ff87', '#60efff', '#ff00ff'] },
  { name: 'Warm', colors: ['#ff9a9e', '#fecfef', '#fad0c4'] },
  { name: 'Cool', colors: ['#a8edea', '#fed6e3', '#96e6a1'] },
];

function GradientColorPanel({ material, meshes, onUpdate }) {
  const [gradientType, setGradientType] = useState('linear');
  const [colors, setColors] = useState(['#ff0000', '#00ff00', '#0000ff']);
  const [angle, setAngle] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [repeat, setRepeat] = useState(1);
  const [smoothness, setSmoothness] = useState(1);
  const [reverse, setReverse] = useState(false);
  const canvasRef = useRef(null);

  // Generate gradient texture
  const generateGradientTexture = useCallback(() => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const colorStops = reverse ? [...colors].reverse() : colors;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    switch (gradientType) {
      case 'linear': {
        const angleRad = (angle * Math.PI) / 180;
        const x1 = size / 2 - Math.cos(angleRad) * size;
        const y1 = size / 2 - Math.sin(angleRad) * size;
        const x2 = size / 2 + Math.cos(angleRad) * size;
        const y2 = size / 2 + Math.sin(angleRad) * size;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        colorStops.forEach((color, i) => {
          gradient.addColorStop(i / (colorStops.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        break;
      }
      
      case 'radial': {
        const centerX = size / 2 + offset.x * size / 2;
        const centerY = size / 2 + offset.y * size / 2;
        const radius = (size / 2) * scale;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        colorStops.forEach((color, i) => {
          gradient.addColorStop(i / (colorStops.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        break;
      }
      
      case 'angular': {
        const centerX = size / 2;
        const centerY = size / 2;
        const imageData = ctx.createImageData(size, size);
        
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            let angleAtPoint = Math.atan2(y - centerY, x - centerX);
            angleAtPoint = (angleAtPoint + Math.PI) / (2 * Math.PI);
            angleAtPoint = (angleAtPoint + angle / 360) % 1;
            angleAtPoint = (angleAtPoint * repeat) % 1;
            
            // Apply smoothness
            angleAtPoint = Math.pow(angleAtPoint, 1 / smoothness);
            
            const colorIndex = angleAtPoint * (colorStops.length - 1);
            const lowerIndex = Math.floor(colorIndex);
            const upperIndex = Math.min(lowerIndex + 1, colorStops.length - 1);
            const t = colorIndex - lowerIndex;
            
            const color1 = hexToRgb(colorStops[lowerIndex]);
            const color2 = hexToRgb(colorStops[upperIndex]);
            
            const idx = (y * size + x) * 4;
            imageData.data[idx] = color1.r + (color2.r - color1.r) * t;
            imageData.data[idx + 1] = color1.g + (color2.g - color1.g) * t;
            imageData.data[idx + 2] = color1.b + (color2.b - color1.b) * t;
            imageData.data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        break;
      }
      
      case 'diamond': {
        const centerX = size / 2;
        const centerY = size / 2;
        const imageData = ctx.createImageData(size, size);
        
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = Math.abs(x - centerX) / (size / 2);
            const dy = Math.abs(y - centerY) / (size / 2);
            let dist = (dx + dy) * scale;
            dist = (dist * repeat) % 1;
            
            const colorIndex = dist * (colorStops.length - 1);
            const lowerIndex = Math.floor(colorIndex);
            const upperIndex = Math.min(lowerIndex + 1, colorStops.length - 1);
            const t = colorIndex - lowerIndex;
            
            const color1 = hexToRgb(colorStops[lowerIndex]);
            const color2 = hexToRgb(colorStops[upperIndex]);
            
            const idx = (y * size + x) * 4;
            imageData.data[idx] = color1.r + (color2.r - color1.r) * t;
            imageData.data[idx + 1] = color1.g + (color2.g - color1.g) * t;
            imageData.data[idx + 2] = color1.b + (color2.b - color1.b) * t;
            imageData.data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        break;
      }
      
      case 'stripe': {
        const stripeWidth = size / (repeat * 2);
        const angleRad = (angle * Math.PI) / 180;
        
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(angleRad);
        ctx.translate(-size, -size);
        
        for (let i = 0; i < repeat * 4; i++) {
          const colorIndex = i % colorStops.length;
          ctx.fillStyle = colorStops[colorIndex];
          ctx.fillRect(i * stripeWidth, 0, stripeWidth, size * 2);
        }
        ctx.restore();
        break;
      }
      
      default:
        break;
    }

    return canvas;
  }, [gradientType, colors, angle, scale, offset, repeat, smoothness, reverse]);

  // Helper function
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Apply gradient to material
  const applyGradient = useCallback(() => {
    const canvas = generateGradientTexture();
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    // Apply to material
    if (material) {
      material.map = texture;
      material.color = new THREE.Color(0xffffff);
      material.needsUpdate = true;
    }

    // Apply to all meshes if provided
    if (meshes) {
      meshes.forEach(mesh => {
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(mat => {
            mat.map = texture.clone();
            mat.color = new THREE.Color(0xffffff);
            mat.needsUpdate = true;
          });
        }
      });
    }

    onUpdate?.();
  }, [material, meshes, generateGradientTexture, onUpdate]);

  // Update color at index
  const updateColor = (index, color) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  // Add color stop
  const addColorStop = () => {
    if (colors.length < 8) {
      setColors([...colors, '#ffffff']);
    }
  };

  // Remove color stop
  const removeColorStop = (index) => {
    if (colors.length > 2) {
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  // Apply preset
  const applyPreset = (preset) => {
    setColors([...preset.colors]);
  };

  // Preview canvas
  const [previewUrl, setPreviewUrl] = useState('');
  
  useEffect(() => {
    const canvas = generateGradientTexture();
    setPreviewUrl(canvas.toDataURL());
  }, [generateGradientTexture]);

  return (
    <div className="space-y-4">
      {/* Gradient Type Selector */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Gradient Type
        </h4>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(GRADIENT_TYPES).map(([key, { name, icon, description }]) => (
            <button
              key={key}
              onClick={() => setGradientType(key)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                gradientType === key
                  ? 'bg-blue-500/30 border border-blue-500/50'
                  : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
              }`}
              title={description}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[9px] text-gray-400 mt-0.5">{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Preview
        </h4>
        <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-gray-700">
          <img 
            src={previewUrl} 
            alt="Gradient Preview" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Color Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Color Stops ({colors.length})
          </h4>
          <button
            onClick={addColorStop}
            disabled={colors.length >= 8}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Color
          </button>
        </div>
        
        <div className="space-y-2">
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(index, e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-gray-600"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateColor(index, e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-gray-300 font-mono"
              />
              {colors.length > 2 && (
                <button
                  onClick={() => removeColorStop(index)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gradient Presets */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Presets
        </h4>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_GRADIENTS.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className="group relative h-8 rounded overflow-hidden border border-gray-700 hover:border-gray-500 transition-all"
              title={preset.name}
              style={{
                background: `linear-gradient(90deg, ${preset.colors.join(', ')})`
              }}
            >
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] text-white font-medium">{preset.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Settings
        </h4>

        {/* Angle (for linear, angular, stripe) */}
        {['linear', 'angular', 'stripe'].includes(gradientType) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Angle</label>
              <span className="text-xs text-gray-500 font-mono">{angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        )}

        {/* Scale (for radial, diamond) */}
        {['radial', 'diamond'].includes(gradientType) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Scale</label>
              <span className="text-xs text-gray-500 font-mono">{scale.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>
        )}

        {/* Repeat */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Repeat</label>
            <span className="text-xs text-gray-500 font-mono">{repeat}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={repeat}
            onChange={(e) => setRepeat(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Smoothness (for angular) */}
        {gradientType === 'angular' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Smoothness</label>
              <span className="text-xs text-gray-500 font-mono">{smoothness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={smoothness}
              onChange={(e) => setSmoothness(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>
        )}

        {/* Offset (for radial) */}
        {gradientType === 'radial' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Offset X</label>
                <span className="text-xs text-gray-500 font-mono">{offset.x.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={offset.x}
                onChange={(e) => setOffset({ ...offset, x: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Offset Y</label>
                <span className="text-xs text-gray-500 font-mono">{offset.y.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={offset.y}
                onChange={(e) => setOffset({ ...offset, y: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Reverse Toggle */}
        <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
          <span className="text-xs text-gray-400">Reverse Direction</span>
          <button
            onClick={() => setReverse(!reverse)}
            className={`w-10 h-5 rounded-full transition-all ${
              reverse ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md ml-0.5 transition-transform ${
              reverse ? "translate-x-5" : ""
            }`} />
          </button>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyGradient}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
      >
        Apply Gradient
      </button>
    </div>
  );
}

export default GradientColorPanel;