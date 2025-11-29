// Components/Sidebar.jsx
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
  // Export props
  onExport,
  isExporting,
  exportStatus,
  bakeTransforms,
  setBakeTransforms,
  modelStats,
}) {
  const [serverStatus, setServerStatus] = useState(null);
  const [materialsKey, setMaterialsKey] = useState(0);
  const [expandedSection, setExpandedSection] = useState({
    upload: true,
    export: true,
    transform: true,
    view: true,
    formats: false,
  });

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

  const toggleSection = (section) => {
    setExpandedSection(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, icon, section, badge }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
        {badge && (
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] normal-case">
            {badge}
          </span>
        )}
      </span>
      <svg 
        className={`w-4 h-4 transition-transform ${expandedSection[section] ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

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
            <p className="text-xs text-gray-400">STEP • OBJ • FBX • GLTF</p>
          </div>
        </div>
        
        {/* Server Status */}
        <div className="mt-3 flex items-center justify-between">
          <div className={`flex items-center gap-2 text-xs ${
            serverStatus?.status === 'ok' ? 'text-green-400' : 'text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              serverStatus?.status === 'ok' ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            Server: {serverStatus?.status === 'ok' ? 'Online' : 'Offline'}
          </div>
          {model && (
            <div className="text-xs text-gray-500">
              Model loaded ✓
            </div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader 
          title="Upload Model" 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>}
          section="upload"
        />
        
        {expandedSection.upload && (
          <>
            <label
              className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                isDragging 
                  ? "border-blue-400 bg-blue-500/10 scale-[1.02]" 
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
                  <p className="text-xs text-gray-500 mt-1">or click to browse</p>
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
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-yellow-400">{warning}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-red-400 whitespace-pre-line">{error}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Materials List */}
      {model && (
        <MaterialsList 
          key={materialsKey}
          model={model} 
          onMaterialUpdate={() => {}}
        />
      )}

      {/* Export Section */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader 
            title="Export Model" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>}
            section="export"
            badge={transformMode !== 'none' ? "Modified" : null}
          />
          
          {expandedSection.export && (
            <>
              {modelStats && (
                <div className="mb-3 p-3 bg-gray-700/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vertices:</span>
                      <span className="text-gray-300 font-mono">{modelStats.vertices?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Triangles:</span>
                      <span className="text-gray-300 font-mono">{modelStats.triangles?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Meshes:</span>
                      <span className="text-gray-300 font-mono">{modelStats.meshCount || 'N/A'}</span>
                    </div>
                    {modelStats.boundingBox?.size && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size:</span>
                        <span className="text-gray-300 font-mono text-[10px]">
                          {modelStats.boundingBox.size.x?.toFixed(1)} × {modelStats.boundingBox.size.y?.toFixed(1)} × {modelStats.boundingBox.size.z?.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm text-gray-300">Bake Transforms</span>
                    <p className="text-xs text-gray-500 mt-0.5">Apply position/rotation/scale to geometry</p>
                  </div>
                  <button
                    onClick={() => setBakeTransforms(!bakeTransforms)}
                    className={`w-11 h-6 rounded-full transition-all flex-shrink-0 ${bakeTransforms ? "bg-green-500" : "bg-gray-600"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${bakeTransforms ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                {transformMode !== 'none' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Transform mode active - changes will be exported</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => onExport('glb')}
                  disabled={isExporting}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${
                    isExporting
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isExporting ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    <span className="text-sm">Export as GLB</span>
                  </span>
                  <span className="text-xs opacity-75 bg-white/10 px-2 py-0.5 rounded">Recommended</span>
                </button>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onExport('gltf')}
                    disabled={isExporting}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                    <span>GLTF</span>
                  </button>
                  <button
                    onClick={() => onExport('obj')}
                    disabled={isExporting}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span>OBJ</span>
                  </button>
                  <button
                    onClick={() => onExport('stl')}
                    disabled={isExporting}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                    <span>STL</span>
                  </button>
                </div>
              </div>
              
              {exportStatus && (
                <div className={`mt-3 p-2.5 rounded-lg border ${
                  exportStatus.includes('✓') 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <p className={`text-xs flex items-center gap-2 ${
                    exportStatus.includes('✓') ? 'text-green-400' : 'text-blue-400'
                  }`}>
                    {isExporting && (
                      <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4"/>
                      </svg>
                    )}
                    {exportStatus}
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {bakeTransforms ? "Transforms will be applied to geometry" : "Transforms stored as metadata"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Transform Controls */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader 
            title="Transform Tools" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>}
            section="transform"
          />
          
          {expandedSection.transform && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: 'none', label: 'View', icon: '👁️', color: 'bg-gray-600' },
                { mode: 'translate', label: 'Move', icon: '↔️', color: 'bg-blue-500' },
                { mode: 'rotate', label: 'Rotate', icon: '🔄', color: 'bg-purple-500' },
                { mode: 'scale', label: 'Scale', icon: '⤢', color: 'bg-orange-500' },
              ].map(({ mode, label, icon, color }) => (
                <button
                  key={mode}
                  onClick={() => setTransformMode(mode)}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                    transformMode === mode 
                      ? `${color} text-white shadow-lg` 
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zoom Controls */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Zoom Control
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleZoomOut} 
              className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
            >
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
              <p className="text-center text-xs text-gray-400 mt-1 font-mono">{zoom}%</p>
            </div>
            <button 
              onClick={handleZoomIn} 
              className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleResetCamera}
            className="w-full mt-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset View
          </button>
        </div>
      )}

      {/* View Controls */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader 
          title="View Settings" 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>}
          section="view"
        />
        
        {expandedSection.view && (
          <div className="space-y-3">
            {[
              { label: 'Wireframe', value: wireframe, setter: setWireframe, icon: '🔲' },
              { label: 'Auto Rotate', value: autoRotate, setter: setAutoRotate, icon: '🔄' },
              { label: 'Show Grid', value: showGrid, setter: setShowGrid, icon: '📐' },
              { label: 'Show Base', value: showBase, setter: setShowBase, icon: '⬛' },
            ].map(({ label, value, setter, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <span>{icon}</span>
                  {label}
                </span>
                <button
                  onClick={() => setter(!value)}
                  className={`w-11 h-6 rounded-full transition-all ${value ? "bg-blue-500" : "bg-gray-600"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${value ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <span>🎨</span>
                  Background
                </span>
                <div className="flex gap-1.5">
                  {[
                    { color: "#1a1a2e", name: "Dark Blue" },
                    { color: "#0f172a", name: "Slate" },
                    { color: "#18181b", name: "Zinc" },
                    { color: "#1e1b4b", name: "Indigo" },
                    { color: "#042f2e", name: "Teal" },
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      onClick={() => setBgColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                        bgColor === color ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <div className="p-5 flex-1">
        <SectionHeader 
          title="Supported Formats" 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>}
          section="formats"
        />
        
        {expandedSection.formats && (
          <div className="grid grid-cols-2 gap-1.5">
            {FORMAT_INFO.map((format) => (
              <div
                key={format.ext}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors ${format.color}`}
              >
                <span className="text-sm">{format.icon}</span>
                <div>
                  <span className="text-xs font-medium">{format.name}</span>
                  <span className="text-[10px] text-gray-500 block">{format.ext}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Model Button */}
      {model && (
        <div className="p-5 border-t border-gray-700/50">
          <button
            onClick={clearModel}
            className="w-full px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Model
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span>🖱️</span> Rotate
          </span>
          <span className="flex items-center gap-1">
            <span>🔄</span> Scroll: Zoom
          </span>
          <span className="flex items-center gap-1">
            <span>⌨️</span> Right-click: Pan
          </span>
        </div>
      </div>

      <style jsx="true">{`
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
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}

export default Sidebar;