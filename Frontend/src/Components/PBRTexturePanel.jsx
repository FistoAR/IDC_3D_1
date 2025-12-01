// Components/PBRTexturePanel.jsx
import React, { useState, useCallback, useRef } from "react";
import * as THREE from "three";

// ============================================================================
// 1. IMPORT YOUR TEXTURES HERE
// ============================================================================
import goldBaseColor from '../assets/Poliigon_MetalGoldPaint_7253/2K/Poliigon_MetalGoldPaint_7253_BaseColor.jpg';
import goldNormal from '../assets/Poliigon_MetalGoldPaint_7253/2K/Poliigon_MetalGoldPaint_7253_Normal.png';
import goldRoughness from '../assets/Poliigon_MetalGoldPaint_7253/2K/Poliigon_MetalGoldPaint_7253_Roughness.jpg';
import goldMetallic from '../assets/Poliigon_MetalGoldPaint_7253/2K/Poliigon_MetalGoldPaint_7253_Metallic.jpg';
import goldAO from '../assets/Poliigon_MetalGoldPaint_7253/2K/Poliigon_MetalGoldPaint_7253_AmbientOcclusion.jpg';
import goldPreview from '../assets/Poliigon_MetalGoldPaint_7253/Poliigon_MetalGoldPaint_7253_Preview1.png';

// ============================================================================
// 2. IMPORT YOUR TEXTURES HERE
// ============================================================================
import grassBaseColor from '../assets/Poliigon_GrassPatchyGround_4585/2K/Poliigon_GrassPatchyGround_4585_BaseColor.jpg';
import grassNormal from '../assets/Poliigon_GrassPatchyGround_4585/2K/Poliigon_GrassPatchyGround_4585_Normal.png';
import grassRoughness from '../assets/Poliigon_GrassPatchyGround_4585/2K/Poliigon_GrassPatchyGround_4585_Roughness.jpg';
import grassMetallic from '../assets/Poliigon_GrassPatchyGround_4585/2K/Poliigon_GrassPatchyGround_4585_Metallic.jpg';
import grassAO from '../assets/Poliigon_GrassPatchyGround_4585/2K/Poliigon_GrassPatchyGround_4585_AmbientOcclusion.jpg';
import grassPreview from '../assets/Poliigon_GrassPatchyGround_4585/Poliigon_GrassPatchyGround_4585_Preview1.png';

// ============================================================================
// 3. IMPORT YOUR TEXTURES HERE
// ============================================================================
import sandBaseColor from '../assets/GroundSand005/GroundSand005_COL_2K.jpg';
import sandNormal from '../assets/GroundSand005/GroundSand005_NRM_2K.jpg';
import sandGloss from '../assets/GroundSand005/GroundSand005_GLOSS_2K.jpg'; // Using Gloss as Roughness
import sandAO from '../assets/GroundSand005/GroundSand005_AO_2K.jpg';
import sandMetallic from '../assets/GroundSand005/GroundSand005_DISP_2K.jpg';
import sandPreview from '../assets/GroundSand005/GroundSand005_Preview1.png';

// ============================================================================
// 4 IMPORT YOUR TEXTURES HERE
// ============================================================================
import GroundBaseColor from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_COL_2K.jpg';
import GroundNormal from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_NRM_2K.jpg';
import GroundGloss from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_GLOSS_2K.jpg'; // Using Gloss as Roughness
import GroundAO from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_AO_2K.jpg';
import GroundMetallic from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_DISP_2K.jpg';
import GroundPreview from '../assets/GroundDirtWeedsPatchy004/GroundDirtWeedsPatchy004_Preview1.png';

