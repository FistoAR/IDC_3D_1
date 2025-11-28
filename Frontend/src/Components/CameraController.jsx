import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function CameraController({ zoom = 100, resetCamera = false }) {
  const { camera } = useThree();
  const initialPosition = useRef(new THREE.Vector3(3, 2, 3));

  useEffect(() => {
    if (resetCamera) {
      camera.position.copy(initialPosition.current);
      camera.lookAt(0, 0.5, 0);
      camera.updateProjectionMatrix();
    }
  }, [resetCamera, camera]);

  useEffect(() => {
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
  }, [zoom, camera]);

  return null;
}

export default CameraController;