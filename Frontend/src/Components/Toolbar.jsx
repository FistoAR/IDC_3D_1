// Components/Toolbar.jsx
import React, { useState } from "react";

// SVG Icon Components for Toolbar
const ToolbarIcons = {
  Model3D: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  AutoRotate: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Wireframe: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Move: () => (
    <svg className="w-3.5 h-3.5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Rotate: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Scale: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Download: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  ),
  View: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

// Transform mode configuration with icons
const TRANSFORM_MODES = [
  { 
    mode: 'translate', 
    label: 'Move', 
    icon: ToolbarIcons.Move,
    activeColor: 'bg-green-500/30 text-green-400',
  },
  { 
    mode: 'rotate', 
    label: 'Rotate', 
    icon: ToolbarIcons.Rotate,
    activeColor: 'bg-green-500/30 text-green-400',
  },
  { 
    mode: 'scale', 
    label: 'Scale', 
    icon: ToolbarIcons.Scale,
    activeColor: 'bg-green-500/30 text-green-400',
  },
];

// Export format configuration
const EXPORT_FORMATS = [
  { format: 'glb', label: 'GLB (Binary)', color: 'text-green-400', recommended: true },
  { format: 'gltf', label: 'GLTF (JSON)', color: 'text-blue-400', recommended: false },
  { format: 'obj', label: 'OBJ', color: 'text-yellow-400', recommended: false },
  { format: 'stl', label: 'STL', color: 'text-orange-400', recommended: false },
];

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
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800/80 backdrop-blur-md p-2 rounded-xl border border-gray-700/50 shadow-xl">
      {/* Models Count Badge */}
      {modelsCount > 1 && (
        <>
          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <ToolbarIcons.Model3D />
            <span>{modelsCount} models</span>
          </div>
          <div className="h-6 w-px bg-gray-600 self-center" />
        </>
      )}

      {/* Clear Button */}
      <button
        onClick={clearModel}
        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        title="Clear all models"
      >
        <ToolbarIcons.Trash />
        <span>{modelsCount > 1 ? 'Clear All' : 'Clear'}</span>
      </button>
      
      <div className="h-6 w-px bg-gray-600 self-center" />
      
      {/* Auto Rotate Button */}
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
          autoRotate 
            ? "bg-blue-500/30 text-blue-400" 
            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
        }`}
        title="Toggle auto rotation"
      >
        <ToolbarIcons.AutoRotate />
        <span>Auto</span>
      </button>
      
      {/* Wireframe Button */}
      <button
        onClick={() => setWireframe(!wireframe)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
          wireframe 
            ? "bg-purple-500/30 text-purple-400" 
            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
        }`}
        title="Toggle wireframe mode"
      >
        <ToolbarIcons.Wireframe />
        <span>Wire</span>
      </button>
      
      <div className="h-6 w-px bg-gray-600 self-center" />
      
      {/* View Mode Button (deselect transform) */}
      <button
        onClick={() => setTransformMode('none')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
          transformMode === 'none'
            ? "bg-cyan-500/30 text-cyan-400" 
            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
        }`}
        title="View mode (no transform)"
      >
        <ToolbarIcons.View />
        <span>View</span>
      </button>

      {/* Transform Mode Buttons */}
      {TRANSFORM_MODES.map(({ mode, label, icon: Icon, activeColor }) => (
        <button
          key={mode}
          onClick={() => setTransformMode(transformMode === mode ? 'none' : mode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            transformMode === mode 
              ? activeColor
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
          }`}
          title={`${label} transform mode`}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}

      <div className="h-6 w-px bg-gray-600 self-center" />

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
          title="Export model"
        >
          {isExporting ? (
            <>
              <ToolbarIcons.Spinner />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <ToolbarIcons.Download />
              <span>Export{modelsCount > 1 ? ' All' : ''}</span>
              <ToolbarIcons.ChevronDown />
            </>
          )}
        </button>

        {/* Export Dropdown Menu */}
        {showExportMenu && !isExporting && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowExportMenu(false)}
            />
            
            {/* Menu */}
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] z-20">
              {EXPORT_FORMATS.map(({ format, label, color, recommended }) => (
                <button
                  key={format}
                  onClick={() => handleExportClick(format)}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
                  <span>{label}</span>
                  {recommended && (
                    <span className="ml-auto text-gray-500 text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded">
                      Rec
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Toolbar;