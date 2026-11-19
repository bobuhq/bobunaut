import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { startAresStage } from '../engine/aresPerformance';

class TimedCampusGLTFLoader extends GLTFLoader {
  override parse(data: ArrayBuffer | string, path: string, onLoad: (gltf: GLTF) => void, onError?: (event: ErrorEvent) => void) {
    const detail = typeof data === 'string' ? undefined : { bytes: data.byteLength };
    const finishParse = startAresStage('campus-gltf-parse', detail);
    const finishDispatch = startAresStage('campus-gltf-parse-dispatch', detail);
    try {
      super.parse(data, path, (gltf) => {
        finishParse?.();
        onLoad(gltf);
      }, (error) => {
        finishParse?.();
        if (onError) onError(error);
        else console.error(error);
      });
    } finally {
      finishDispatch?.();
    }
  }
}

// Preload and consumers use the same constructor so Fiber shares their cache.
export const CampusGLTFLoader = import.meta.env.DEV ? TimedCampusGLTFLoader : GLTFLoader;
