// Components/Sidebar.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  checkServerHealth, 
  convertFile, 
  cancelCurrentUpload, 
  LOADING_PHASES 
} from "../services/converterService";
import MaterialsList from "./MaterialsList";
import LightControls from "./LightControls";
import ModelList from "./ModelList";

// File size limit: 30MB
const MAX_FILE_SIZE = 30 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 30;

// Loading phase configurations
const PHASE_CONFIG = {
  [LOADING_PHASES.UPLOADING]: {
    icon: 'upload',
    color: 'blue',
    title: 'Uploading',
    canCancel: true
  },
  [LOADING_PHASES.PROCESSING]: {
    icon: 'cog',
    color: 'purple',
    title: 'Processing',
    canCancel: false
  },
  [LOADING_PHASES.LOADING_MODEL]: {
    icon: 'cube',
    color: 'green',
    title: 'Loading Model',
    canCancel: false
  }
};

function Sidebar({
  // Loading states
  loading, 
  loadingStatus, 
  fileName, 
  error, 
  warning, 
  isDragging,
  setLoading, 
  setLoadingStatus, 
  setError,
  
  // Multi-model props
  models = [],
  selectedModelId,
  onSelectModel,
  onDeleteModel,
  onToggleVisibility,
  model, // Current selected model scene
  
  // Transform
  transformMode, 
  setTransformMode,
  
  // View controls
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
  
  // File handling
  handleFile: parentHandleFile, 
  handleDrop: parentHandleDrop, 
  handleDragOver, 
  handleDragLeave, 
  clearModel,
  clearAllModels,
  
  // Export
  onExport, 
  isExporting, 
  exportStatus, 
  bakeTransforms, 
  setBakeTransforms, 
  
  // Stats
  modelStats,
  totalStats,
  
  // Lighting
  lights, 
  setLights, 
  
  // Material selection
  onFocusMaterial,
  selectedMaterialId,
  onSelectMaterial,
  onClearMaterialSelection,
  materialTransformMode,
  setMaterialTransformMode,
  
  // Undo
  undoHistoryCount = 0,
  onUndo
}) {
  const [serverStatus, setServerStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(LOADING_PHASES.IDLE);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [processingTime, setProcessingTime] = useState(0);
  const [expandedSection, setExpandedSection] = useState({
    upload: true, 
    models: true,
    export: true, 
    transform: true, 
    view: true, 
    lights: false,
  });

  const abortControllerRef = useRef(null);
  const processingTimerRef = useRef(null);

  // Polling server health
  useEffect(() => {
    checkServerHealth().then(setServerStatus);
    const interval = setInterval(() => {
      if (loadingPhase === LOADING_PHASES.IDLE) {
        checkServerHealth().then(setServerStatus);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loadingPhase]);

  // Processing timer
  useEffect(() => {
    if (loadingPhase === LOADING_PHASES.PROCESSING) {
      setProcessingTime(0);
      processingTimerRef.current = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    }
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, [loadingPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleSection = (section) => setExpandedSection(prev => ({ ...prev, [section]: !prev[section] }));

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const validateFile = useCallback((file) => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large: ${formatFileSize(file.size)}\nMaximum allowed: ${MAX_FILE_SIZE_MB}MB\n\nPlease compress or simplify your model.`
      };
    }

    const validExtensions = ['.step', '.stp', '.gltf', '.glb', '.fbx', '.obj', '.stl', '.dae', '.ply', '.3mf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      return { 
        valid: false, 
        error: `Unsupported format: ${ext}\nSupported: ${validExtensions.join(', ')}`
      };
    }

    return { valid: true };
  }, []);

  const resetLoadingState = useCallback(() => {
    setLoadingPhase(LOADING_PHASES.IDLE);
    setUploadProgress(0);
    setLoadingMessage('');
    setProcessingTime(0);
    if (setLoading) setLoading(false);
    if (setLoadingStatus) setLoadingStatus('');
  }, [setLoading, setLoadingStatus]);

  const handleCancel = useCallback(() => {
    cancelCurrentUpload();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resetLoadingState();
  }, [resetLoadingState]);

  const processFile = async (file) => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      if (setError) setError(validation.error);
      return;
    }

    abortControllerRef.current = new AbortController();
    
    if (setLoading) setLoading(true);
    if (setError) setError(null);
    setUploadProgress(0);
    setLoadingPhase(LOADING_PHASES.UPLOADING);
    setLoadingMessage('Starting upload...');
    
    try {
      const result = await convertFile(
        file, 
        (phase, percent, message) => {
          setLoadingPhase(phase);
          setUploadProgress(percent);
          setLoadingMessage(message);
          if (setLoadingStatus) setLoadingStatus(message);
        },
        {},
        abortControllerRef.current.signal
      );
      
      if (parentHandleFile) {
        parentHandleFile({ 
          target: { files: [file] },
          url: result.url,
          fileName: file.name 
        }, result.url);
      }
      
      setLoadingPhase(LOADING_PHASES.COMPLETE);
      
      setTimeout(() => {
        resetLoadingState();
      }, 500);
      
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        if (setError) setError(err.message);
        setLoadingPhase(LOADING_PHASES.ERROR);
      }
      resetLoadingState();
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (loadingPhase !== LOADING_PHASES.IDLE) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Process multiple files
      Array.from(files).forEach((file, index) => {
        setTimeout(() => processFile(file), index * 500);
      });
    }
  };

  const onFileSelect = (e) => {
    if (loadingPhase !== LOADING_PHASES.IDLE) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file, index) => {
        setTimeout(() => processFile(file), index * 500);
      });
    }
    e.target.value = '';
  };

  const isLoading = loadingPhase !== LOADING_PHASES.IDLE && loadingPhase !== LOADING_PHASES.COMPLETE;
  const currentPhaseConfig = PHASE_CONFIG[loadingPhase] || {};

  // Loading Icon Component
  const LoadingIcon = ({ phase }) => {
    const iconClass = "w-6 h-6";
    
    switch (phase) {
      case LOADING_PHASES.UPLOADING:
        return (
          <svg className={`${iconClass} text-blue-400 animate-bounce`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case LOADING_PHASES.PROCESSING:
        return (
          <svg className={`${iconClass} text-purple-400 animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case LOADING_PHASES.LOADING_MODEL:
        return (
          <svg className={`${iconClass} text-green-400 animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Progress Ring Component
  const ProgressRing = ({ progress, size = 48, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`transition-all duration-300 ${
            loadingPhase === LOADING_PHASES.UPLOADING ? 'text-blue-500' :
            loadingPhase === LOADING_PHASES.PROCESSING ? 'text-purple-500' :
            'text-green-500'
          }`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
    );
  };

  const SectionHeader = ({ title, icon, section, badge, count }) => (
    <button 
      onClick={() => toggleSection(section)} 
      className="w-full flex items-center justify-between text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
        {count !== undefined && (
          <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded text-[10px] normal-case">
            {count}
          </span>
        )}
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
    <div className="w-80 min-w-80 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col overflow-y-auto custom-scrollbar h-full">
      
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
              3D Viewer
            </h1>
            <p className="text-xs text-gray-400">Multi-Model Support</p>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className={`flex items-center gap-2 text-xs ${
            serverStatus?.status === 'ok' ? 'text-green-400' : 
            serverStatus?.status === 'busy' || isLoading ? 'text-orange-400' : 
            'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              serverStatus?.status === 'ok' && !isLoading ? 'bg-green-400' : 
              serverStatus?.status === 'busy' || isLoading ? 'bg-orange-400 animate-pulse' : 
              'bg-red-400'
            }`} />
            Server: {
              isLoading ? 'Processing' :
              serverStatus?.status === 'ok' ? 'Online' : 
              serverStatus?.status === 'busy' ? 'Busy' : 
              'Offline'
            }
          </div>
          {models.length > 0 && !isLoading && (
            <div className="text-xs text-gray-500">
              {models.length} model{models.length !== 1 ? 's' : ''} loaded
            </div>
          )}
        </div>

        {/* Total Stats Summary */}
        {totalStats && totalStats.models > 0 && (
          <div className="mt-3 p-2 bg-gray-700/30 rounded-lg">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Vertices:</span>
                <span className="text-gray-300 font-medium">{formatNumber(totalStats.vertices)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Triangles:</span>
                <span className="text-gray-300 font-medium">{formatNumber(totalStats.triangles)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Meshes:</span>
                <span className="text-gray-300 font-medium">{totalStats.meshes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Materials:</span>
                <span className="text-gray-300 font-medium">{totalStats.materials}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader 
          title="Upload Models" 
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          } 
          section="upload" 
        />
        
        {expandedSection.upload && (
          <>
            <label 
              className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl transition-all duration-300 ${
                isLoading 
                  ? "border-gray-600 bg-gray-700/30 cursor-not-allowed" 
                  : isDragging 
                    ? "border-blue-400 bg-blue-500/10 scale-[1.02] cursor-pointer" 
                    : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/30 cursor-pointer"
              }`} 
              onDrop={onDrop} 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave}
            >
              <input 
                type="file" 
                className="hidden" 
                accept=".step,.stp,.gltf,.glb,.fbx,.obj,.stl,.dae,.ply,.3mf" 
                onChange={onFileSelect} 
                disabled={isLoading}
                multiple
              />
              
              {isLoading ? (
                <div className="flex flex-col items-center w-full px-6">
                  <div className="relative mb-3">
                    <ProgressRing 
                      progress={loadingPhase === LOADING_PHASES.PROCESSING ? 100 : uploadProgress} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <LoadingIcon phase={loadingPhase} />
                    </div>
                  </div>
                  
                  <p className={`font-semibold text-sm ${
                    loadingPhase === LOADING_PHASES.UPLOADING ? 'text-blue-400' :
                    loadingPhase === LOADING_PHASES.PROCESSING ? 'text-purple-400' :
                    'text-green-400'
                  }`}>
                    {currentPhaseConfig.title || 'Loading'}
                  </p>
                  
                  <div className="w-full h-1.5 bg-gray-700 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        loadingPhase === LOADING_PHASES.UPLOADING ? 'bg-blue-500' :
                        loadingPhase === LOADING_PHASES.PROCESSING ? 'bg-purple-500 animate-pulse' :
                        'bg-green-500'
                      }`} 
                      style={{ 
                        width: loadingPhase === LOADING_PHASES.PROCESSING 
                          ? '100%' 
                          : `${uploadProgress}%` 
                      }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {loadingMessage || 'Please wait...'}
                  </p>
                  
                  {loadingPhase === LOADING_PHASES.PROCESSING && processingTime > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Time: {formatTime(processingTime)}
                    </p>
                  )}
                  
                  {currentPhaseConfig.canCancel && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancel();
                      }}
                      className="mt-3 px-4 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Cancel Upload
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700/50 to-gray-600/50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">Drop 3D files here</p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse (multiple allowed)</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-500">
                      Max {MAX_FILE_SIZE_MB}MB each
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-500">
                      STEP, GLTF, OBJ, STL, FBX
                    </span>
                  </div>
                </>
              )}
            </label>
            
            {/* Error Message */}
            {error && !isLoading && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-fadeIn">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-400 font-medium">Upload Failed</p>
                    <p className="text-xs text-red-400/70 mt-1 whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Model List - Multiple Models Management (No Duplicate Option) */}
      {models && models.length > 0 && !isLoading && (
        <ModelList
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          onDeleteModel={onDeleteModel}
          onToggleVisibility={onToggleVisibility}
        />
      )}

      {/* Materials List */}
      {model && !isLoading && (
        <MaterialsList 
          key={model.uuid} 
          model={model} 
          onMaterialUpdate={() => {}} 
          onFocusMaterial={onFocusMaterial}
          selectedMaterialId={selectedMaterialId}
          onSelectMaterial={onSelectMaterial}
          onClearMaterialSelection={onClearMaterialSelection}
          materialTransformMode={materialTransformMode}
          setMaterialTransformMode={setMaterialTransformMode}
        />
      )}

      {/* Lighting Control */}
      <div className="p-5 border-b border-gray-700/50">
        <SectionHeader 
          title="Lighting" 
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          } 
          section="lights" 
        />
        {expandedSection.lights && <LightControls lights={lights} setLights={setLights} />}
      </div>

      {/* Export Section */}
      {models.length > 0 && !isLoading && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader 
            title="Export" 
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            } 
            section="export" 
            badge={transformMode !== 'none' ? "Modified" : null}
            count={models.length > 1 ? `${models.length} models` : undefined}
          />
          {expandedSection.export && (
            <>
              {/* Export Options */}
              <div className="mb-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm text-gray-300">Bake Transforms</span>
                    <p className="text-xs text-gray-500 mt-0.5">Apply changes to geometry</p>
                  </div>
                  <button 
                    onClick={() => setBakeTransforms(!bakeTransforms)} 
                    className={`w-11 h-6 rounded-full transition-all flex-shrink-0 ${bakeTransforms ? "bg-green-500" : "bg-gray-600"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${bakeTransforms ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Export Target Info */}
              {models.length > 1 && (
                <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-400">
                    {selectedModelId 
                      ? `Exporting: ${models.find(m => m.id === selectedModelId)?.fileName || 'Selected model'}`
                      : `Exporting all ${models.length} models combined`
                    }
                  </p>
                </div>
              )}
              
              <button 
                onClick={() => onExport('glb')} 
                disabled={isExporting} 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${
                  isExporting 
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                    : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isExporting ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  <span className="text-sm">{isExporting ? 'Exporting...' : 'Export as GLB'}</span>
                </span>
                <span className="text-xs opacity-75 bg-white/10 px-2 py-0.5 rounded">Rec</span>
              </button>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['gltf', 'obj', 'stl'].map(format => (
                  <button 
                    key={format}
                    onClick={() => onExport(format)} 
                    disabled={isExporting}
                    className="bg-gray-700/50 rounded p-2 text-xs hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                  >
                    {format}
                  </button>
                ))}
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
        <SectionHeader 
          title="View Settings" 
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } 
          section="view" 
        />
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
                <span className="text-sm text-gray-400">Background</span>
                <div className="flex gap-1.5">
                  {[
                    { color: "#1a1a2e", name: "Dark Blue" }, 
                    { color: "#0f172a", name: "Slate" }, 
                    { color: "#18181b", name: "Zinc" },
                    { color: "#1f2937", name: "Gray" }
                  ].map(({ color, name }) => (
                    <button 
                      key={color} 
                      onClick={() => setBgColor(color)} 
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        bgColor === color ? "border-white scale-110" : "border-transparent hover:border-gray-500"
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

      {/* Transform Tools */}
      {models.length > 0 && !isLoading && (
        <div className="p-5 border-b border-gray-700/50">
          <SectionHeader 
            title="Transform Tools" 
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            } 
            section="transform" 
          />
          {expandedSection.transform && (
            <>
              {/* Model Transform */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Model Transform</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { mode: 'none', label: 'View', icon: '👁' },
                    { mode: 'translate', label: 'Move', icon: '↔' },
                    { mode: 'rotate', label: 'Rotate', icon: '↻' },
                    { mode: 'scale', label: 'Scale', icon: '⤡' }
                  ].map(({ mode, label, icon }) => (
                    <button 
                      key={mode} 
                      onClick={() => setTransformMode(mode)} 
                      className={`p-2 rounded-lg text-xs transition-colors flex flex-col items-center gap-1 ${
                        transformMode === mode 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Undo Button */}
              {undoHistoryCount > 0 && (
                <div className="mt-3">
                  <button
                    onClick={onUndo}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-600/50 hover:border-gray-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>Undo ({undoHistoryCount})</span>
                    <span className="text-xs text-gray-500 ml-auto px-1.5 py-0.5 bg-gray-600/50 rounded">Ctrl+Z</span>
                  </button>
                </div>
              )}

              {/* Selected Model Info */}
              {selectedModelId && models.length > 1 && (
                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-400">
                    Transforming: {models.find(m => m.id === selectedModelId)?.fileName || 'Selected'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer - Clear Models */}
      {models.length > 0 && !isLoading && (
        <div className="p-5 mt-auto border-t border-gray-700/50">
          <div className="space-y-2">
            {/* Clear Selected */}
            {selectedModelId && models.length > 1 && (
              <button 
                onClick={() => clearModel(selectedModelId)} 
                className="w-full px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove Selected Model
              </button>
            )}
            
            {/* Clear All */}
            <button 
              onClick={clearAllModels} 
              className="w-full px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {models.length > 1 ? `Clear All (${models.length})` : 'Clear Model'}
            </button>
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(55, 65, 81, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.7); }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default Sidebar;