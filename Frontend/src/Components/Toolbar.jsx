// Components/Toolbar.jsx
import React, { useState } from "react";

function Toolbar({ 
  model, 
  autoRotate, 
  setAutoRotate, 
  wireframe, 
  setWireframe, 
  transformMode, 
  setTransformMode, 
  clearModel,
  onExport,
  isExporting,
  modelsCount = 1
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!model) return null;

  const handleExportClick = (format) => {
    onExport(format);
    setShowExportMenu(false);
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-gray-700/50">
      {/* Models Count Badge */}
      {modelsCount > 1 && (
        <>
          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {modelsCount} models
          </div>
          <div className="h-6 w-px bg-gray-600" />
        </>
      )}

      <button
        onClick={clearModel}
        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {modelsCount > 1 ? 'Clear All' : 'Clear'}
      </button>
      
      <div className="h-6 w-px bg-gray-600" />
      
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          autoRotate ? "bg-blue-500/30 text-blue-400" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
        }`}
      >
        Auto Rotate
      </button>
      
      <button
        onClick={() => setWireframe(!wireframe)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          wireframe ? "bg-purple-500/30 text-purple-400" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
        }`}
      >
        Wireframe
      </button>
      
      <div className="h-6 w-px bg-gray-600" />
      
      {['translate', 'rotate', 'scale'].map((mode) => (
        <button
          key={mode}
          onClick={() => setTransformMode(transformMode === mode ? 'none' : mode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            transformMode === mode 
              ? "bg-green-500/30 text-green-400" 
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {mode === 'translate' && '↔ Move'}
          {mode === 'rotate' && '↻ Rotate'}
          {mode === 'scale' && '⤡ Scale'}
        </button>
      ))}

      <div className="h-6 w-px bg-gray-600" />

      {/* Export Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={isExporting}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isExporting 
              ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
              : "bg-emerald-500/30 text-emerald-400 hover:bg-emerald-500/40"
          }`}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export {modelsCount > 1 ? 'All' : ''}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {showExportMenu && !isExporting && (
          <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
            <button
              onClick={() => handleExportClick('glb')}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-green-400">●</span>
              GLB (Binary)
              <span className="ml-auto text-gray-500 text-[10px]">Rec</span>
            </button>
            <button
              onClick={() => handleExportClick('gltf')}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-blue-400">●</span>
              GLTF (JSON)
            </button>
            <button
              onClick={() => handleExportClick('obj')}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-yellow-400">●</span>
              OBJ
            </button>
            <button
              onClick={() => handleExportClick('stl')}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-orange-400">●</span>
              STL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Toolbar;