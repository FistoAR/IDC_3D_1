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

function MaterialsList({ model, onMaterialUpdate, onFocusMaterial }) {
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState(true);
  const [materialMode, setMaterialMode] = useState('original');
  const [applyMode, setApplyMode] = useState('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [originalMaterials, setOriginalMaterials] = useState(new Map());
  const [globalOpacity, setGlobalOpacity] = useState(1.0);
  
  // Track if user manually selected (for blink effect)
  const [shouldBlink, setShouldBlink] = useState(false);
  
  // Ref to track if blink is in progress
  const blinkInProgressRef = useRef(false);
  const blinkTimeoutsRef = useRef([]);

  // Initialize materials map
  useEffect(() => {
    if (!model) { 
      setMaterials([]); 
      setOriginalMaterials(new Map()); 
      setSelectedMaterialId(null);
      return; 
    }

    const materialMap = new Map();
    const originals = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];

        mats.forEach((mat, index) => {
          const originalColor = mat.color ? mat.color.clone() : new THREE.Color(0x888888);
          const hasVertexColors =
            mat.vertexColors === true ||
            (child.geometry && child.geometry.attributes.color);

          // Store original state
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

          // Convert to PBR material if needed
          if (
            !(mat instanceof THREE.MeshStandardMaterial) &&
            !(mat instanceof THREE.MeshPhysicalMaterial)
          ) {
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
            });
          } else {
            // Already Standard/Physical
            if (!materialMap.has(mat.uuid)) {
              materialMap.set(mat.uuid, {
                material: mat,
                name: mat.name || `Material_${materialMap.size + 1}`,
                meshName: child.name,
                mesh: child,
                originalColor: originalColor,
                hasVertexColors: hasVertexColors || mat.vertexColors,
              });
            }
          }
        });
      }
    });

    const materialsList = Array.from(materialMap.values());
    setMaterials(materialsList);
    setOriginalMaterials(originals);

    // Auto-select first material WITHOUT triggering blink
    if (materialsList.length > 0) {
      setSelectedMaterialId(materialsList[0].material.uuid);
      // Don't set shouldBlink here - only on user click
    }
  }, [model]);

  // Cleanup blink timeouts on unmount
  useEffect(() => {
    return () => {
      blinkTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      blinkTimeoutsRef.current = [];
    };
  }, []);

  // Blink highlight - ONLY when shouldBlink is true (user clicked)
  useEffect(() => {
    if (!shouldBlink || !selectedMaterialId || !materials.length) return;

    // If already blinking, don't start another blink
    if (blinkInProgressRef.current) return;

    const item = materials.find((m) => m.material.uuid === selectedMaterialId);
    if (!item || !item.material) return;

    const mat = item.material;

    const origEmissive = mat.emissive
      ? mat.emissive.clone()
      : new THREE.Color(0x000000);
    const origIntensity = mat.emissiveIntensity || 0;

    const blinkColor = new THREE.Color(0xff0000);
    const blinkIntensity = 0.6;
    const blinkDuration = 120;
    const maxBlinks = 2;

    // Clear any existing timeouts
    blinkTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    blinkTimeoutsRef.current = [];

    blinkInProgressRef.current = true;

    // Schedule all blinks upfront
    for (let i = 0; i < maxBlinks; i++) {
      const onTime = i * (blinkDuration * 2);
      const offTime = onTime + blinkDuration;

      // Blink ON
      const onTimeout = setTimeout(() => {
        mat.emissive = blinkColor;
        mat.emissiveIntensity = blinkIntensity;
        onMaterialUpdate?.();
      }, onTime);
      blinkTimeoutsRef.current.push(onTimeout);

      // Blink OFF
      const offTimeout = setTimeout(() => {
        mat.emissive = origEmissive;
        mat.emissiveIntensity = origIntensity;
        onMaterialUpdate?.();
      }, offTime);
      blinkTimeoutsRef.current.push(offTimeout);
    }

    // Final cleanup after all blinks complete
    const finalTimeout = setTimeout(() => {
      mat.emissive = origEmissive;
      mat.emissiveIntensity = origIntensity;
      blinkInProgressRef.current = false;
      setShouldBlink(false); // Reset blink flag
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

  // Restore originals
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

    const targets =
      applyMode === "all"
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

  // User clicks to select material - triggers blink
  const handleSelectMaterial = (uuid) => {
    // Only blink if selecting a different material
    if (uuid !== selectedMaterialId) {
      setSelectedMaterialId(uuid);
      setShouldBlink(true); // Trigger blink effect
    }
  };

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    const term = searchTerm.toLowerCase();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.meshName?.toLowerCase().includes(term)
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

  if (!model) return null;

  return (
    <div className="border-b border-gray-700/50">
      {/* Header */}
      <button
        onClick={() => setExpandedSection(!expandedSection)}
        className="w-full p-4 pb-2 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
      >
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Materials ({materials.length})
        </h2>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            expandedSection ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expandedSection && (
        <>
          {/* Mode Toggle */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
              {Object.entries(MATERIAL_MODES).map(
                ([key, { name, icon, description }]) => (
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
                    <span className="text-[10px] font-medium hidden sm:inline">
                      {name}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Apply Mode Toggle */}
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

          {/* Original Mode */}
          {materialMode === "original" && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <span className="text-xl">🎨</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-200">
                      Original Colors
                    </h3>
                    <p className="text-xs text-gray-500">
                      Using model&apos;s original materials
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {materials.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectMaterial(item.material.uuid)}
                      className={`w-full flex items-center gap-2 text-xs p-1 rounded hover:bg-white/5 transition-colors ${
                        selectedMaterialId === item.material.uuid
                          ? "bg-white/10"
                          : ""
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded border border-gray-600 flex-shrink-0"
                        style={{
                          backgroundColor: `#${item.originalColor.getHexString()}`,
                          background: item.hasVertexColors
                            ? "linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)"
                            : `#${item.originalColor.getHexString()}`,
                        }}
                      />
                      <span className="text-gray-400 truncate flex-1 text-left">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={restoreOriginals}
                  className="w-full mt-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  Reset to Original
                </button>
              </div>
            </div>
          )}

          {/* Solid Mode */}
          {materialMode === "solid" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <SolidColorPanel
                  isGlobalMode={true}
                  materials={allMaterialObjects}
                  onUpdate={onMaterialUpdate}
                />
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {filteredMaterials.map((item) => (
                      <button
                        key={item.material.uuid}
                        onClick={() =>
                          handleSelectMaterial(item.material.uuid)
                        }
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
                          selectedMaterialId === item.material.uuid
                            ? "bg-cyan-500 text-white"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{
                            backgroundColor: `#${item.originalColor.getHexString()}`,
                          }}
                        />
                        <span className="truncate max-w-[80px]">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedMaterial && (
                    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                      <div className="p-2 bg-gray-700/30 border-b border-gray-700/50">
                        <span className="text-sm font-medium text-gray-200">
                          {selectedMaterial.name}
                        </span>
                      </div>
                      <div className="p-3">
                        <SolidColorPanel
                          material={selectedMaterial.material}
                          isGlobalMode={false}
                          onUpdate={onMaterialUpdate}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PBR Mode */}
          {materialMode === "pbr" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <PBRTexturePanel
                  isGlobalMode={true}
                  materials={allMaterialObjects}
                  onUpdate={onMaterialUpdate}
                />
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {filteredMaterials.map((item) => (
                      <button
                        key={item.material.uuid}
                        onClick={() =>
                          handleSelectMaterial(item.material.uuid)
                        }
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
                          selectedMaterialId === item.material.uuid
                            ? "bg-blue-500 text-white"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{
                            backgroundColor: `#${item.originalColor.getHexString()}`,
                          }}
                        />
                        <span className="truncate max-w-[80px]">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedMaterial && (
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
                </>
              )}
            </div>
          )}

          {/* Gradient Mode */}
          {materialMode === "gradient" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <GradientColorPanel
                  material={null}
                  meshes={allMeshes}
                  onUpdate={onMaterialUpdate}
                />
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {materials.map((item) => (
                      <button
                        key={item.material.uuid}
                        onClick={() =>
                          handleSelectMaterial(item.material.uuid)
                        }
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all ${
                          selectedMaterialId === item.material.uuid
                            ? "bg-purple-500 text-white"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{
                            backgroundColor: `#${item.originalColor.getHexString()}`,
                          }}
                        />
                        <span className="truncate max-w-[80px]">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedMaterial && (
                    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <GradientColorPanel
                          material={selectedMaterial.material}
                          meshes={null}
                          onUpdate={onMaterialUpdate}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MaterialsList;