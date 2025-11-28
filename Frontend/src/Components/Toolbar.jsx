import React from "react";

function Toolbar({ model, autoRotate, setAutoRotate, wireframe, setWireframe, transformMode, setTransformMode, clearModel }) {
  if (!model) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-gray-700/50">
      <button
        onClick={clearModel}
        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1.5"
      >
        Clear
      </button>
      
      <div className="h-6 w-px bg-gray-600" />
      
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${autoRotate ? "bg-blue-500/30 text-blue-400" : "bg-gray-700/50 text-gray-400"}`}
      >
        Auto Rotate
      </button>
      
      <button
        onClick={() => setWireframe(!wireframe)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${wireframe ? "bg-purple-500/30 text-purple-400" : "bg-gray-700/50 text-gray-400"}`}
      >
        Wire
      </button>
      
      <div className="h-6 w-px bg-gray-600" />
      
      {['translate', 'rotate', 'scale'].map((mode) => (
        <button
          key={mode}
          onClick={() => setTransformMode(transformMode === mode ? 'none' : mode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            transformMode === mode ? "bg-green-500/30 text-green-400" : "bg-gray-700/50 text-gray-400"
          }`}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default Toolbar;