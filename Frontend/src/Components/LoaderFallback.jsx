import React from "react";
import { Html, useProgress } from "@react-three/drei";

function LoaderFallback() {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="bg-white/95 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-2xl border border-gray-200 min-w-64">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full" />
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <div>
            <p className="text-gray-800 font-semibold text-lg">Loading Model</p>
            <p className="text-blue-600 font-bold text-2xl">{Math.round(progress)}%</p>
          </div>
        </div>
        <div className="mt-4 w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

export default LoaderFallback;