// Components/MaterialsList.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import PBRTexturePanel from "./PBRTexturePanel";
import GradientColorPanel from "./GradientColorPanel";
import SolidColorPanel from "./SolidColorPanel";

// SVG Icon Components
const Icons = {
  // Material Modes
  Original: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  Solid: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  Gradient: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="gradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="2" fill="url(#gradIcon)" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  PBR: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  
  // Apply Modes
  Globe: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Target: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <circle cx="12" cy="12" r="6" strokeWidth={2} />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  
  // Transform Modes
  View: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Move: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12H3m4 0l-2-2m2 2l-2 2m16-2h-4m4 0l-2-2m2 2l-2 2" />
    </svg>
  ),
  Translate: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m0 0l-4-4m4 4l-4 4M12 4v16m0-16l-4 4m4-4l4 4" />
    </svg>
  ),
  Rotate: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Scale: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  
  // Other Icons
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Reset: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Cursor: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Wireframe: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  DoubleSide: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Texture: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Material: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Focus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
};

const MATERIAL_MODES = {
  original: { name: 'Original', icon: Icons.Original, description: 'Keep original colors' },
  solid: { name: 'Solid', icon: Icons.Solid, description: 'Apply solid color' },
  gradient: { name: 'Gradient', icon: Icons.Gradient, description: 'Apply gradient colors' },
  pbr: { name: 'PBR', icon: Icons.PBR, description: 'Apply PBR textures' }
};

const APPLY_MODES = {
  all: { name: 'All Materials', icon: Icons.Globe },
  individual: { name: 'Individual', icon: Icons.Target }
};

const TRANSFORM_MODES = {
  none: { name: 'View', icon: Icons.View, description: 'View only' },
  translate: { name: 'Move', icon: Icons.Translate, description: 'Move selected meshes' },
  rotate: { name: 'Rotate', icon: Icons.Rotate, description: 'Rotate selected meshes' },
  scale: { name: 'Scale', icon: Icons.Scale, description: 'Scale selected meshes' }
};

