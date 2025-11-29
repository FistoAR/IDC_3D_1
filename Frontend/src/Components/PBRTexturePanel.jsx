// Components/PBRTexturePanel.jsx
import React, { useState, useCallback } from "react";
import * as THREE from "three";

// PBR Presets
const PBR_PRESETS = [
  { name: 'Plastic', icon: '🔵', metalness: 0, roughness: 0.4 },
  { name: 'Metal', icon: '⚙️', metalness: 1, roughness: 0.2 },
  { name: 'Rubber', icon: '⚫', metalness: 0, roughness: 0.9 },
  { name: 'Glass', icon: '💎', metalness: 0, roughness: 0.05, opacity: 0.3 },
  { name: 'Chrome', icon: '✨', metalness: 1, roughness: 0.05 },
  { name: 'Matte', icon: '🎨', metalness: 0, roughness: 1 },
  { name: 'Ceramic', icon: '🏺', metalness: 0, roughness: 0.3 },
  { name: 'Satin', icon: '🎀', metalness: 0.3, roughness: 0.5 },
  { name: 'Gold', icon: '🥇', metalness: 1, roughness: 0.1, color: '#FFD700' },
  { name: 'Silver', icon: '🥈', metalness: 1, roughness: 0.15, color: '#C0C0C0' },
  { name: 'Copper', icon: '🥉', metalness: 1, roughness: 0.25, color: '#B87333' },
  { name: 'Wood', icon: '🪵', metalness: 0, roughness: 0.7, color: '#8B4513' },
];

const TEXTURE_TYPES = [
  { key: 'map', label: 'Albedo/Diffuse', icon: '🎨', description: 'Base color texture' },
  { key: 'normalMap', label: 'Normal Map', icon: '🔲', description: 'Surface detail' },
  { key: 'roughnessMap', label: 'Roughness', icon: '✨', description: 'Surface roughness' },
  { key: 'metalnessMap', label: 'Metalness', icon: '🔩', description: 'Metallic areas' },
  { key: 'aoMap', label: 'Ambient Occlusion', icon: '🌑', description: 'Shadow details' },
  { key: 'displacementMap', label: 'Displacement', icon: '📐', description: 'Height map' },
  { key: 'emissiveMap', label: 'Emissive', icon: '💡', description: 'Glow emission' },
  { key: 'alphaMap', label: 'Alpha/Opacity', icon: '👻', description: 'Transparency' },
];

// ============================================
// DEFAULT TEXTURES LIBRARY
// Add more textures here in the future
// ============================================
const DEFAULT_TEXTURES = [
  {
    id: 'metal_gold_paint',
    name: 'Metal Gold Paint',
    category: 'metal',
    thumbnail: '../assets/Poliigon_MetalGoldPaint_7253/Poliigon_MetalGoldPaint_7253_Preview1.png',
    path: '../assets/Poliigon_MetalGoldPaint_7253/2k',
    files: {
      map: 'Poliigon_MetalGoldPaint_7253_BaseColor.jpg',
      normalMap: 'Poliigon_MetalGoldPaint_7253_Normal.png',
      roughnessMap: 'Poliigon_MetalGoldPaint_7253_Roughness.jpg',
      metalnessMap: 'Poliigon_MetalGoldPaint_7253_Metallic.jpg',
      aoMap: 'Poliigon_MetalGoldPaint_7253_AmbientOcclusion.jpg',
      displacementMap: 'Poliigon_MetalGoldPaint_7253_Displacement.tiff',
    }
  },
  // ============================================
  // ADD MORE TEXTURES HERE IN THE FUTURE:
  // ============================================
  // {
  //   id: 'wood_oak',
  //   name: 'Oak Wood',
  //   category: 'wood',
  //   thumbnail: '/textures/WoodOak/BaseColor.jpg',
  //   path: '/textures/WoodOak',
  //   files: {
  //     map: 'BaseColor.jpg',
  //     normalMap: 'Normal.png',
  //     roughnessMap: 'Roughness.jpg',
  //     aoMap: 'AmbientOcclusion.jpg',
  //   }
  // },
  // {
  //   id: 'concrete_rough',
  //   name: 'Rough Concrete',
  //   category: 'concrete',
  //   thumbnail: '/textures/ConcreteRough/BaseColor.jpg',
  //   path: '/textures/ConcreteRough',
  //   files: {
  //     map: 'BaseColor.jpg',
  //     normalMap: 'Normal.png',
  //     roughnessMap: 'Roughness.jpg',
  //     aoMap: 'AmbientOcclusion.jpg',
  //   }
  // },
];