// ============================================================================
// 5. IMPORT YOUR TEXTURES HERE
// ============================================================================
import RattanWeaveBaseColor from '../assets/Poliigon_RattanWeave_6945/2K/Poliigon_RattanWeave_6945_BaseColor.jpg';
import RattanWeaveNormal from '../assets/Poliigon_RattanWeave_6945/2K/Poliigon_RattanWeave_6945_Normal.png';
import RattanWeaveRoughness from '../assets/Poliigon_RattanWeave_6945/2K/Poliigon_RattanWeave_6945_Roughness.jpg';
import RattanWeaveMetallic from '../assets/Poliigon_RattanWeave_6945/2K/Poliigon_RattanWeave_6945_Metallic.jpg';
import RattanWeaveAO from '../assets/Poliigon_RattanWeave_6945/2K/Poliigon_RattanWeave_6945_AmbientOcclusion.jpg';
import RattanWeavePreview from '../assets/Poliigon_RattanWeave_6945/Poliigon_RattanWeave_6945_Preview1.png';

// ============================================================================
// 6. IMPORT YOUR TEXTURES HERE
// ============================================================================
import TilesSquareBaseColor from '../assets/TilesSquarePoolMixed001/TilesSquarePoolMixed001_COL_2K.jpg';
import TilesSquareNormal from '../assets/TilesSquarePoolMixed001/TilesSquarePoolMixed001_NRM_2K.jpg';
import TilesSquareGloss from '../assets/TilesSquarePoolMixed001/TilesSquarePoolMixed001_GLOSS_2K.jpg'; // Using Gloss as Roughness
// import TilesSquareAO from '../assets/TilesSquarePoolMixed001/GroundDirtWeedsPatchy004_AO_2K.jpg';
import TilesSquareMetallic from '../assets/TilesSquarePoolMixed001/TilesSquarePoolMixed001_REFL_2K.jpg';
import TilesSquarePreview from '../assets/TilesSquarePoolMixed001/TilesSquarePoolMixed001_Preview1.png';

const TEXTURE_TYPES = [
  { key: 'map', label: 'Color', icon: '🎨' },
  { key: 'normalMap', label: 'Normal', icon: '🔲' },
  { key: 'roughnessMap', label: 'Rough', icon: '✨' },
  { key: 'metalnessMap', label: 'Metal', icon: '🔩' },
  { key: 'aoMap', label: 'AO', icon: '🌑' },
  { key: 'emissiveMap', label: 'Emiss', icon: '💡' },
];

// ============================================
// 2. DEFINE DEFAULT TEXTURES
// ============================================
const DEFAULT_TEXTURES = [
  {
    id: 'metal_gold_paint',
    name: 'Metal Gold Paint',
    category: 'metal',
    thumbnail: goldPreview, 
    files: {
      map: goldBaseColor,
      normalMap: goldNormal,
      roughnessMap: goldRoughness,
      metalnessMap: goldMetallic,
      aoMap: goldAO,
    }
  },
  {
    id: 'grass_paint',
    name: 'Grass Paint',
    category: 'nature',
    thumbnail: grassPreview, 
    files: {
      map: grassBaseColor,
      normalMap: grassNormal,
      roughnessMap: grassRoughness,
      metalnessMap: grassMetallic,
      aoMap: grassAO,
    }
  },
  {
    id: 'sand',
    name: 'Sand',
    category: 'nature',
    thumbnail: sandPreview, 
    files: {
      map: sandBaseColor,
      normalMap: sandNormal,
      roughnessMap: sandGloss,
      metalnessMap: sandMetallic,
      aoMap: sandAO,
    }
  },
  {
    id: 'Dirty_Sand',
    name: 'Sand1',
    category: 'nature',
    thumbnail: GroundPreview, 
    files: {
      map: GroundBaseColor,
      normalMap: GroundNormal,
      roughnessMap: GroundGloss,
      metalnessMap: GroundMetallic,
      aoMap: GroundAO,
    }
  },
  {
    id: 'rattan_weave',
    name: 'Rattan Weave',
    category: 'nature',
    thumbnail: RattanWeavePreview, 
    files: {
      map: RattanWeaveBaseColor,
      normalMap: RattanWeaveNormal,
      roughnessMap: RattanWeaveRoughness,
      metalnessMap: RattanWeaveMetallic,
      aoMap: RattanWeaveAO,
    }
  },
  {
    id: 'Tiles_Square_Pool_Mixed',
    name: 'Tiles Square Pool Mixed',
    category: 'nature',
    thumbnail: TilesSquarePreview, 
    files: {
      map: TilesSquareBaseColor,
      normalMap: TilesSquareNormal,
      roughnessMap: TilesSquareGloss,
      metalnessMap: TilesSquareMetallic,
    }
  },
];

