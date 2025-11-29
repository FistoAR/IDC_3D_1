// Viewer.js
import React, { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import LoaderFallback from "./Components/LoaderFallback";
import Model from "./Components/Model";
import Ground from "./Components/Ground";
import CameraController from "./Components/CameraController";
import Sidebar from "./Components/Sidebar";
import Toolbar from "./Components/Toolbar";
import { loadModel } from "./modelLoader";
import { downloadAsGLB, downloadAsGLTF, downloadAsOBJ, downloadAsSTL, getModelStats } from "./services/exportService";

export default function Viewer() {
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [showGrid, setShowGrid] = useState(true);
  const [showBase, setShowBase] = useState(true);
  
  const [transformMode, setTransformMode] = useState('none');
  const [isTransforming, setIsTransforming] = useState(false);
  
  const [zoom, setZoom] = useState(100);
  const [resetCamera, setResetCamera] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [bakeTransforms, setBakeTransforms] = useState(true);
  
  // Model stats
  const [modelStats, setModelStats] = useState(null);
  
  // Reference to the actual model in the scene (with transforms applied)
  const modelRef = useRef(null);
  
  const orbitControlsRef = useRef();

  const processFile = useCallback((file) => {
    setError("");
    setWarning("");
    setLoading(true);
    setLoadingStatus("Starting...");
    setFileName(file.name);
    
    loadModel(file, (status) => setLoadingStatus(status))
      .then((scene) => {
        setModel(scene);
        setLoading(false);
        setLoadingStatus("");
        
        // Calculate model stats
        const stats = getModelStats(scene);
        setModelStats(stats);
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : err.message || 'Failed to load');
        setLoading(false);
        setLoadingStatus("");
      });
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.wireframe = wireframe);
          } else {
            child.material.wireframe = wireframe;
          }
        }
      });
    }
  }, [wireframe, model]);

  // Update model stats when transforms change
  const updateModelStats = useCallback(() => {
    if (modelRef.current) {
      modelRef.current.updateMatrixWorld(true);
      const stats = getModelStats(modelRef.current);
      setModelStats(stats);
    }
  }, []);

  const handleResetCamera = () => {
    setResetCamera(true);
    setZoom(100);
    setTimeout(() => setResetCamera(false), 100);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 20));

  const clearModel = () => {
    setModel(null);
    setFileName("");
    setTransformMode('none');
    setZoom(100);
    setError("");
    setWarning("");
    setModelStats(null);
    modelRef.current = null;
  };

  // Export handler - uses the actual model reference with transforms
  const handleExport = async (format = 'glb') => {
    // Use modelRef if available (has transforms), otherwise fall back to model
    const exportTarget = modelRef.current || model;
    
    if (!exportTarget) {
      setError("No model to export");
      return;
    }
    
    setIsExporting(true);
    setExportStatus(`Preparing ${format.toUpperCase()} export...`);
    
    try {
      // Ensure world matrices are updated before export
      exportTarget.updateMatrixWorld(true);
      
      const baseName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "model";
      const exportOptions = { bakeTransforms };
      
      setExportStatus(`Generating ${format.toUpperCase()} file${bakeTransforms ? ' (with transforms baked)' : ''}...`);
      
      let result;
      switch (format) {
        case 'gltf':
          result = await downloadAsGLTF(exportTarget, baseName, exportOptions);
          break;
        case 'obj':
          result = await downloadAsOBJ(exportTarget, baseName, exportOptions);
          break;
        case 'stl':
          result = await downloadAsSTL(exportTarget, baseName, exportOptions);
          break;
        case 'glb':
        default:
          result = await downloadAsGLB(exportTarget, baseName, exportOptions);
          break;
      }
      
      const sizeStr = result.size > 1024 * 1024 
        ? `${(result.size / 1024 / 1024).toFixed(2)} MB`
        : `${(result.size / 1024).toFixed(1)} KB`;
      
      setExportStatus(`✓ Export complete! (${sizeStr})`);
      setTimeout(() => setExportStatus(""), 3000);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExportStatus("");
    } finally {
      setIsExporting(false);
    }
  };

  // Callback when model transforms change
  const handleModelUpdate = useCallback((updatedModel) => {
    modelRef.current = updatedModel;
    updateModelStats();
  }, [updateModelStats]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <Sidebar
        loading={loading}
        loadingStatus={loadingStatus}
        fileName={fileName}
        error={error}
        warning={warning}
        model={model}
        isDragging={isDragging}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        zoom={zoom}
        setZoom={setZoom}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetCamera={handleResetCamera}
        wireframe={wireframe}
        setWireframe={setWireframe}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showBase={showBase}
        setShowBase={setShowBase}
        bgColor={bgColor}
        setBgColor={setBgColor}
        handleFile={handleFile}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        clearModel={clearModel}
        // Export props
        onExport={handleExport}
        isExporting={isExporting}
        exportStatus={exportStatus}
        bakeTransforms={bakeTransforms}
        setBakeTransforms={setBakeTransforms}
        modelStats={modelStats}
      />

      <div className="flex-1 relative overflow-hidden">
        {!model && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400 mb-2">No Model Loaded</h2>
              <p className="text-sm text-gray-500 mb-4">Upload STEP, Blender, Maya, or GLTF files</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                {['STEP', 'BLEND', 'MAYA', 'GLTF', 'FBX'].map(fmt => (
                  <span key={fmt} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">{fmt}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <Canvas 
          camera={{ position: [3, 2, 3], fov: 50, near: 0.1, far: 1000 }}
          style={{ background: bgColor }}
          shadows
        >
          <CameraController zoom={zoom} resetCamera={resetCamera} />
          
          <ambientLight intensity={0.4} />
          <directionalLight intensity={1} position={[10, 10, 10]} castShadow />
          <directionalLight intensity={0.3} position={[-10, -10, -10]} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />
          <hemisphereLight intensity={0.3} groundColor="#1a1a2e" />

          <Suspense fallback={<LoaderFallback />}>
            {model && (
              <Model 
                scene={model} 
                transformMode={transformMode}
                onTransformChange={setIsTransforming}
                onModelUpdate={handleModelUpdate}
              />
            )}
          </Suspense>

          <Ground showBase={showBase} />
          
          {showGrid && <gridHelper args={[10, 10, "#374151", "#1f2937"]} position={[0, 0, 0]} />}

          <OrbitControls 
            ref={orbitControlsRef}
            autoRotate={autoRotate && transformMode === 'none'}
            autoRotateSpeed={2}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={20}
            target={[0, 0.5, 0]}
            enabled={!isTransforming}
          />
        </Canvas>

        {/* Transform mode indicator */}
        {model && transformMode !== 'none' && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-gray-800/90 rounded-lg">
            <p className="text-xs text-gray-300">
              <span className="font-bold text-green-400">{transformMode}</span> mode
              <span className="block text-gray-500 mt-1">Changes will be exported</span>
            </p>
          </div>
        )}

        {/* Export status overlay */}
        {/* {exportStatus && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600/90 rounded-lg shadow-lg">
            <p className="text-sm text-white flex items-center gap-2">
              {isExporting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              )}
              {exportStatus}
            </p>
          </div>
        )} */}

        {/* Info overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {model && fileName && (
            <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg">
              <p className="text-xs text-gray-300 truncate max-w-48">📄 {fileName}</p>
            </div>
          )}
          {model && (
            <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg">
              <p className="text-xs text-gray-300">🔍 {zoom}%</p>
            </div>
          )}
          {modelStats && (
            <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg">
              <p className="text-xs text-gray-300">
                📊 {modelStats.vertices.toLocaleString()} verts • {modelStats.triangles.toLocaleString()} tris
              </p>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        {model && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">+</button>
            <button onClick={handleZoomOut} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">-</button>
            <button onClick={handleResetCamera} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">↺</button>
          </div>
        )}

        <Toolbar
          model={model}
          autoRotate={autoRotate}
          setAutoRotate={setAutoRotate}
          wireframe={wireframe}
          setWireframe={setWireframe}
          transformMode={transformMode}
          setTransformMode={setTransformMode}
          clearModel={clearModel}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
}