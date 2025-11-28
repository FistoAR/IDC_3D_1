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
  };

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

        {model && transformMode !== 'none' && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-gray-800/90 rounded-lg">
            <p className="text-xs text-gray-300">
              <span className="font-bold text-green-400">{transformMode}</span> mode
            </p>
          </div>
        )}

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
        </div>

        {model && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg">+</button>
            <button onClick={handleZoomOut} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg">-</button>
            <button onClick={handleResetCamera} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg">↺</button>
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
        />
      </div>
    </div>
  );
}