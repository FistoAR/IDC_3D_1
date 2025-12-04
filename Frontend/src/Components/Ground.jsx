// Frontend/src/Components/Ground.jsx
import React from "react";
import { ContactShadows } from "@react-three/drei";

function Ground({ showBase = true }) {
  if (!showBase) return null;
  
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial 
          color="#2a2a3e" 
          metalness={0.2} 
          roughness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2} 
        far={4}
      />
    </>
  );
}

export default Ground;