// ============================================
// PBR Texture Library Component
// ============================================
function PBRTextureLibrary({ onSelectTexture, onClose }) {
  const [textureFolders] = useState(DEFAULT_TEXTURES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTexture, setPreviewTexture] = useState(null);

  const categories = ['all', ...new Set(textureFolders.map(t => t.category))];

  const filteredTextures = textureFolders.filter(texture => {
    const matchesCategory = selectedCategory === 'all' || texture.category === selectedCategory;
    const matchesSearch = texture.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTextureSelect = (texture) => {
    onSelectTexture(texture);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-lg font-bold text-white">PBR Texture Library</h2>
              <p className="text-xs text-gray-400">{textureFolders.length} texture{textureFolders.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search textures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Texture Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTextures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No textures found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTextures.map((texture) => (
                <TextureThumbnail
                  key={texture.id}
                  texture={texture}
                  onSelect={handleTextureSelect}
                  onPreview={setPreviewTexture}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Click to apply • Right-click to preview
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewTexture && (
        <TexturePreviewModal
          texture={previewTexture}
          onClose={() => setPreviewTexture(null)}
          onApply={() => {
            handleTextureSelect(previewTexture);
            setPreviewTexture(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Texture Thumbnail Component
// ============================================
function TextureThumbnail({ texture, onSelect, onPreview }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    onPreview(texture);
  };

  const textureMapCount = Object.keys(texture.files || {}).length;

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all cursor-pointer"
      onClick={() => onSelect(texture)}
      onContextMenu={handleContextMenu}
    >
      {/* Thumbnail Image */}
      <div className="aspect-square relative bg-gray-900">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-700 w-full h-full" />
          </div>
        )}
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <span className="text-3xl">🎨</span>
          </div>
        ) : (
          <img
            src={texture.thumbnail}
            alt={texture.name}
            className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Apply Button (visible on hover) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg">
            Apply
          </span>
        </div>

        {/* Map Count Badge */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-gray-300 font-medium">
          {textureMapCount} maps
        </div>
      </div>

      {/* Name */}
      <div className="p-2.5">
        <p className="text-sm text-gray-200 truncate font-medium">{texture.name}</p>
        <p className="text-[11px] text-gray-500 capitalize">{texture.category}</p>
      </div>
    </div>
  );
}

// ============================================
// Texture Preview Modal
// ============================================
function TexturePreviewModal({ texture, onClose, onApply }) {
  const [previewImageError, setPreviewImageError] = useState(false);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-xl max-w-2xl w-full border border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white">{texture.name}</h3>
            <p className="text-xs text-gray-400 capitalize">{texture.category}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Image */}
        <div className="p-4">
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
            {previewImageError ? (
              <div className="text-center">
                <span className="text-4xl mb-2 block">🎨</span>
                <p className="text-sm text-gray-500">Preview not available</p>
              </div>
            ) : (
              <img
                src={texture.thumbnail}
                alt={texture.name}
                className="w-full h-full object-contain"
                onError={() => setPreviewImageError(true)}
              />
            )}
          </div>

          {/* Available Maps */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Included Maps:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(texture.files || {}).map(([type, file]) => {
                const typeInfo = TEXTURE_TYPES.find(t => t.key === type);
                return (
                  <span
                    key={type}
                    className="px-2.5 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-400 flex items-center gap-1.5 border border-gray-700"
                  >
                    <span>{typeInfo?.icon || '📄'}</span>
                    {typeInfo?.label || type}
                  </span>
                );
              })}
            </div>
          </div>

          {/* File Path Info */}
          <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
            <p className="text-[10px] text-gray-500 font-mono">
              Path: {texture.path}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm text-white font-medium transition-colors"
          >
            Apply Texture
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main PBRTexturePanel Component
// ============================================
function PBRTexturePanel({ 
  material, 
  materialName, 
  onUpdate, 
  expanded: controlledExpanded,
  onExpandedChange,
  isGlobalMode = false,
  materials = []
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const [textures, setTextures] = useState({
    map: null,
    normalMap: null,
    roughnessMap: null,
    metalnessMap: null,
    aoMap: null,
    displacementMap: null,
    emissiveMap: null,
    alphaMap: null,
  });

  const [showLibrary, setShowLibrary] = useState(false);
  const [loadingTextures, setLoadingTextures] = useState(false);
  const [currentTextureSet, setCurrentTextureSet] = useState(null);

  const [originalColor] = useState(() => {
    if (material) {
      return material.color ? material.color.clone() : new THREE.Color(0xffffff);
    }
    return new THREE.Color(0xffffff);
  });

  const [preserveOriginalColor, setPreserveOriginalColor] = useState(true);
  
  const [settings, setSettings] = useState({
    color: material?.color ? `#${material.color.getHexString()}` : "#ffffff",
    metalness: material?.metalness ?? 0.0,
    roughness: material?.roughness ?? 0.5,
    normalScale: material?.normalScale?.x ?? 1.0,
    displacementScale: material?.displacementScale ?? 0.1,
    aoMapIntensity: material?.aoMapIntensity ?? 1.0,
    emissive: material?.emissive ? `#${material.emissive.getHexString()}` : "#000000",
    emissiveIntensity: material?.emissiveIntensity ?? 1.0,
    opacity: material?.opacity ?? 1.0,
    envMapIntensity: material?.envMapIntensity ?? 1.0,
  });

  const textureLoader = new THREE.TextureLoader();

  const [hasVertexColors] = useState(() => {
    return material?.vertexColors === true;
  });

  // Get target materials
  const getTargetMaterials = useCallback(() => {
    if (isGlobalMode && materials.length > 0) {
      return materials;
    }
    return material ? [material] : [];
  }, [isGlobalMode, materials, material]);

  // Apply texture set from library
  const applyTextureSet = useCallback(async (textureInfo) => {
    setLoadingTextures(true);
    setCurrentTextureSet(textureInfo);

    const targetMaterials = getTargetMaterials();
    const loadedTextures = {};

    try {
      // Load all textures from the set
      const loadPromises = Object.entries(textureInfo.files || {}).map(async ([type, filename]) => {
        const url = `${textureInfo.path}/${filename}`;
        
        return new Promise((resolve) => {
          textureLoader.load(
            url,
            (texture) => {
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
              texture.flipY = false;
              
              // Set correct color space
              if (type === 'map' || type === 'emissiveMap') {
                texture.colorSpace = THREE.SRGBColorSpace;
              } else {
                texture.colorSpace = THREE.LinearSRGBColorSpace;
              }
              
              loadedTextures[type] = texture;
              resolve({ type, texture });
            },
            undefined,
            (error) => {
              console.warn(`Failed to load texture: ${url}`, error);
              resolve({ type, texture: null });
            }
          );
        });
      });

      await Promise.all(loadPromises);

      // Apply textures to all target materials
      targetMaterials.forEach(mat => {
        Object.entries(loadedTextures).forEach(([type, texture]) => {
          if (!texture) return;

          const texClone = texture.clone();
          texClone.needsUpdate = true;

          switch (type) {
            case 'map':
              mat.map = texClone;
              if (!preserveOriginalColor) {
                mat.color = new THREE.Color(0xffffff);
              }
              break;
            case 'normalMap':
              mat.normalMap = texClone;
              mat.normalScale = new THREE.Vector2(settings.normalScale, settings.normalScale);
              break;
            case 'roughnessMap':
              mat.roughnessMap = texClone;
              break;
            case 'metalnessMap':
              mat.metalnessMap = texClone;
              break;
            case 'aoMap':
              mat.aoMap = texClone;
              mat.aoMapIntensity = settings.aoMapIntensity;
              break;
            case 'displacementMap':
              mat.displacementMap = texClone;
              mat.displacementScale = settings.displacementScale;
              break;
            case 'emissiveMap':
              mat.emissiveMap = texClone;
              break;
            case 'alphaMap':
              mat.alphaMap = texClone;
              mat.transparent = true;
              break;
            default:
              break;
          }

          mat.needsUpdate = true;
        });
      });

      // Update local state
      setTextures(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(loadedTextures).map(([type, texture]) => [
            type,
            texture ? { texture, url: `${textureInfo.path}/${textureInfo.files[type]}` } : null
          ])
        )
      }));

      onUpdate?.();
    } catch (error) {
      console.error('Error applying texture set:', error);
    }

    setLoadingTextures(false);
    setShowLibrary(false);
  }, [getTargetMaterials, settings, onUpdate, textureLoader, preserveOriginalColor]);

  // Remove texture
  const removeTexture = useCallback((type) => {
    if (textures[type]?.texture) {
      textures[type].texture.dispose();
    }
    
    const targetMaterials = getTargetMaterials();
    
    targetMaterials.forEach(mat => {
      mat[type] = null;
      
      if (type === 'map' && preserveOriginalColor) {
        if (!isGlobalMode && material) {
          mat.color = originalColor.clone();
        }
      }
      
      mat.needsUpdate = true;
    });
    
    setTextures(prev => ({ ...prev, [type]: null }));
    onUpdate?.();
  }, [getTargetMaterials, textures, onUpdate, originalColor, preserveOriginalColor, isGlobalMode, material]);

  // Handle setting change
  const handleSettingChange = useCallback((setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    
    const targetMaterials = getTargetMaterials();
    
    targetMaterials.forEach(mat => {
      switch (setting) {
        case 'color':
          if (!preserveOriginalColor) {
            mat.color = new THREE.Color(value);
          }
          break;
        case 'metalness':
          mat.metalness = value;
          break;
        case 'roughness':
          mat.roughness = value;
          break;
        case 'normalScale':
          if (mat.normalScale) {
            mat.normalScale = new THREE.Vector2(value, value);
          }
          break;
        case 'displacementScale':
          mat.displacementScale = value;
          break;
        case 'aoMapIntensity':
          mat.aoMapIntensity = value;
          break;
        case 'emissive':
          mat.emissive = new THREE.Color(value);
          break;
        case 'emissiveIntensity':
          mat.emissiveIntensity = value;
          break;
        case 'opacity':
          mat.opacity = value;
          mat.transparent = value < 1;
          break;
        case 'envMapIntensity':
          mat.envMapIntensity = value;
          break;
        default:
          break;
      }
      
      mat.needsUpdate = true;
    });
    
    onUpdate?.();
  }, [getTargetMaterials, onUpdate, preserveOriginalColor]);

  // Handle preserve color toggle
  const handlePreserveColorToggle = useCallback((preserve) => {
    setPreserveOriginalColor(preserve);
    
    if (preserve && !isGlobalMode && material) {
      material.color = originalColor.clone();
      setSettings(prev => ({ ...prev, color: `#${originalColor.getHexString()}` }));
      material.needsUpdate = true;
    }
    
    onUpdate?.();
  }, [material, originalColor, onUpdate, isGlobalMode]);

  // Apply preset
  const applyPreset = useCallback((preset) => {
    const targetMaterials = getTargetMaterials();
    
    targetMaterials.forEach(mat => {
      mat.metalness = preset.metalness;
      mat.roughness = preset.roughness;
      
      if (preset.opacity !== undefined) {
        mat.opacity = preset.opacity;
        mat.transparent = preset.opacity < 1;
      }
      
      if (preset.color && !preserveOriginalColor) {
        mat.color = new THREE.Color(preset.color);
      }
      
      mat.needsUpdate = true;
    });
    
    setSettings(prev => ({
      ...prev,
      metalness: preset.metalness,
      roughness: preset.roughness,
      ...(preset.opacity !== undefined && { opacity: preset.opacity }),
      ...(preset.color && !preserveOriginalColor && { color: preset.color }),
    }));
    
    onUpdate?.();
  }, [getTargetMaterials, onUpdate, preserveOriginalColor]);

  // Reset settings
  const resetSettings = useCallback(() => {
    const targetMaterials = getTargetMaterials();
    
    targetMaterials.forEach(mat => {
      mat.metalness = 0;
      mat.roughness = 0.5;
      mat.opacity = 1;
      mat.transparent = false;
      mat.emissive = new THREE.Color(0x000000);
      mat.emissiveIntensity = 1;
      mat.envMapIntensity = 1;
      mat.needsUpdate = true;
    });
    
    setSettings({
      color: material?.color ? `#${material.color.getHexString()}` : "#ffffff",
      metalness: 0,
      roughness: 0.5,
      normalScale: 1,
      displacementScale: 0.1,
      aoMapIntensity: 1,
      emissive: "#000000",
      emissiveIntensity: 1,
      opacity: 1,
      envMapIntensity: 1,
    });
    
    handlePreserveColorToggle(true);
    setCurrentTextureSet(null);
    onUpdate?.();
  }, [getTargetMaterials, material, handlePreserveColorToggle, onUpdate]);

  // Clear all textures
  const clearAllTextures = useCallback(() => {
    Object.keys(textures).forEach(key => {
      if (textures[key]) {
        removeTexture(key);
      }
    });
    setCurrentTextureSet(null);
  }, [textures, removeTexture]);

  const handleExpandToggle = () => {
    if (onExpandedChange) {
      onExpandedChange(!expanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const loadedTextureCount = Object.values(textures).filter(t => t !== null).length;

  // ============================================
  // GLOBAL MODE UI
  // ============================================
  if (isGlobalMode) {
    return (
      <div className="space-y-4">
        {/* Texture Library Button */}
        <button
          onClick={() => setShowLibrary(true)}
          className="w-full p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl hover:from-blue-500/30 hover:to-purple-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-2xl">🎨</span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                Open Texture Library
              </h3>
              <p className="text-xs text-gray-400">
                Browse and apply PBR texture sets
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Current Texture Set Info */}
        {currentTextureSet && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <div>
                  <p className="text-sm text-green-400 font-medium">{currentTextureSet.name}</p>
                  <p className="text-xs text-gray-500">
                    {Object.keys(currentTextureSet.files || {}).length} maps applied
                  </p>
                </div>
              </div>
              <button
                onClick={clearAllTextures}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-400"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loadingTextures && (
          <div className="flex items-center justify-center p-4 bg-gray-800/50 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-sm text-gray-400">Loading textures...</span>
          </div>
        )}

        {/* Preserve Original Color Toggle */}
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <div>
                <span className="text-sm text-gray-300">Preserve Original Colors</span>
                <p className="text-[10px] text-gray-500">Keep model's original material colors</p>
              </div>
            </div>
            <button
              onClick={() => handlePreserveColorToggle(!preserveOriginalColor)}
              className={`w-11 h-6 rounded-full transition-all ${
                preserveOriginalColor ? "bg-purple-500" : "bg-gray-600"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-md ml-1 transition-transform ${
                preserveOriginalColor ? "translate-x-5" : ""
              }`} />
            </button>
          </div>
        </div>

        {/* PBR Properties */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>⚙️</span>
            PBR Properties (All Materials)
          </h4>
          
          {/* Base Color */}
          <div className={`flex items-center justify-between ${preserveOriginalColor ? 'opacity-50' : ''}`}>
            <label className="text-xs text-gray-400">Base Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => handleSettingChange('color', e.target.value)}
                disabled={preserveOriginalColor}
                className={`w-8 h-8 rounded cursor-pointer border border-gray-600 ${
                  preserveOriginalColor ? 'cursor-not-allowed' : ''
                }`}
              />
              <span className="text-xs text-gray-500 font-mono w-16">{settings.color}</span>
            </div>
          </div>

          {/* Metalness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <span>🔩</span> Metalness
              </label>
              <span className="text-xs text-gray-500 font-mono">{settings.metalness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.metalness}
              onChange={(e) => handleSettingChange('metalness', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Roughness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <span>✨</span> Roughness
              </label>
              <span className="text-xs text-gray-500 font-mono">{settings.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.roughness}
              onChange={(e) => handleSettingChange('roughness', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <span>👻</span> Opacity
              </label>
              <span className="text-xs text-gray-500 font-mono">{settings.opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.opacity}
              onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500"
            />
          </div>

          {/* Env Map Intensity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <span>🌍</span> Env Intensity
              </label>
              <span className="text-xs text-gray-500 font-mono">{settings.envMapIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={settings.envMapIntensity}
              onChange={(e) => handleSettingChange('envMapIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* Emissive Settings */}
        <div className="space-y-3 pt-2 border-t border-gray-700/50">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>💡</span>
            Emissive (Glow)
          </h4>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Emissive Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.emissive}
                onChange={(e) => handleSettingChange('emissive', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-600"
              />
              <span className="text-xs text-gray-500 font-mono w-16">{settings.emissive}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Intensity</label>
              <span className="text-xs text-gray-500 font-mono">{settings.emissiveIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={settings.emissiveIntensity}
              onChange={(e) => handleSettingChange('emissiveIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Texture-specific Settings */}
        {(textures.normalMap || textures.displacementMap || textures.aoMap) && (
          <div className="space-y-3 pt-2 border-t border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Texture Settings
            </h4>

            {textures.normalMap && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Normal Scale</label>
                  <span className="text-xs text-gray-500 font-mono">{settings.normalScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.05"
                  value={settings.normalScale}
                  onChange={(e) => handleSettingChange('normalScale', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            )}

            {textures.displacementMap && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Displacement Scale</label>
                  <span className="text-xs text-gray-500 font-mono">{settings.displacementScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.displacementScale}
                  onChange={(e) => handleSettingChange('displacementScale', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            )}

            {textures.aoMap && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">AO Intensity</label>
                  <span className="text-xs text-gray-500 font-mono">{settings.aoMapIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={settings.aoMapIntensity}
                  onChange={(e) => handleSettingChange('aoMapIntensity', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Presets */}
        <div className="pt-2 border-t border-gray-700/50">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quick Presets
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            {PBR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 border border-transparent hover:border-gray-600 transition-all"
                title={`${preset.name}: M=${preset.metalness}, R=${preset.roughness}`}
              >
                <span className="text-base">{preset.icon}</span>
                <span className="text-[9px] text-gray-400 mt-0.5">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-700/50">
          <button
            onClick={resetSettings}
            className="flex-1 px-2 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All
          </button>
          <button
            onClick={clearAllTextures}
            disabled={loadedTextureCount === 0}
            className="flex-1 px-2 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Textures
          </button>
        </div>

        {/* Texture Library Modal */}
        {showLibrary && (
          <PBRTextureLibrary
            onSelectTexture={applyTextureSet}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </div>
    );
  }

  // ============================================
  // INDIVIDUAL MATERIAL PANEL (Collapsible)
  // ============================================
  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-800/30">
      {/* Header */}
      <button
        onClick={handleExpandToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border border-gray-600 flex-shrink-0"
            style={{ 
              backgroundColor: settings.color,
              background: hasVertexColors 
                ? 'linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6)'
                : settings.color
            }}
          />
          <span className="text-sm font-medium text-gray-200 truncate max-w-[140px]">
            {materialName}
          </span>
          {loadedTextureCount > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">
              {loadedTextureCount} tex
            </span>
          )}
          {currentTextureSet && (
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] truncate max-w-[60px]">
              {currentTextureSet.name}
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-4 border-t border-gray-700/50">
          {/* Texture Library Button */}
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <div className="flex-1 text-left">
                <p className="text-xs font-medium text-white">Browse Texture Library</p>
                <p className="text-[10px] text-gray-500">Apply complete PBR texture sets</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Current texture set indicator */}
          {currentTextureSet && (
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
              <span className="text-xs text-green-400">✅ {currentTextureSet.name}</span>
              <button
                onClick={clearAllTextures}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loadingTextures && (
            <div className="flex items-center justify-center p-3 bg-gray-800/50 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-xs text-gray-400">Loading...</span>
            </div>
          )}

          {/* Preserve Original Color Toggle */}
          <div className="p-2.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🎨</span>
                <span className="text-xs text-gray-300">Preserve Color</span>
              </div>
              <button
                onClick={() => handlePreserveColorToggle(!preserveOriginalColor)}
                className={`w-10 h-5 rounded-full transition-all ${
                  preserveOriginalColor ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md ml-0.5 transition-transform ${
                  preserveOriginalColor ? "translate-x-5" : ""
                }`} />
              </button>
            </div>
          </div>

          {/* PBR Properties */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              PBR Properties
            </h4>
            
            {/* Metalness */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Metalness</label>
                <span className="text-[10px] text-gray-500 font-mono">{settings.metalness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.metalness}
                onChange={(e) => handleSettingChange('metalness', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Roughness */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Roughness</label>
                <span className="text-[10px] text-gray-500 font-mono">{settings.roughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.roughness}
                onChange={(e) => handleSettingChange('roughness', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Opacity</label>
                <span className="text-[10px] text-gray-500 font-mono">{settings.opacity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.opacity}
                onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500"
              />
            </div>
          </div>

          {/* Texture-specific Settings */}
          {(textures.normalMap || textures.displacementMap || textures.aoMap) && (
            <div className="space-y-3 pt-2 border-t border-gray-700/50">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Texture Settings
              </h4>

              {textures.normalMap && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Normal Scale</label>
                    <span className="text-[10px] text-gray-500 font-mono">{settings.normalScale.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.05"
                    value={settings.normalScale}
                    onChange={(e) => handleSettingChange('normalScale', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}

              {textures.displacementMap && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Displacement</label>
                    <span className="text-[10px] text-gray-500 font-mono">{settings.displacementScale.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.displacementScale}
                    onChange={(e) => handleSettingChange('displacementScale', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                </div>
              )}

              {textures.aoMap && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">AO Intensity</label>
                    <span className="text-[10px] text-gray-500 font-mono">{settings.aoMapIntensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={settings.aoMapIntensity}
                    onChange={(e) => handleSettingChange('aoMapIntensity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Presets */}
          <div className="pt-2 border-t border-gray-700/50">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Presets
            </h4>
            <div className="flex flex-wrap gap-1">
              {PBR_PRESETS.slice(0, 8).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 rounded bg-gray-700/30 hover:bg-gray-700/50 text-[10px] text-gray-400 transition-all"
                  title={preset.name}
                >
                  {preset.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-700/50">
            <button
              onClick={resetSettings}
              className="flex-1 px-2 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded text-[10px] text-gray-400 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={clearAllTextures}
              disabled={loadedTextureCount === 0}
              className="flex-1 px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-[10px] text-red-400 transition-colors disabled:opacity-50"
            >
              Clear Tex
            </button>
          </div>
        </div>
      )}

      {/* Texture Library Modal */}
      {showLibrary && (
        <PBRTextureLibrary
          onSelectTexture={applyTextureSet}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}

export default PBRTexturePanel;