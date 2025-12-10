// Components/ModelList.jsx
import React, { useState } from "react";

function ModelList({ 
  models, 
  selectedModelId, 
  onSelectModel, 
  onDeleteModel, 
  onToggleVisibility 
}) {
  const [expandedSection, setExpandedSection] = useState(true);

  if (models.length === 0) return null;

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={() => setExpandedSection(!expandedSection)}
        className="w-full p-4 pb-2 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
      >
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Models ({models.length})
        </h2>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandedSection && (
        <div className="px-4 pb-4 space-y-2">
          {models.map((modelData) => (
            <div
              key={modelData.id}
              onClick={() => onSelectModel(modelData.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedModelId === modelData.id
                  ? "bg-blue-500/20 border border-blue-500/50"
                  : "bg-gray-700/30 hover:bg-gray-700/50 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(modelData.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      modelData.visible
                        ? "text-green-400 hover:bg-green-500/20"
                        : "text-gray-500 hover:bg-gray-600/50"
                    }`}
                    title={modelData.visible ? "Hide model" : "Show model"}
                  >
                    {modelData.visible ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                  
                  <span className="text-sm text-gray-200 truncate flex-1">
                    {modelData.fileName}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteModel(modelData.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete model"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Model Stats */}
              {modelData.stats && (
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span>▲ {formatNumber(modelData.stats.triangles || 0)}</span>
                  <span>⬡ {formatNumber(modelData.stats.vertices || 0)}</span>
                  <span>📦 {modelData.stats.meshes || 0} meshes</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelList;