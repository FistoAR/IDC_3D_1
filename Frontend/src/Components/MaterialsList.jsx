// Components/MaterialsList.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as THREE from "three";
import PBRTexturePanel from "./PBRTexturePanel";
import GradientColorPanel from "./GradientColorPanel";
import SolidColorPanel from "./SolidColorPanel";

const MATERIAL_MODES = {
  original: { name: 'Original', icon: '🎨', description: 'Keep original colors' },
  solid: { name: 'Solid', icon: '🔵', description: 'Apply solid color' },
  gradient: { name: 'Gradient', icon: '🌈', description: 'Apply gradient colors' },
  pbr: { name: 'PBR', icon: '🖼️', description: 'Apply PBR textures' }
};

const APPLY_MODES = {
  all: { name: 'All Materials', icon: '🌐' },
  individual: { name: 'Individual', icon: '🎯' }
};

const TRANSFORM_MODES = {
  none: { name: 'View', icon: '👁️', description: 'View only' },
  translate: { name: 'Move', icon: '↔️', description: 'Move selected meshes' },
  rotate: { name: 'Rotate', icon: '↻', description: 'Rotate selected meshes' },
  scale: { name: 'Scale', icon: '⤡', description: 'Scale selected meshes' }
};

function MaterialsList({ 
  model, 
  onMaterialUpdate, 
  onFocusMaterial,
  selectedMaterialId: externalSelectedMaterial,
  onSelectMaterial,
  onClearMaterialSelection,
  materialTransformMode,
  setMaterialTransformMode
}) {
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState(true);
  const [materialMode, setMaterialMode] = useState('original');
  const [applyMode, setApplyMode] = useState('all');
  const [internalSelectedMaterialId, setInternalSelectedMaterialId] = useState(null);
  const [originalMaterials, setOriginalMaterials] = useState(new Map());
  const [globalOpacity, setGlobalOpacity] = useState(1.0);
  const [shouldBlink, setShouldBlink] = useState(false);
  const [showTransformPanel, setShowTransformPanel] = useState(false);
  const blinkInProgressRef = useRef(false);
  const blinkTimeoutsRef = useRef([]);

  // Use external or internal selection
  const selectedMaterialId = externalSelectedMaterial ?? internalSelectedMaterialId;

  // Initialize materials map
  useEffect(() => {
    if (!model) { 
      setMaterials([]); 
      setOriginalMaterials(new Map()); 
      setInternalSelectedMaterialId(null);
      return; 
    }

    console.log("MaterialsList: Initializing materials from model"); // Debug log

    const materialMap = new Map();
    const originals = new Map();
    const meshCountMap = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];

        mats.forEach((mat, index) => {
          const originalColor = mat.color ? mat.color.clone() : new THREE.Color(0x888888);
          const hasVertexColors = mat.vertexColors === true ||
            (child.geometry && child.geometry.attributes.color);

          // Count meshes per material
          meshCountMap.set(mat.uuid, (meshCountMap.get(mat.uuid) || 0) + 1);

          originals.set(mat.uuid, {
            color: originalColor.clone(),
            map: mat.map,
            metalness: mat.metalness ?? 0,
            roughness: mat.roughness ?? 0.5,
            vertexColors: hasVertexColors,
            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: mat.emissiveIntensity ?? 1,
            opacity: mat.opacity ?? 1,
          });

          if (!(mat instanceof THREE.MeshStandardMaterial) &&
              !(mat instanceof THREE.MeshPhysicalMaterial)) {
            const newMat = new THREE.MeshStandardMaterial({
              color: originalColor,
              metalness: 0.0,
              roughness: 0.5,
              side: THREE.DoubleSide,
              vertexColors: hasVertexColors,
            });

            if (mat.map) newMat.map = mat.map;
            if (mat.opacity !== undefined) {
              newMat.opacity = mat.opacity;
              newMat.transparent = mat.opacity < 1;
            }

            if (Array.isArray(child.material)) {
              child.material[index] = newMat;
            } else {
              child.material = newMat;
            }

            originals.set(newMat.uuid, {
              color: originalColor.clone(),
              map: null,
              metalness: 0,
              roughness: 0.5,
              vertexColors: hasVertexColors,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 1,
              opacity: 1,
            });

            mat.dispose();

            materialMap.set(newMat.uuid, {
              material: newMat,
              name: mat.name || `Material_${materialMap.size + 1}`,
              meshName: child.name,
              mesh: child,
              originalColor: originalColor,
              hasVertexColors: hasVertexColors,
              meshCount: 1
            });
          } else {
            if (!materialMap.has(mat.uuid)) {
              materialMap.set(mat.uuid, {
                material: mat,
                name: mat.name || `Material_${materialMap.size + 1}`,
                meshName: child.name,
                mesh: child,
                originalColor: originalColor,
                hasVertexColors: hasVertexColors || mat.vertexColors,
                meshCount: 1
              });
            } else {
              // Update mesh count
              const existing = materialMap.get(mat.uuid);
              existing.meshCount++;
            }
          }
        });
      }
    });

    // Update mesh counts
    materialMap.forEach((item, uuid) => {
      item.meshCount = meshCountMap.get(uuid) || 1;
    });

    const materialsList = Array.from(materialMap.values());
    console.log("MaterialsList: Found materials:", materialsList.length); // Debug log
    setMaterials(materialsList);
    setOriginalMaterials(originals);

    // Don't auto-select first material - let user select
    // if (materialsList.length > 0 && !selectedMaterialId) {
    //   setInternalSelectedMaterialId(materialsList[0].material.uuid);
    // }
  }, [model]);

  // Cleanup blink timeouts
  useEffect(() => {
    return () => {
      blinkTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      blinkTimeoutsRef.current = [];
    };
  }, []);

  // Blink effect for selected material
  useEffect(() => {
    if (!shouldBlink || !selectedMaterialId || !materials.length) return;
    if (blinkInProgressRef.current) return;

    const item = materials.find((m) => m.material.uuid === selectedMaterialId);
    if (!item || !item.material) return;

    const mat = item.material;
    const origEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
    const origIntensity = mat.emissiveIntensity || 0;

    const blinkColor = new THREE.Color(0xff00ff);
    const blinkIntensity = 0.8;
    const blinkDuration = 150;
    const maxBlinks = 3;

    blinkTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    blinkTimeoutsRef.current = [];
    blinkInProgressRef.current = true;

    for (let i = 0; i < maxBlinks; i++) {
      const onTime = i * (blinkDuration * 2);
      const offTime = onTime + blinkDuration;

      const onTimeout = setTimeout(() => {
        mat.emissive = blinkColor;
        mat.emissiveIntensity = blinkIntensity;
        onMaterialUpdate?.();
      }, onTime);
      blinkTimeoutsRef.current.push(onTimeout);

      const offTimeout = setTimeout(() => {
        mat.emissive = origEmissive;
        mat.emissiveIntensity = origIntensity;
        onMaterialUpdate?.();
      }, offTime);
      blinkTimeoutsRef.current.push(offTimeout);
    }

    const finalTimeout = setTimeout(() => {
      mat.emissive = origEmissive;
      mat.emissiveIntensity = origIntensity;
      blinkInProgressRef.current = false;
      setShouldBlink(false);
      onMaterialUpdate?.();
    }, maxBlinks * blinkDuration * 2);
    blinkTimeoutsRef.current.push(finalTimeout);

    return () => {
      blinkTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      blinkTimeoutsRef.current = [];
      mat.emissive = origEmissive;
      mat.emissiveIntensity = origIntensity;
      blinkInProgressRef.current = false;
    };
  }, [shouldBlink, selectedMaterialId, materials, onMaterialUpdate]);

  const restoreOriginals = useCallback(() => {
    materials.forEach(({ material }) => {
      const original = originalMaterials.get(material.uuid);
      if (original) {
        material.color = original.color.clone();
        material.map = original.map;
        material.metalness = original.metalness;
        material.roughness = original.roughness;
        material.emissive = original.emissive.clone();
        material.emissiveIntensity = original.emissiveIntensity;
        material.opacity = original.opacity;
        material.transparent = original.opacity < 1;
        material.needsUpdate = true;
      }
    });
    setGlobalOpacity(1.0);
    onMaterialUpdate?.();
  }, [materials, originalMaterials, onMaterialUpdate]);

  const handleModeChange = (mode) => {
    if (mode === "original") {
      restoreOriginals();
    }
    setMaterialMode(mode);
  };

  const handleOpacityChange = (value) => {
    const val = parseFloat(value);
    setGlobalOpacity(val);

    const targets = applyMode === "all"
      ? materials.map((m) => m.material)
      : selectedMaterialId
        ? [materials.find((m) => m.material.uuid === selectedMaterialId)?.material]
        : [];

    targets.forEach((mat) => {
      if (mat) {
        mat.opacity = val;
        mat.transparent = val < 1.0;
        mat.needsUpdate = true;
      }
    });
    onMaterialUpdate?.();
  };

  const handleSelectMaterial = useCallback((uuid) => {
    console.log("MaterialsList: handleSelectMaterial called with:", uuid); // Debug log
    
    // Always trigger selection, even if same material (for re-highlighting)
    if (onSelectMaterial) {
      console.log("MaterialsList: Calling parent onSelectMaterial"); // Debug log
      onSelectMaterial(uuid);
    } else {
      setInternalSelectedMaterialId(uuid);
    }
    
    if (uuid !== selectedMaterialId) {
      setShouldBlink(true);
    }
    setShowTransformPanel(true);
  }, [onSelectMaterial, selectedMaterialId]);

  const handleFocusClick = (uuid, e) => {
    e.stopPropagation();
    if (onFocusMaterial) {
      onFocusMaterial(uuid);
    }
  };

  const handleClearSelection = () => {
    console.log("MaterialsList: Clearing selection"); // Debug log
    if (onClearMaterialSelection) {
      onClearMaterialSelection();
    } else {
      setInternalSelectedMaterialId(null);
    }
    setShowTransformPanel(false);
    if (setMaterialTransformMode) {
      setMaterialTransformMode('none');
    }
  };

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    const term = searchTerm.toLowerCase();
    return materials.filter(
      (m) => m.name.toLowerCase().includes(term) || m.meshName?.toLowerCase().includes(term)
    );
  }, [materials, searchTerm]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.material.uuid === selectedMaterialId),
    [materials, selectedMaterialId]
  );

  const allMeshes = useMemo(
    () => materials.map((m) => m.mesh).filter(Boolean),
    [materials]
  );

  const allMaterialObjects = useMemo(
    () => materials.map((m) => m.material),
    [materials]
  );

  // Get mesh count for selected material
  const getSelectedMaterialMeshCount = useCallback(() => {
    if (!model || !selectedMaterialId) return 0;
    let count = 0;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        if (mats.some(m => m.uuid === selectedMaterialId)) {
          count++;
        }
      }
    });
    return count;
  }, [model, selectedMaterialId]);

  if (!model) return null;

  const selectedMeshCount = getSelectedMaterialMeshCount();

  return (
    <div className="border-b border-gray-700/50">
      {/* Header */}
      <button
        onClick={() => setExpandedSection(!expandedSection)}
        className="w-full p-4 pb-2 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
      >
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Materials ({materials.length})
          {selectedMaterialId && (
            <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded text-[10px]">
              1 selected
            </span>
          )}
        </h2>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandedSection && (
        <>
          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-8 bg-gray-700/50 border border-gray-600/50 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Material Selection Info Banner */}
          {selectedMaterialId && selectedMaterial && (
            <div className="px-4 pb-3">
              <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-purple-500/50"
                      style={{
                        backgroundColor: selectedMaterial.material.color 
                          ? `#${selectedMaterial.material.color.getHexString()}` 
                          : '#888888'
                      }}
                    >
                      <span className="text-lg drop-shadow-md">🎨</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-200">
                        {selectedMaterial.name || 'Material'}
                      </p>
                      <p className="text-xs text-purple-400">
                        {selectedMeshCount} mesh{selectedMeshCount !== 1 ? 'es' : ''} selected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="p-1.5 hover:bg-purple-500/30 rounded-lg transition-colors"
                    title="Clear selection"
                  >
                    <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Transform Controls for Selected Material */}
                <div className="pt-2 border-t border-purple-500/30">
                  <p className="text-[10px] text-purple-400 mb-2 uppercase tracking-wider">
                    Transform Material Meshes
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {Object.entries(TRANSFORM_MODES).map(([mode, { name, icon, description }]) => (
                      <button
                        key={mode}
                        onClick={() => setMaterialTransformMode && setMaterialTransformMode(mode)}
                        className={`p-2 rounded-md text-xs transition-all flex flex-col items-center gap-0.5 ${
                          materialTransformMode === mode
                            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                            : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                        }`}
                        title={description}
                      >
                        <span className="text-base">{icon}</span>
                        <span className="text-[10px]">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hint */}
                {materialTransformMode !== 'none' && (
                  <div className="mt-2 p-2 bg-purple-500/10 rounded-md">
                    <p className="text-[10px] text-purple-300 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Drag the gizmo to {materialTransformMode} all meshes with this material
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
              {Object.entries(MATERIAL_MODES).map(([key, { name, icon, description }]) => (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-md transition-all ${
                    materialMode === key
                      ? "bg-blue-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                  title={description}
                >
                  <span className="text-sm">{icon}</span>
                  <span className="text-[10px] font-medium hidden sm:inline">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Apply Mode */}
          {materials.length > 1 && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg">
                <span className="text-xs text-gray-400">Apply to:</span>
                <div className="flex-1 flex items-center gap-1 p-0.5 bg-gray-800/50 rounded-md">
                  {Object.entries(APPLY_MODES).map(([key, { name, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setApplyMode(key)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded transition-all text-xs ${
                        applyMode === key
                          ? "bg-purple-500 text-white"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      }`}
                    >
                      <span>{icon}</span>
                      <span className="font-medium">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Opacity */}
          <div className="px-4 pb-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  Opacity {applyMode === "individual" ? "(Selected)" : "(All)"}
                </span>
                <span>{(globalOpacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={globalOpacity}
                onChange={(e) => handleOpacityChange(e.target.value)}
                className="w-full h-1.5 bg-gray-700 rounded-lg accent-gray-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Materials List */}
          <div className="px-4 pb-3">
            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
              {filteredMaterials.map((item) => (
                <div
                  key={item.material.uuid}
                  onClick={() => handleSelectMaterial(item.material.uuid)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group ${
                    selectedMaterialId === item.material.uuid
                      ? "bg-purple-500/30 border border-purple-500/50 shadow-lg shadow-purple-500/10"
                      : "bg-gray-700/30 hover:bg-gray-700/50 border border-transparent"
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-md border-2 flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: item.material.color 
                        ? `#${item.material.color.getHexString()}` 
                        : `#${item.originalColor.getHexString()}`,
                      background: item.hasVertexColors
                        ? "linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)"
                        : item.material.color 
                          ? `#${item.material.color.getHexString()}` 
                          : `#${item.originalColor.getHexString()}`,
                      borderColor: selectedMaterialId === item.material.uuid 
                        ? 'rgb(168, 85, 247)' 
                        : 'rgb(75, 85, 99)'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 truncate font-medium">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="truncate">{item.meshName || 'Unknown mesh'}</span>
                      {item.meshCount > 1 && (
                        <span className="px-1 py-0.5 bg-gray-600/50 rounded text-gray-400">
                          {item.meshCount} meshes
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Focus Button */}
                    <button
                      onClick={(e) => handleFocusClick(item.material.uuid, e)}
                      className="p-1.5 bg-gray-600/50 hover:bg-blue-500/50 rounded-md transition-colors"
                      title="Focus on this material"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Selected Indicator */}
                  {selectedMaterialId === item.material.uuid && (
                    <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Material Editing Panels */}
          {materialMode === "solid" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <SolidColorPanel isGlobalMode={true} materials={allMaterialObjects} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial && (
                <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                  <div className="p-2 bg-gray-700/30 border-b border-gray-700/50">
                    <span className="text-sm font-medium text-gray-200">{selectedMaterial.name}</span>
                  </div>
                  <div className="p-3">
                    <SolidColorPanel material={selectedMaterial.material} isGlobalMode={false} onUpdate={onMaterialUpdate} />
                  </div>
                </div>
              )}
            </div>
          )}

          {materialMode === "pbr" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <PBRTexturePanel isGlobalMode={true} materials={allMaterialObjects} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial && (
                <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                  <div className="p-3">
                    <PBRTexturePanel 
                      material={selectedMaterial.material} 
                      materialName={selectedMaterial.name} 
                      onUpdate={onMaterialUpdate} 
                      expanded={true} 
                      onExpandedChange={() => {}} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {materialMode === "gradient" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <GradientColorPanel material={null} meshes={allMeshes} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial && (
                <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                  <div className="p-3">
                    <GradientColorPanel material={selectedMaterial.material} meshes={null} onUpdate={onMaterialUpdate} />
                  </div>
                </div>
              )}
            </div>
          )}

          {materialMode === "original" && (
            <div className="px-4 pb-4">
              <button
                onClick={restoreOriginals}
                className="w-full py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset to Original Colors
              </button>
            </div>
          )}
        </>
      )}

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(55, 65, 81, 0.3); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.5); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.7); }
      `}</style>
    </div>
  );
}

export default MaterialsList;