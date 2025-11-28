// Sidebar.jsx - Complete updated version
import React, { useEffect, useState } from "react";
import { FORMAT_INFO } from "../modelLoader";
import { checkServerHealth } from "../services/converterService";
import MaterialsList from "./MaterialsList";

function Sidebar({
  loading,
  loadingStatus,
  fileName,
  error,
  warning,
  model,
  isDragging,
  transformMode,
  setTransformMode,
  zoom,
  setZoom,
  handleZoomIn,
  handleZoomOut,
  handleResetCamera,
  wireframe,
  setWireframe,
  autoRotate,
  setAutoRotate,
  showGrid,
  setShowGrid,
  showBase,
  setShowBase,
  bgColor,
  setBgColor,
  handleFile,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  clearModel,
}) {
  const [serverStatus, setServerStatus] = useState(null);
  const [materialsKey, setMaterialsKey] = useState(0);

  useEffect(() => {
    checkServerHealth().then(setServerStatus);
    const interval = setInterval(() => {
      checkServerHealth().then(setServerStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset materials key when model changes
  useEffect(() => {
    setMaterialsKey(prev => prev + 1);
  }, [model]);

  return (
    <div className="w-80 min-w-80 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              3D CAD Viewer
            </h1>
            <p className="text-xs text-gray-400">STEP • Blender • Maya • GLTF</p>
          </div>
        </div>
        
        {/* Server Status */}
        <div className="mt-3 space-y-1">
          <div className={`flex items-center gap-2 text-xs ${
            serverStatus?.status === 'ok' ? 'text-green-400' : 'text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              serverStatus?.status === 'ok' ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            Server: {serverStatus?.status === 'ok' ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-5 border-b border-gray-700/50">
        <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          Upload Model
        </h2>
        
        <label
          className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
            isDragging 
              ? "border-blue-400 bg-blue-500/10" 
              : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/30"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            className="hidden"
            accept=".step,.stp,.gltf,.glb,.fbx,.obj,.stl,.dae,.ply,.3mf"
            onChange={handleFile}
          />
          
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-blue-400 font-medium text-sm">Processing...</p>
              <p className="text-xs text-gray-500 mt-1 text-center px-4">{loadingStatus}</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-gray-300 font-medium">Drop 3D/CAD file here</p>
              <p className="text-xs text-gray-500 mt-1">STEP, Blender, Maya, GLTF...</p>
            </>
          )}
        </label>

        {/* Status Messages */}
        {fileName && !error && !loading && (
          <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-green-400 truncate">{fileName}</span>
            </div>
          </div>
        )}

        {warning && (
          <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-xs text-yellow-400">{warning}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span className="text-xs text-red-400 whitespace-pre-line">{error}</span>
          </div>
        )}
      </div>

      {/* Materials List - NEW SECTION */}
      {model && (
        <MaterialsList 
          key={materialsKey}
          model={model} 
          onMaterialUpdate={() => {
            // Trigger re-render if needed
          }}
        />
      )}

      {/* Transform Controls */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Transform Tools
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { mode: 'none', label: 'View', icon: '👁️' },
              { mode: 'translate', label: 'Move', icon: '↔️' },
              { mode: 'rotate', label: 'Rotate', icon: '🔄' },
              { mode: 'scale', label: 'Scale', icon: '⤢' },
            ].map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setTransformMode(mode)}
                className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                  transformMode === mode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Zoom Control
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={handleZoomOut} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="20"
                max="300"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-center text-xs text-gray-400 mt-1">{zoom}%</p>
            </div>
            <button onClick={handleZoomIn} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleResetCamera}
            className="w-full mt-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs font-medium"
          >
            Reset View
          </button>
        </div>
      )}

      {/* View Controls */}
      <div className="p-5 border-b border-gray-700/50">
        <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          View Controls
        </h2>
        
        <div className="space-y-3">
          {[
            { label: 'Wireframe', value: wireframe, setter: setWireframe },
            { label: 'Auto Rotate', value: autoRotate, setter: setAutoRotate },
            { label: 'Show Grid', value: showGrid, setter: setShowGrid },
            { label: 'Show Base', value: showBase, setter: setShowBase },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{label}</span>
              <button
                onClick={() => setter(!value)}
                className={`w-11 h-6 rounded-full transition-all ${value ? "bg-blue-500" : "bg-gray-600"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${value ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Background</span>
            <div className="flex gap-1.5">
              {["#1a1a2e", "#0f172a", "#18181b", "#1e1b4b", "#042f2e"].map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className={`w-5 h-5 rounded-full border-2 ${bgColor === color ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="p-5 flex-1">
        <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          Supported Formats
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMAT_INFO.map((format) => (
            <div
              key={format.ext}
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${format.color}`}
            >
              <span className="text-xs">{format.icon}</span>
              <span className="text-xs font-medium">{format.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Model Button */}
      {model && (
        <div className="p-5 border-t border-gray-700/50">
          <button
            onClick={clearModel}
            className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Clear Model
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500 text-center">
          🖱️ Rotate • 🔄 Scroll: Zoom • Right-click: Pan
        </p>
      </div>

      <style jsx="true">{`
/* Custom Scrollbar Styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(107, 114, 128, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.7);
}

/* Color input styling */
input[type="color"] {
  -webkit-appearance: none;
  border: none;
  padding: 0;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
      `}</style>

    </div>
  );
}

export default Sidebar;