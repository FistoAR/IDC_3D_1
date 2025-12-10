// Components/LightControls.jsx
import React from "react";

function LightControls({ lights, setLights }) {
  const updateLight = (type, key, value) => {
    setLights(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }));
  };

  const ToggleSwitch = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full transition-all ${value ? "bg-blue-500" : "bg-gray-600"}`}
    >
      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md ml-1 transition-transform ${value ? "translate-x-4" : ""}`} />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Ambient Light */}
      <div className="space-y-2 pb-2 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase">Ambient Light</span>
          <ToggleSwitch 
            value={lights.ambient.visible} 
            onChange={(v) => updateLight('ambient', 'visible', v)} 
          />
        </div>
        {lights.ambient.visible && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Intensity</span><span>{lights.ambient.intensity.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.1" 
              value={lights.ambient.intensity} 
              onChange={(e) => updateLight('ambient', 'intensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg accent-blue-500" 
            />
          </div>
        )}
      </div>

      {/* Directional Light */}
      <div className="space-y-2 pb-2 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase">Sun Light</span>
          <ToggleSwitch 
            value={lights.directional.visible} 
            onChange={(v) => updateLight('directional', 'visible', v)} 
          />
        </div>
        {lights.directional.visible && (
        <>
          {/* Intensity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Intensity</span>
              <span>{lights.directional.intensity.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="5" 
              step="0.1" 
              value={lights.directional.intensity} 
              onChange={(e) => updateLight('directional', 'intensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg accent-yellow-500" 
            />
          </div>
          
          {/* Color Picker - Perfect Square */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Color</span>
            <div className="relative w-6 h-6 rounded-md overflow-hidden border border-gray-600 hover:border-gray-500 transition-colors">
              <input 
                type="color" 
                value={lights.directional.color} 
                onChange={(e) => updateLight('directional', 'color', e.target.value)}
                className="absolute inset-[-2px] w-[calc(100%+4px)] h-[calc(100%+4px)] cursor-pointer border-none p-0 bg-transparent
                  [&::-webkit-color-swatch-wrapper]:p-0 
                  [&::-webkit-color-swatch]:border-none 
                  [&::-moz-color-swatch]:border-none" 
              />
            </div>
          </div>
        </>
      )}
      </div>

      {/* Point Light */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase">Point Light</span>
          <ToggleSwitch 
            value={lights.point.visible} 
            onChange={(v) => updateLight('point', 'visible', v)} 
          />
        </div>
        {lights.point.visible && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Intensity</span><span>{lights.point.intensity.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="5" step="0.1" 
              value={lights.point.intensity} 
              onChange={(e) => updateLight('point', 'intensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg accent-orange-500" 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default LightControls;