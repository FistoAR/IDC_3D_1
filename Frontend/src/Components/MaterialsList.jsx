// Components/MaterialsList.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import PBRTexturePanel from "./PBRTexturePanel";
import GradientColorPanel from "./GradientColorPanel";

const MATERIAL_MODES = {
  original: {
    name: 'Original',
    icon: '🎨',
    description: 'Keep original colors'
  },
  pbr: {
    name: 'PBR',
    icon: '🖼️',
    description: 'Apply PBR textures'
  },
  gradient: {
    name: 'Gradient',
    icon: '🌈',
    description: 'Apply gradient colors'
  }
};

const APPLY_MODES = {
  all: { name: 'All Materials', icon: '🌐' },
  individual: { name: 'Individual', icon: '🎯' }
};

function MaterialsList({ model, onMaterialUpdate }) {
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState(true);
  const [materialMode, setMaterialMode] = useState('original');
  const [applyMode, setApplyMode] = useState('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [originalMaterials, setOriginalMaterials] = useState(new Map());

  // Store original material states
  useEffect(() => {
    if (!model) {
      setMaterials([]);
      setOriginalMaterials(new Map());
      return;
    }

    const materialMap = new Map();
    const originals = new Map();
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        
        mats.forEach((mat, index) => {
          const originalColor = mat.color ? mat.color.clone() : new THREE.Color(0x888888);
          const hasVertexColors = mat.vertexColors === true || 
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

          // Convert to MeshStandardMaterial if needed
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
            });
          } else {
            const key = mat.uuid;
            if (!materialMap.has(key)) {
              materialMap.set(key, {
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
    
    // Select first material by default
    if (materialsList.length > 0 && !selectedMaterialId) {
      setSelectedMaterialId(materialsList[0].material.uuid);
    }
  }, [model]);

  // Restore original materials
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
    onMaterialUpdate?.();
  }, [materials, originalMaterials, onMaterialUpdate]);

  // Handle mode change
  const handleModeChange = (mode) => {
    if (mode === 'original') {
      restoreOriginals();
    }
    setMaterialMode(mode);
  };

  // Filter materials by search
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    const term = searchTerm.toLowerCase();
    return materials.filter(
      m => m.name.toLowerCase().includes(term) || 
           m.meshName?.toLowerCase().includes(term)
    );
  }, [materials, searchTerm]);

  // Get selected material
  const selectedMaterial = useMemo(() => {
    return materials.find(m => m.material.uuid === selectedMaterialId);
  }, [materials, selectedMaterialId]);

  // Get all meshes
  const allMeshes = useMemo(() => {
    return materials.map(m => m.mesh).filter(Boolean);
  }, [materials]);

  // Get all materials
  const allMaterialObjects = useMemo(() => {
    return materials.map(m => m.material);
  }, [materials]);

  if (!model) return null;

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
        </h2>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandedSection && (
        <>
          {/* Mode Toggle - Original / PBR / Gradient */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
              {Object.entries(MATERIAL_MODES).map(([key, { name, icon, description }]) => (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md transition-all ${
                    materialMode === key
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                  title={description}
                >
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium hidden sm:inline">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Apply Mode Toggle - All / Individual (for PBR and Gradient) */}
          {(materialMode === 'pbr' || materialMode === 'gradient') && materials.length > 1 && (
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
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
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

          {/* Mode-specific content */}
          
          {/* Original Mode */}
          {materialMode === 'original' && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <span className="text-xl">🎨</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-200">Original Colors</h3>
                    <p className="text-xs text-gray-500">Using model's original materials</p>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {materials.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-4 h-4 rounded border border-gray-600 flex-shrink-0"
                        style={{ 
                          backgroundColor: `#${item.originalColor.getHexString()}`,
                          background: item.hasVertexColors 
                            ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                            : `#${item.originalColor.getHexString()}`
                        }}
                      />
                      <span className="text-gray-400 truncate flex-1">{item.name}</span>
                      {item.hasVertexColors && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px]">
                          Vertex
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={restoreOriginals}
                  className="w-full mt-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset to Original
                </button>
              </div>
            </div>
          )}

          {/* PBR Mode */}
          {materialMode === 'pbr' && (
            <div className="px-4 pb-4">
              {/* All Materials Mode */}
              {applyMode === 'all' && (
                <div className="space-y-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-400 flex items-center gap-2">
                      <span>🌐</span>
                      <span>Changes will apply to all {materials.length} materials</span>
                    </p>
                  </div>
                  <PBRTexturePanel
                    isGlobalMode={true}
                    materials={allMaterialObjects}
                    onUpdate={onMaterialUpdate}
                  />
                </div>
              )}

              {/* Individual Material Mode */}
              {applyMode === 'individual' && (
                <>
                  {/* Search */}
                  {materials.length > 3 && (
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search materials..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-1.5 pl-8 bg-gray-700/50 border border-gray-600/50 rounded-lg text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        <svg 
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Material Selector Tabs */}
                  <div className="mb-3 flex flex-wrap gap-1">
                    {filteredMaterials.map((item, index) => (
                      <button
                        key={item.material.uuid}
                        onClick={() => setSelectedMaterialId(item.material.uuid)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
                          selectedMaterialId === item.material.uuid
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        }`}
                      >
                        <div 
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{ 
                            backgroundColor: `#${item.originalColor.getHexString()}`,
                            background: item.hasVertexColors 
                              ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                              : `#${item.originalColor.getHexString()}`
                          }}
                        />
                        <span className="truncate max-w-[80px]">{item.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selected Material PBR Panel */}
                  {selectedMaterial && (
                    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                      <div className="p-2 bg-gray-700/30 border-b border-gray-700/50 flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded border border-gray-600"
                          style={{ 
                            backgroundColor: `#${selectedMaterial.originalColor.getHexString()}`,
                            background: selectedMaterial.hasVertexColors 
                              ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                              : `#${selectedMaterial.originalColor.getHexString()}`
                          }}
                        />
                        <span className="text-sm font-medium text-gray-200">{selectedMaterial.name}</span>
                        {selectedMaterial.hasVertexColors && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px]">
                            Vertex Colors
                          </span>
                        )}
                      </div>
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
          {materialMode === 'gradient' && (
            <div className="px-4 pb-4">
              {/* All Materials Mode */}
              {applyMode === 'all' && (
                <div className="space-y-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-400 flex items-center gap-2">
                      <span>🌐</span>
                      <span>Gradient will apply to all {materials.length} materials</span>
                    </p>
                  </div>
                  <GradientColorPanel
                    material={null}
                    meshes={allMeshes}
                    onUpdate={onMaterialUpdate}
                  />
                </div>
              )}

              {/* Individual Material Mode */}
              {applyMode === 'individual' && (
                <>
                  {/* Material Selector */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1.5 block">Select Material</label>
                    <div className="flex flex-wrap gap-1">
                      {materials.map((item) => (
                        <button
                          key={item.material.uuid}
                          onClick={() => setSelectedMaterialId(item.material.uuid)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all ${
                            selectedMaterialId === item.material.uuid
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-sm border border-white/20"
                            style={{ 
                              backgroundColor: `#${item.originalColor.getHexString()}`,
                              background: item.hasVertexColors 
                                ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                                : `#${item.originalColor.getHexString()}`
                            }}
                          />
                          <span className="truncate max-w-[80px]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Material Gradient Panel */}
                  {selectedMaterial && (
                    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                      <div className="p-2 bg-gray-700/30 border-b border-gray-700/50 flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded border border-gray-600"
                          style={{ 
                            backgroundColor: `#${selectedMaterial.originalColor.getHexString()}`,
                            background: selectedMaterial.hasVertexColors 
                              ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)'
                              : `#${selectedMaterial.originalColor.getHexString()}`
                          }}
                        />
                        <span className="text-sm font-medium text-gray-200">{selectedMaterial.name}</span>
                      </div>
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

          {/* Info Footer */}
          <div className="px-4 pb-3 border-t border-gray-700/50 pt-3">
            <div className="flex items-start gap-2 text-[10px] text-gray-500">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {materialMode === 'original' && "Original colors and gradients from the model are preserved."}
                {materialMode === 'pbr' && applyMode === 'all' && "PBR settings apply to all materials at once."}
                {materialMode === 'pbr' && applyMode === 'individual' && "Select a material to edit its PBR properties individually."}
                {materialMode === 'gradient' && applyMode === 'all' && "Gradient applies to all materials."}
                {materialMode === 'gradient' && applyMode === 'individual' && "Select a material to apply gradient individually."}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MaterialsList;