function MaterialsList({ 
  model, 
  onMaterialUpdate, 
  onFocusMaterial,
  selectedMaterialId: externalSelectedMaterial,
  onSelectMaterial,
  onClearMaterialSelection,
  materialTransformMode,
  setMaterialTransformMode,
  isModelSelected = true,
  currentTransformMode = 'none'
}) {
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState(true);
  const [materialMode, setMaterialMode] = useState('original');
  const [applyMode, setApplyMode] = useState('all');
  const [internalSelectedMaterialId, setInternalSelectedMaterialId] = useState(null);
  const [originalMaterials, setOriginalMaterials] = useState(new Map());
  const [globalOpacity, setGlobalOpacity] = useState(1.0);

  const selectedMaterialId = externalSelectedMaterial ?? internalSelectedMaterialId;
  const isMaterialPickingEnabled = isModelSelected && currentTransformMode === 'none';

  // Initialize materials
  useEffect(() => {
    if (!model) { 
      setMaterials([]); 
      setOriginalMaterials(new Map()); 
      setInternalSelectedMaterialId(null);
      return; 
    }

    const materialMap = new Map();
    const originals = new Map();
    const meshCountMap = new Map();
    const meshesPerMaterial = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];

        mats.forEach((mat, index) => {
          const originalColor = mat.color ? mat.color.clone() : new THREE.Color(0x888888);
          const hasVertexColors = mat.vertexColors === true ||
            (child.geometry && child.geometry.attributes.color);

          meshCountMap.set(mat.uuid, (meshCountMap.get(mat.uuid) || 0) + 1);
          
          if (!meshesPerMaterial.has(mat.uuid)) {
            meshesPerMaterial.set(mat.uuid, []);
          }
          meshesPerMaterial.get(mat.uuid).push(child);

          originals.set(mat.uuid, {
            color: originalColor.clone(),
            map: mat.map,
            metalness: mat.metalness ?? 0,
            roughness: mat.roughness ?? 0.5,
            vertexColors: hasVertexColors,
            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: mat.emissiveIntensity ?? 1,
            opacity: mat.opacity ?? 1,
            normalMap: mat.normalMap,
            roughnessMap: mat.roughnessMap,
            metalnessMap: mat.metalnessMap,
            aoMap: mat.aoMap,
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
              meshes: [child],
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
                meshes: [child],
                originalColor: originalColor,
                hasVertexColors: hasVertexColors || mat.vertexColors,
                meshCount: 1
              });
            } else {
              const existing = materialMap.get(mat.uuid);
              existing.meshCount++;
              existing.meshes.push(child);
            }
          }
        });
      }
    });

    materialMap.forEach((item, uuid) => {
      item.meshCount = meshCountMap.get(uuid) || 1;
      item.meshes = meshesPerMaterial.get(uuid) || [item.mesh];
    });

    const materialsList = Array.from(materialMap.values());
    setMaterials(materialsList);
    setOriginalMaterials(originals);
  }, [model]);

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
        material.normalMap = original.normalMap;
        material.roughnessMap = original.roughnessMap;
        material.metalnessMap = original.metalnessMap;
        material.aoMap = original.aoMap;
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
    if (onSelectMaterial) {
      onSelectMaterial(uuid);
    } else {
      setInternalSelectedMaterialId(uuid);
    }
  }, [onSelectMaterial]);

  const handleFocusClick = (uuid, e) => {
    e.stopPropagation();
    if (onFocusMaterial) {
      onFocusMaterial(uuid);
    }
  };

  const handleClearSelection = () => {
    if (onClearMaterialSelection) {
      onClearMaterialSelection();
    } else {
      setInternalSelectedMaterialId(null);
    }
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

  const getMaterialTypeInfo = useCallback((material) => {
    const types = [];
    if (material.map) types.push('Diffuse');
    if (material.normalMap) types.push('Normal');
    if (material.roughnessMap) types.push('Roughness');
    if (material.metalnessMap) types.push('Metalness');
    if (material.aoMap) types.push('AO');
    if (material.emissiveMap) types.push('Emissive');
    return types;
  }, []);

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
          <Icons.Material />
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
              <div className="absolute left-2.5 top-2.5 text-gray-500">
                <Icons.Search />
              </div>
            </div>
          </div>

          {/* Material Picking Mode Indicator */}
          {!selectedMaterialId && isMaterialPickingEnabled && (
            <div className="px-4 pb-3">
              <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="text-cyan-400 animate-pulse">
                      <Icons.Cursor />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cyan-300 font-medium">Direct Selection Active</p>
                    <p className="text-xs text-cyan-400/70 mt-0.5">
                      Click on any mesh in 3D view to select its material
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-500/20">
                  <div className="flex items-center gap-2 text-[10px] text-cyan-400/60">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse"></span>
                      Hover to preview
                    </span>
                    <span className="text-cyan-500/30">•</span>
                    <span>Click to select</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Material Picking Disabled Info */}
          {!selectedMaterialId && !isMaterialPickingEnabled && currentTransformMode !== 'none' && (
            <div className="px-4 pb-3">
              <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-xs text-orange-400 flex items-center gap-2">
                  <Icons.Warning />
                  Set transform to "View" mode to select materials in 3D
                </p>
              </div>
            </div>
          )}

          {/* Selected Material Info */}
          {selectedMaterialId && selectedMaterial && (
            <div className="px-4 pb-3">
              <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-purple-500/50 relative overflow-hidden"
                      style={{
                        backgroundColor: selectedMaterial.material.color 
                          ? `#${selectedMaterial.material.color.getHexString()}` 
                          : '#888888'
                      }}
                    >
                      {selectedMaterial.material.map && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-200">
                        {selectedMaterial.name || 'Material'}
                      </p>
                      <p className="text-xs text-purple-400">
                        {selectedMeshCount} mesh{selectedMeshCount !== 1 ? 'es' : ''} using this material
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="p-1.5 hover:bg-purple-500/30 rounded-lg transition-colors text-purple-300"
                    title="Clear selection"
                  >
                    <Icons.Close />
                  </button>
                </div>

                {/* Material Properties Quick View */}
                <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-purple-900/20 rounded-md">
                  <div className="text-xs">
                    <span className="text-purple-400">Metalness:</span>
                    <span className="text-purple-200 ml-1">{(selectedMaterial.material.metalness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-purple-400">Roughness:</span>
                    <span className="text-purple-200 ml-1">{(selectedMaterial.material.roughness * 100).toFixed(0)}%</span>
                  </div>
                  {selectedMaterial.material.opacity < 1 && (
                    <div className="text-xs col-span-2">
                      <span className="text-purple-400">Opacity:</span>
                      <span className="text-purple-200 ml-1">{(selectedMaterial.material.opacity * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Texture Badges */}
                {getMaterialTypeInfo(selectedMaterial.material).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {getMaterialTypeInfo(selectedMaterial.material).map(type => (
                      <span key={type} className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded text-[10px]">
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Transform Controls */}
                <div className="pt-2 border-t border-purple-500/30">
                  <p className="text-[10px] text-purple-400 mb-2 uppercase tracking-wider">
                    Transform Material Meshes
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {Object.entries(TRANSFORM_MODES).map(([mode, { name, icon: IconComponent, description }]) => (
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
                        <IconComponent />
                        <span className="text-[10px]">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {materialTransformMode !== 'none' && (
                  <div className="mt-2 p-2 bg-purple-500/10 rounded-md">
                    <p className="text-[10px] text-purple-300 flex items-center gap-1.5">
                      <Icons.Info />
                      Drag the gizmo to {materialTransformMode} all {selectedMeshCount} mesh{selectedMeshCount !== 1 ? 'es' : ''}
                    </p>
                  </div>
                )}

                {/* Focus Button */}
                <button
                  onClick={(e) => handleFocusClick(selectedMaterialId, e)}
                  className="mt-2 w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-md text-xs text-purple-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Icons.Focus />
                  Focus Camera on Material
                </button>
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
              {Object.entries(MATERIAL_MODES).map(([key, { name, icon: IconComponent, description }]) => (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-md transition-all ${
                    materialMode === key
                      ? "bg-blue-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                  title={description}
                >
                  <IconComponent />
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
                  {Object.entries(APPLY_MODES).map(([key, { name, icon: IconComponent }]) => (
                    <button
                      key={key}
                      onClick={() => setApplyMode(key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded transition-all text-xs ${
                        applyMode === key
                          ? "bg-purple-500 text-white"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      }`}
                    >
                      <IconComponent />
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
                <span>Opacity {applyMode === "individual" && selectedMaterialId ? "(Selected)" : "(All)"}</span>
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 's' : ''}
              </span>
              {selectedMaterialId && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
              {filteredMaterials.map((item) => {
                const textureTypes = getMaterialTypeInfo(item.material);
                
                return (
                  <div
                    key={item.material.uuid}
                    onClick={() => handleSelectMaterial(item.material.uuid)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group ${
                      selectedMaterialId === item.material.uuid
                        ? "bg-purple-500/30 border border-purple-500/50 shadow-lg shadow-purple-500/10"
                        : "bg-gray-700/30 hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-md border-2 flex-shrink-0 transition-transform group-hover:scale-105 relative overflow-hidden"
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
                    >
                      {item.material.map && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Icons.Texture />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="truncate">{item.meshName || 'Unknown mesh'}</span>
                        {item.meshCount > 1 && (
                          <span className="px-1 py-0.5 bg-gray-600/50 rounded text-gray-400 flex-shrink-0">
                            {item.meshCount}×
                          </span>
                        )}
                      </div>
                      {textureTypes.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {textureTypes.slice(0, 3).map(type => (
                            <span key={type} className="px-1 py-0.5 bg-gray-600/30 text-gray-500 rounded text-[8px]">
                              {type.slice(0, 3)}
                            </span>
                          ))}
                          {textureTypes.length > 3 && (
                            <span className="px-1 py-0.5 bg-gray-600/30 text-gray-500 rounded text-[8px]">
                              +{textureTypes.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Focus Button */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <div className="w-1.5 h-8 bg-purple-500 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Material Editing Panels */}
          {materialMode === "solid" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <SolidColorPanel isGlobalMode={true} materials={allMaterialObjects} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial ? (
                <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                  <div className="p-2 bg-gray-700/30 border-b border-gray-700/50">
                    <span className="text-sm font-medium text-gray-200">{selectedMaterial.name}</span>
                  </div>
                  <div className="p-3">
                    <SolidColorPanel material={selectedMaterial.material} isGlobalMode={false} onUpdate={onMaterialUpdate} />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-700/30 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Select a material from the list above</p>
                </div>
              )}
            </div>
          )}

          {materialMode === "pbr" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <PBRTexturePanel isGlobalMode={true} materials={allMaterialObjects} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial ? (
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
              ) : (
                <div className="p-3 bg-gray-700/30 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Select a material from the list above</p>
                </div>
              )}
            </div>
          )}

          {materialMode === "gradient" && (
            <div className="px-4 pb-4">
              {applyMode === "all" ? (
                <GradientColorPanel material={null} meshes={allMeshes} onUpdate={onMaterialUpdate} />
              ) : selectedMaterial ? (
                <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                  <div className="p-3">
                    <GradientColorPanel 
                      material={selectedMaterial.material} 
                      meshes={selectedMaterial.meshes || [selectedMaterial.mesh]} 
                      onUpdate={onMaterialUpdate} 
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-700/30 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Select a material from the list above</p>
                </div>
              )}
            </div>
          )}

          {materialMode === "original" && (
            <div className="px-4 pb-4">
              <button
                onClick={restoreOriginals}
                className="w-full py-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-2 border border-gray-600/50"
              >
                <Icons.Reset />
                Reset All Materials to Original
              </button>
              
              <div className="mt-3 p-3 bg-gray-700/20 rounded-lg">
                <p className="text-xs text-gray-500 text-center">
                  Original mode preserves the model's default materials.
                  <br />
                  Select a different mode to customize materials.
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {materials.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    materials.forEach(({ material }) => {
                      material.wireframe = !material.wireframe;
                      material.needsUpdate = true;
                    });
                    onMaterialUpdate?.();
                  }}
                  className="flex-1 py-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icons.Wireframe />
                  Toggle Wireframe
                </button>
                <button
                  onClick={() => {
                    materials.forEach(({ material }) => {
                      material.side = material.side === THREE.DoubleSide ? THREE.FrontSide : THREE.DoubleSide;
                      material.needsUpdate = true;
                    });
                    onMaterialUpdate?.();
                  }}
                  className="flex-1 py-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icons.DoubleSide />
                  Toggle Double Side
                </button>
              </div>
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