// ============================================
// Texture Loader Utility
// ============================================
const loadTexture = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        // Enable wrapping so scaling works
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = true;
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load texture: ${url}`, error);
        reject(error);
      }
    );
  });
};

// ============================================
// INLINE PBR Texture Library Component
// ============================================
function PBRTextureLibrary({ onSelectTexture, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customTextures, setCustomTextures] = useState([]);
  const fileInputRef = useRef(null);

  const allTextures = [...DEFAULT_TEXTURES, ...customTextures];
  
  const filteredTextures = allTextures.filter(texture => 
    texture.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomTextureUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const textureFiles = {};
    const folderName = files[0].webkitRelativePath?.split('/')[0] || 'Custom Texture';
    
    files.forEach(file => {
      const fileName = file.name.toLowerCase();
      if(fileName.endsWith('.tiff') || fileName.endsWith('.tif')) return;

      const url = URL.createObjectURL(file);
      
      if (fileName.includes('basecolor') || fileName.includes('diffuse') || fileName.includes('albedo') || fileName.includes('_col_')) {
        textureFiles.map = { url };
      } else if (fileName.includes('normal') || fileName.includes('_nrm_')) {
        textureFiles.normalMap = { url };
      } else if (fileName.includes('roughness') || fileName.includes('_rgh_') || fileName.includes('_gloss_')) {
        textureFiles.roughnessMap = { url };
      } else if (fileName.includes('metallic') || fileName.includes('metalness') || fileName.includes('_met_')) {
        textureFiles.metalnessMap = { url };
      } else if (fileName.includes('ao') || fileName.includes('occlusion')) {
        textureFiles.aoMap = { url };
      } else if (fileName.includes('displacement') || fileName.includes('height') || fileName.includes('_disp_')) {
        textureFiles.displacementMap = { url };
      } else if (fileName.includes('emissive') || fileName.includes('emission')) {
        textureFiles.emissiveMap = { url };
      }
    });

    if (Object.keys(textureFiles).length > 0) {
      setCustomTextures(prev => [...prev, {
        id: `custom_${Date.now()}`,
        name: folderName,
        category: 'custom',
        thumbnail: textureFiles.map?.url || null,
        isCustom: true,
        customFiles: textureFiles,
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header / Navigation */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-sm font-bold text-white">Texture Library</h3>
      </div>

      {/* Search & Upload */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
        />
        <input ref={fileInputRef} type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={handleCustomTextureUpload} />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-400 hover:text-blue-300"
          title="Upload Folder"
        >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </button>
      </div>

      {/* Texture Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {filteredTextures.map((texture) => {
            const thumbnailSrc = texture.isCustom ? texture.customFiles?.map?.url : texture.thumbnail;
            const mapCount = Object.keys(texture.isCustom ? texture.customFiles : texture.files).length;
            
            return (
              <button
                key={texture.id}
                onClick={() => onSelectTexture(texture)}
                className="group relative flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all text-left"
              >
                <div className="aspect-square w-full relative bg-gray-800">
                    {thumbnailSrc ? (
                        <img src={thumbnailSrc} className="w-full h-full object-cover" alt={texture.name} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                    )}
                    <div className="absolute top-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white font-mono">
                        {mapCount}
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow-lg">Apply</span>
                    </div>
                </div>
                <div className="p-2 w-full">
                  <p className="text-[10px] text-gray-200 truncate font-medium w-full">{texture.name}</p>
                  <p className="text-[9px] text-gray-500 capitalize">{texture.category}</p>
                </div>
              </button>
            );
        })}
      </div>
      
      {filteredTextures.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">No textures found</div>
      )}
    </div>
  );
}

// Texture Slot Helper
function TextureSlot({ type, typeInfo, texture, onUpload, onRemove, disabled }) {
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(type, file);
  };

  return (
    <div
      className={`relative p-1.5 rounded border transition-all flex items-center gap-2 ${
        texture ? 'border-green-500/40 bg-green-500/5' : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && !texture && fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={disabled} />
      
      <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs ${texture ? 'bg-black/20' : 'bg-gray-700/50'}`}>
        {texture ? <img src={texture.url} alt="" className="w-full h-full object-cover rounded" /> : <span>{typeInfo.icon}</span>}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 truncate">{typeInfo.label}</p>
      </div>
      
      {texture && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(type); }} className="p-1 hover:bg-red-500/20 rounded text-red-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
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
  
  const [textures, setTextures] = useState({});
  const [showLibrary, setShowLibrary] = useState(false);
  const [loadingTextures, setLoadingTextures] = useState(false);
  const [currentTextureSet, setCurrentTextureSet] = useState(null);
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
    // NEW SETTING: Controls texture tiling
    repeat: 1.0 
  });

  const getTargetMaterials = useCallback(() => isGlobalMode && materials.length > 0 ? materials : (material ? [material] : []), [isGlobalMode, materials, material]);

  const applyTextureToMaterial = (mat, type, texture, settings, preserveColor) => {
    if(type === 'map' && !preserveColor) mat.color = new THREE.Color(0xffffff);
    if(type === 'normalMap') mat.normalScale = new THREE.Vector2(settings.normalScale, settings.normalScale);
    if(type === 'aoMap') mat.aoMapIntensity = settings.aoMapIntensity;
    if(type === 'displacementMap') mat.displacementScale = settings.displacementScale;
    if(type === 'emissiveMap') { mat.emissive = new THREE.Color(settings.emissive); mat.emissiveIntensity = settings.emissiveIntensity; }
    if(type === 'alphaMap') mat.transparent = true;
    
    // APPLY REPEAT SETTING
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(settings.repeat, settings.repeat);
    }

    mat[type] = texture;
    mat.needsUpdate = true;
  };

  const handleTextureUpload = useCallback(async (type, file) => {
    const url = URL.createObjectURL(file);
    try {
      const texture = await loadTexture(url);
      if (type === 'map' || type === 'emissiveMap') texture.colorSpace = THREE.SRGBColorSpace;
      else texture.colorSpace = THREE.LinearSRGBColorSpace;
      
      getTargetMaterials().forEach(mat => applyTextureToMaterial(mat, type, texture.clone(), settings, preserveOriginalColor));
      setTextures(prev => ({ ...prev, [type]: { texture, url } }));
      onUpdate?.();
    } catch (error) { console.error(error); }
  }, [getTargetMaterials, settings, preserveOriginalColor, onUpdate]);

  const applyTextureSet = useCallback(async (textureInfo) => {
    setLoadingTextures(true);
    setCurrentTextureSet(textureInfo);

    const targetMaterials = getTargetMaterials();
    const loadedTextures = {};

    try {
      let entries;
      if (textureInfo.isCustom) {
         entries = Object.entries(textureInfo.customFiles || {});
      } else {
         entries = Object.entries(textureInfo.files || {});
      }

      for (const [type, fileInfo] of entries) {
        const url = typeof fileInfo === 'string' ? fileInfo : fileInfo.url;
        try {
          const texture = await loadTexture(url);
          if (type === 'map' || type === 'emissiveMap') texture.colorSpace = THREE.SRGBColorSpace;
          else texture.colorSpace = THREE.LinearSRGBColorSpace;
          loadedTextures[type] = texture;
        } catch (err) { console.warn(`Skipped ${type}`); }
      }

      targetMaterials.forEach(mat => {
        Object.entries(loadedTextures).forEach(([type, texture]) => {
          applyTextureToMaterial(mat, type, texture.clone(), settings, preserveOriginalColor);
        });
      });

      setTextures(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(loadedTextures).map(([type, texture]) => [type, { texture, url: 'loaded' }]))
      }));

      onUpdate?.();
    } catch (error) { console.error(error); }
    setLoadingTextures(false);
    setShowLibrary(false);
  }, [getTargetMaterials, settings, onUpdate, preserveOriginalColor]);

  const removeTexture = useCallback((type) => {
    if (textures[type]?.texture) textures[type].texture.dispose();
    getTargetMaterials().forEach(mat => {
      mat[type] = null;
      if (type === 'map' && preserveOriginalColor && !isGlobalMode && material) mat.color = new THREE.Color(material.color); 
      mat.needsUpdate = true;
    });
    setTextures(prev => ({ ...prev, [type]: null }));
    onUpdate?.();
  }, [getTargetMaterials, textures, onUpdate, preserveOriginalColor, isGlobalMode, material]);

  const handleSettingChange = useCallback((setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    getTargetMaterials().forEach(mat => {
        if(setting === 'color' && !preserveOriginalColor) mat.color = new THREE.Color(value);
        if(setting === 'metalness') mat.metalness = value;
        if(setting === 'roughness') mat.roughness = value;
        if(setting === 'normalScale' && mat.normalMap) mat.normalScale = new THREE.Vector2(value, value);
        if(setting === 'displacementScale') mat.displacementScale = value;
        if(setting === 'aoMapIntensity') mat.aoMapIntensity = value;
        if(setting === 'opacity') { mat.opacity = value; mat.transparent = value < 1; }
        if(setting === 'emissive') mat.emissive = new THREE.Color(value);
        if(setting === 'emissiveIntensity') mat.emissiveIntensity = value;
        
        // UPDATE TEXTURE REPEAT ON ALL MAPS
        if(setting === 'repeat') {
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'displacementMap', 'emissiveMap', 'alphaMap'].forEach(mapType => {
                if(mat[mapType]) {
                    mat[mapType].repeat.set(value, value);
                }
            });
        }

        mat.needsUpdate = true;
    });
    onUpdate?.();
  }, [getTargetMaterials, onUpdate, preserveOriginalColor]);

  // ============================================
  // RENDER CONTENT
  // ============================================
  const renderMainContent = () => (
    <div className="space-y-4">
        {/* 1. Library Button & Status */}
        <div className="space-y-2">
            <button 
                onClick={() => setShowLibrary(true)} 
                className="w-full p-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg text-white flex items-center justify-between group transition-all hover:from-blue-500/30 hover:to-purple-500/30"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <div className="text-left">
                        <div className="text-xs font-bold text-blue-100 group-hover:text-white">Texture Library</div>
                        <div className="text-[10px] text-blue-300/70">Browse & Apply Sets</div>
                    </div>
                </div>
                <svg className="w-4 h-4 text-blue-300 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            {currentTextureSet && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded text-[10px]">
                    <span className="text-green-400 truncate flex-1 mr-2">✓ {currentTextureSet.name}</span>
                    <button onClick={() => { 
                        Object.keys(textures).forEach(t => removeTexture(t)); 
                        setCurrentTextureSet(null); 
                    }} className="text-red-400 hover:text-red-300">Clear</button>
                </div>
            )}
        </div>

        {/* 2. Individual Uploads (HIDDEN WHEN SET APPLIED) */}
        {!currentTextureSet && (
            <div className="space-y-1.5">
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Maps</h4>
                <div className="grid grid-cols-2 gap-1.5">
                    {TEXTURE_TYPES.map(t => (
                        <TextureSlot key={t.key} type={t.key} typeInfo={t} texture={textures[t.key]} onUpload={handleTextureUpload} onRemove={removeTexture} />
                    ))}
                </div>
            </div>
        )}

        {/* 3. Sliders / Adjustment Bars */}
        <div className="space-y-3 pt-2 border-t border-gray-700/50">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Properties</h4>
            
            {/* Texture Scale Slider (REPEAT) */}
            <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-blue-300"><span>Texture Scale</span><span>{settings.repeat.toFixed(1)}x</span></div>
                 <input type="range" min="0.1" max="10" step="0.1" value={settings.repeat} onChange={e=>handleSettingChange('repeat', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-cyan-500" />
            </div>

            {/* Standard PBR Sliders */}
            <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-gray-400"><span>Metalness</span><span>{settings.metalness.toFixed(2)}</span></div>
                 <input type="range" min="0" max="1" step="0.01" value={settings.metalness} onChange={e=>handleSettingChange('metalness', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-blue-500" />
            </div>
            
            <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-gray-400"><span>Roughness</span><span>{settings.roughness.toFixed(2)}</span></div>
                 <input type="range" min="0" max="1" step="0.01" value={settings.roughness} onChange={e=>handleSettingChange('roughness', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-yellow-500" />
            </div>

            {/* Conditional Sliders (Only show if texture is present) */}
            {textures.normalMap && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-purple-400"><span>Normal Scale</span><span>{settings.normalScale.toFixed(1)}</span></div>
                    <input type="range" min="-2" max="2" step="0.1" value={settings.normalScale} onChange={e=>handleSettingChange('normalScale', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-purple-500" />
                </div>
            )}

            {textures.displacementMap && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-green-400"><span>Displacement</span><span>{settings.displacementScale.toFixed(2)}</span></div>
                    <input type="range" min="0" max="0.5" step="0.01" value={settings.displacementScale} onChange={e=>handleSettingChange('displacementScale', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-green-500" />
                </div>
            )}

            {textures.aoMap && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-300"><span>AO Intensity</span><span>{settings.aoMapIntensity.toFixed(1)}</span></div>
                    <input type="range" min="0" max="2" step="0.1" value={settings.aoMapIntensity} onChange={e=>handleSettingChange('aoMapIntensity', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-gray-500" />
                </div>
            )}

            {textures.emissiveMap && (
                <div className="space-y-2 p-2 bg-gray-700/20 rounded-lg">
                    <div className="flex items-center justify-between">
                         <span className="text-[10px] text-orange-400">Emissive Color</span>
                         <input type="color" value={settings.emissive} onChange={e=>handleSettingChange('emissive', e.target.value)} className="w-5 h-5 rounded cursor-pointer border-none" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-orange-400"><span>Intensity</span><span>{settings.emissiveIntensity.toFixed(1)}</span></div>
                        <input type="range" min="0" max="5" step="0.1" value={settings.emissiveIntensity} onChange={e=>handleSettingChange('emissiveIntensity', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg accent-orange-500" />
                    </div>
                </div>
            )}

            {/* Color Toggle */}
            <div className="flex items-center justify-between pt-1">
                 <span className="text-[10px] text-gray-400">Preserve Orig. Color</span>
                 <button onClick={() => {
                     setPreserveOriginalColor(!preserveOriginalColor);
                     if(!preserveOriginalColor && !isGlobalMode && material) { material.color = new THREE.Color(originalColor); material.needsUpdate = true; onUpdate?.(); }
                 }} className={`w-8 h-4 rounded-full relative transition-colors ${preserveOriginalColor ? 'bg-blue-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${preserveOriginalColor ? 'translate-x-4' : ''}`} />
                 </button>
            </div>
        </div>
    </div>
  );

  // Wrapper
  return (
    <div className={isGlobalMode ? "" : "border border-gray-700/50 rounded-lg overflow-hidden bg-gray-800/30"}>
      {!isGlobalMode && (
        <button 
            onClick={() => onExpandedChange ? onExpandedChange(!expanded) : setInternalExpanded(!internalExpanded)} 
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
        >
           <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm border border-white/10" style={{backgroundColor: settings.color}}></div>
                <span className="text-sm font-medium text-gray-200 truncate max-w-[120px]">{materialName}</span>
           </div>
           <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      )}

      {(isGlobalMode || expanded) && (
        <div className={isGlobalMode ? "" : "p-3 pt-0 border-t border-gray-700/50"}>
            {/* SWITCH VIEW LOGIC */}
            {showLibrary ? (
                <div className={isGlobalMode ? "" : "pt-2"}>
                    <PBRTextureLibrary onSelectTexture={applyTextureSet} onBack={() => setShowLibrary(false)} />
                </div>
            ) : (
                <div className={isGlobalMode ? "" : "pt-2"}>
                     {loadingTextures ? (
                         <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div> Loading...
                         </div>
                     ) : renderMainContent()}
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default PBRTexturePanel;