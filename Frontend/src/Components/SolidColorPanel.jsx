// Components/SolidColorPanel.jsx
import React, { useState, useCallback, useEffect } from "react";
import * as THREE from "three";

const PRESET_COLORS = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Lime', color: '#84cc16' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Fuchsia', color: '#d946ef' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'White', color: '#ffffff' },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Black', color: '#1f2937' },
];

const MATERIAL_FINISHES = [
  { name: 'Matte', metalness: 0, roughness: 0.9, icon: '🧱' },
  { name: 'Satin', metalness: 0, roughness: 0.5, icon: '🎨' },
  { name: 'Glossy', metalness: 0, roughness: 0.1, icon: '✨' },
  { name: 'Metallic', metalness: 1, roughness: 0.3, icon: '🔩' },
  { name: 'Chrome', metalness: 1, roughness: 0.05, icon: '🪞' },
  { name: 'Plastic', metalness: 0, roughness: 0.4, icon: '🧴' },
];

function SolidColorPanel({ material, materials, isGlobalMode, onUpdate }) {
  const [color, setColor] = useState('#3b82f6');
  const [finish, setFinish] = useState('Satin');
  const [metalness, setMetalness] = useState(0);
  const [roughness, setRoughness] = useState(0.5);
  const [opacity, setOpacity] = useState(1);
  const [emissive, setEmissive] = useState('#000000');
  const [emissiveIntensity, setEmissiveIntensity] = useState(0);
  const [customMode, setCustomMode] = useState(false);

  // Initialize from material
  useEffect(() => {
    if (material && !isGlobalMode) {
      const matColor = material.color ? '#' + material.color.getHexString() : '#3b82f6';
      setColor(matColor);
      setMetalness(material.metalness ?? 0);
      setRoughness(material.roughness ?? 0.5);
      setOpacity(material.opacity ?? 1);
      if (material.emissive) {
        setEmissive('#' + material.emissive.getHexString());
        setEmissiveIntensity(material.emissiveIntensity ?? 0);
      }
    }
  }, [material, isGlobalMode]);

  // Apply finish preset
  const applyFinish = (finishName) => {
    const finishData = MATERIAL_FINISHES.find(f => f.name === finishName);
    if (finishData) {
      setFinish(finishName);
      setMetalness(finishData.metalness);
      setRoughness(finishData.roughness);
      setCustomMode(false);
    }
  };

  // Apply color to material(s)
  const applyColor = useCallback(() => {
    const targetMaterials = isGlobalMode ? materials : (material ? [material] : []);
    
    targetMaterials.forEach(mat => {
      // Remove any existing texture map
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
      }
      
      // Apply solid color
      mat.color = new THREE.Color(color);
      mat.metalness = metalness;
      mat.roughness = roughness;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      
      // Apply emissive
      if (emissiveIntensity > 0) {
        mat.emissive = new THREE.Color(emissive);
        mat.emissiveIntensity = emissiveIntensity;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
      
      mat.needsUpdate = true;
    });
    
    onUpdate?.();
  }, [material, materials, isGlobalMode, color, metalness, roughness, opacity, emissive, emissiveIntensity, onUpdate]);

  // Handle custom property change
  const handleCustomChange = (setter) => (value) => {
    setter(value);
    setCustomMode(true);
    setFinish('Custom');
  };

  return (
    <div className="space-y-4">
      {/* Color Picker */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Color
        </h4>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-14 h-14 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-gray-500 transition-colors"
            />
            <div 
              className="absolute inset-1 rounded-md pointer-events-none"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:border-blue-500/50"
              placeholder="#000000"
            />
            <div className="flex gap-1">
              {/* RGB inputs */}
              {['R', 'G', 'B'].map((channel, idx) => {
                const hex = color.replace('#', '');
                const value = parseInt(hex.substr(idx * 2, 2), 16) || 0;
                return (
                  <div key={channel} className="flex-1">
                    <label className="text-[9px] text-gray-500 block mb-0.5">{channel}</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={value}
                      onChange={(e) => {
                        const newValue = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                        const hex = color.replace('#', '');
                        const r = idx === 0 ? newValue : parseInt(hex.substr(0, 2), 16);
                        const g = idx === 1 ? newValue : parseInt(hex.substr(2, 2), 16);
                        const b = idx === 2 ? newValue : parseInt(hex.substr(4, 2), 16);
                        setColor(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                      }}
                      className="w-full px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-gray-300 text-center focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Color Presets */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Presets
        </h4>
        <div className="grid grid-cols-10 gap-1">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setColor(preset.color)}
              className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 ${
                color.toLowerCase() === preset.color.toLowerCase()
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent hover:border-gray-500'
              }`}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Material Finish */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Finish
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          {MATERIAL_FINISHES.map((f) => (
            <button
              key={f.name}
              onClick={() => applyFinish(f.name)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                finish === f.name && !customMode
                  ? 'bg-blue-500/30 border border-blue-500/50'
                  : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
              }`}
            >
              <span className="text-lg mb-0.5">{f.icon}</span>
              <span className="text-[10px] text-gray-400">{f.name}</span>
            </button>
          ))}
        </div>
        {customMode && (
          <div className="text-[10px] text-amber-400 flex items-center gap-1">
            <span>⚙️</span>
            <span>Custom settings active</span>
          </div>
        )}
      </div>

      {/* Advanced Properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Properties
          </h4>
          <button
            onClick={() => {
              setCustomMode(false);
              applyFinish('Satin');
            }}
            className="text-[10px] text-gray-500 hover:text-gray-300"
          >
            Reset
          </button>
        </div>

        {/* Metalness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Metalness</label>
            <span className="text-xs text-gray-500 font-mono">{metalness.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={metalness}
            onChange={(e) => handleCustomChange(setMetalness)(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Roughness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Roughness</label>
            <span className="text-xs text-gray-500 font-mono">{roughness.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={roughness}
            onChange={(e) => handleCustomChange(setRoughness)(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Opacity</label>
            <span className="text-xs text-gray-500 font-mono">{(opacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>

      {/* Emissive (Glow) */}
      <div className="space-y-3 p-3 bg-gray-700/20 rounded-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>💡</span>
            Glow Effect
          </h4>
          <button
            onClick={() => {
              setEmissiveIntensity(emissiveIntensity > 0 ? 0 : 0.5);
              if (emissive === '#000000') setEmissive(color);
            }}
            className={`w-10 h-5 rounded-full transition-all ${
              emissiveIntensity > 0 ? "bg-yellow-500" : "bg-gray-600"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md ml-0.5 transition-transform ${
              emissiveIntensity > 0 ? "translate-x-5" : ""
            }`} />
          </button>
        </div>

        {emissiveIntensity > 0 && (
          <>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={emissive}
                onChange={(e) => setEmissive(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-600"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Intensity</label>
                  <span className="text-xs text-gray-500 font-mono">{emissiveIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={emissiveIntensity}
                  onChange={(e) => setEmissiveIntensity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
            </div>
            <button
              onClick={() => setEmissive(color)}
              className="text-[10px] text-gray-500 hover:text-gray-300"
            >
              Use main color for glow
            </button>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Preview
        </h4>
        <div className="relative h-16 rounded-lg overflow-hidden border border-gray-700">
          <div 
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                ${color} 0%, 
                ${metalness > 0.5 ? 'white' : color} 50%, 
                ${color} 100%)`,
              opacity: opacity,
              filter: roughness < 0.3 ? 'brightness(1.2)' : 'none',
            }}
          />
          {emissiveIntensity > 0 && (
            <div 
              className="absolute inset-0"
              style={{
                backgroundColor: emissive,
                opacity: emissiveIntensity * 0.3,
                mixBlendMode: 'screen',
              }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/80 text-xs font-medium px-2 py-1 bg-black/30 rounded">
              {finish}{customMode ? ' (Custom)' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyColor}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
      >
        Apply Color {isGlobalMode ? `to All (${materials?.length || 0})` : ''}
      </button>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setColor('#ffffff');
            setMetalness(0);
            setRoughness(0.5);
            setOpacity(1);
            setEmissiveIntensity(0);
          }}
          className="flex-1 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
        >
          Reset All
        </button>
        <button
          onClick={() => {
            // Generate random color
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            setColor(randomColor);
          }}
          className="flex-1 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-1"
        >
          <span>🎲</span>
          Random
        </button>
      </div>
    </div>
  );
}

export default SolidColorPanel;