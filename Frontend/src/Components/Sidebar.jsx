// Components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { checkServerHealth, convertFile } from "../services/converterService";
import MaterialsList from "./MaterialsList";
import LightControls from "./LightControls";

// File size limit: 30MB
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB in bytes
const MAX_FILE_SIZE_MB = 30;

function Sidebar({
  loading, loadingStatus, fileName, error, warning, model, isDragging,
  transformMode, setTransformMode, zoom, setZoom, handleZoomIn, handleZoomOut, handleResetCamera,
  wireframe, setWireframe, autoRotate, setAutoRotate, showGrid, setShowGrid, showBase, setShowBase,
  bgColor, setBgColor, handleFile: parentHandleFile, handleDrop: parentHandleDrop, handleDragOver, handleDragLeave, clearModel,
  onExport, isExporting, exportStatus, bakeTransforms, setBakeTransforms, modelStats,
  lights, setLights, onFocusMaterial, setLoading, setLoadingStatus, setError
}) {
  const [serverStatus, setServerStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedSection, setExpandedSection] = useState({
    upload: true, export: true, transform: true, view: true, lights: false,
  });

  // Polling server health (skip if busy)
  useEffect(() => {
    checkServerHealth().then(setServerStatus);
    const interval = setInterval(() => checkServerHealth().then(setServerStatus), 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section) => setExpandedSection(prev => ({ ...prev, [section]: !prev[section] }));

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validate file before processing
  const validateFile = (file) => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large: ${formatFileSize(file.size)}\nMaximum allowed: ${MAX_FILE_SIZE_MB}MB\n\nPlease compress or simplify your model.`
      };
    }

    // Check file extension
    const validExtensions = ['.step', '.stp', '.gltf', '.glb', '.fbx', '.obj', '.stl', '.dae', '.ply', '.3mf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      return { 
        valid: false, 
        error: `Unsupported format: ${ext}\nSupported: ${validExtensions.join(', ')}`
      };
    }

    return { valid: true };
  };

  // Custom File Handler to support progress
  const processFile = async (file) => {
    if (!file) return;

    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      if (setError) setError(validation.error);
      return;
    }
    
    // Use parent's loading state setters if passed, or local logging
    if (setLoading) setLoading(true);
    if (setError) setError(null);
    setUploadProgress(0);
    
    try {
      const result = await convertFile(file, (msg, percent) => {
        if (setLoadingStatus) setLoadingStatus(msg);
        setUploadProgress(percent);
      });
      
      // Pass result back to main app
      if (parentHandleFile) parentHandleFile({ 
        target: { files: [file] }, // Mock event
        url: result.url,
        fileName: file.name 
      }, result.url);
      
    } catch (err) {
      if (setError) setError(err.message);
      if (setLoading) setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const onFileSelect = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const SectionHeader = ({ title, icon, section, badge }) => (
    <button onClick={() => toggleSection(section)} className="w-full flex items-center justify-between text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider hover:text-white transition-colors">
      <span className="flex items-center gap-2">{icon}{title}{badge && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] normal-case">{badge}</span>}</span>
      <svg className={`w-4 h-4 transition-transform ${expandedSection[section] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
  );

  return (
    <div className="w-80 min-w-80 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col overflow-y-auto custom-scrollbar h-full">
      
      {/* Header */}
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">3D Viewer</h1>
            <p className="text-xs text-gray-400">STEP • OBJ • FBX • GLTF</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className={`flex items-center gap-2 text-xs ${serverStatus?.status === 'ok' ? 'text-green-400' : serverStatus?.status === 'busy' ? 'text-orange-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${serverStatus?.status === 'ok' ? 'bg-green-400' : serverStatus?.status === 'busy' ? 'bg-orange-400' : 'bg-red-400'}`} />
            Server: {serverStatus?.status === 'ok' ? 'Online' : serverStatus?.status === 'busy' ? 'Processing' : 'Offline'}
          </div>
          {model && <div className="text-xs text-gray-500">Model loaded ✓</div>}
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader title="Upload Model" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>} section="upload" />
        {expandedSection.upload && (
          <>
            <label 
              className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging ? "border-blue-400 bg-blue-500/10 scale-[1.02]" : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/30"}`} 
              onDrop={onDrop} 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave}
            >
              <input type="file" className="hidden" accept=".step,.stp,.gltf,.glb,.fbx,.obj,.stl,.dae,.ply,.3mf" onChange={onFileSelect} disabled={loading} />
              
              {loading ? (
                <div className="flex flex-col items-center w-full px-4">
                  <div className="w-full h-2 bg-gray-700 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-blue-400 font-medium text-sm">Processing...</p>
                  <p className="text-xs text-gray-500 mt-1 text-center">{loadingStatus || `${uploadProgress}%`}</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">Drop 3D/CAD file here</p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-600 mt-2">Max size: {MAX_FILE_SIZE_MB}MB</p>
                </>
              )}
            </label>
            
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
          key={model.uuid} 
          model={model} 
          onMaterialUpdate={() => {}} 
          onFocusMaterial={onFocusMaterial}
        />
      )}

      {/* Lighting Control */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader title="Lighting" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} section="lights" />
        {expandedSection.lights && <LightControls lights={lights} setLights={setLights} />}
      </div>

      {/* Export Section */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader title="Export Model" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>} section="export" badge={transformMode !== 'none' ? "Modified" : null} />
          {expandedSection.export && (
            <>
              <div className="mb-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm text-gray-300">Bake Transforms</span>
                    <p className="text-xs text-gray-500 mt-0.5">Apply changes to geometry</p>
                  </div>
                  <button onClick={() => setBakeTransforms(!bakeTransforms)} className={`w-11 h-6 rounded-full transition-all flex-shrink-0 ${bakeTransforms ? "bg-green-500" : "bg-gray-600"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${bakeTransforms ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
              <button onClick={() => onExport('glb')} disabled={isExporting} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${isExporting ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"}`}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">Export as GLB</span>
                </span>
                <span className="text-xs opacity-75 bg-white/10 px-2 py-0.5 rounded">Rec</span>
              </button>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button onClick={() => onExport('gltf')} className="bg-gray-700/50 rounded p-2 text-xs hover:bg-gray-700 transition-colors">GLTF</button>
                <button onClick={() => onExport('obj')} className="bg-gray-700/50 rounded p-2 text-xs hover:bg-gray-700 transition-colors">OBJ</button>
                <button onClick={() => onExport('stl')} className="bg-gray-700/50 rounded p-2 text-xs hover:bg-gray-700 transition-colors">STL</button>
              </div>
              {exportStatus && (
                <div className="mt-3 p-2.5 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400">
                  <p className="text-xs">{exportStatus}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* View Controls */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader title="View Settings" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} section="view" />
        {expandedSection.view && (
          <div className="space-y-3">
            {[
              { label: 'Wireframe', value: wireframe, setter: setWireframe },
              { label: 'Auto Rotate', value: autoRotate, setter: setAutoRotate },
              { label: 'Show Grid', value: showGrid, setter: setShowGrid },
              { label: 'Show Base', value: showBase, setter: setShowBase }
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{label}</span>
                <button onClick={() => setter(!value)} className={`w-11 h-6 rounded-full transition-all ${value ? "bg-blue-500" : "bg-gray-600"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${value ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Background</span>
                <div className="flex gap-1.5">
                  {[{ color: "#1a1a2e" }, { color: "#0f172a" }, { color: "#18181b" }].map(({ color }) => (
                    <button 
                      key={color} 
                      onClick={() => setBgColor(color)} 
                      className={`w-6 h-6 rounded-full border-2 transition-all ${bgColor === color ? "border-white scale-110" : "border-transparent"}`} 
                      style={{ backgroundColor: color }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transform */}
      {model && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader title="Tools" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>} section="transform" />
          {expandedSection.transform && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: 'none', label: 'View' },
                { mode: 'translate', label: 'Move' },
                { mode: 'rotate', label: 'Rotate' },
                { mode: 'scale', label: 'Scale' }
              ].map(({ mode, label }) => (
                <button 
                  key={mode} 
                  onClick={() => setTransformMode(mode)} 
                  className={`p-2 rounded-lg text-xs transition-colors ${transformMode === mode ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {model && (
        <div className="p-5 border-t border-gray-700/50">
          <button 
            onClick={clearModel} 
            className="w-full px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Clear Model
          </button>
        </div>
      )}
      
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(55, 65, 81, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.7); }
      `}</style>
    </div>
  );
}

export default Sidebar;