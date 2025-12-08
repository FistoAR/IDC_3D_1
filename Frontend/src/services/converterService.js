// Frontend/src/services/converterService.js
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

let isConverting = false;
let currentXHR = null;

// Loading phases
export const LOADING_PHASES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  LOADING_MODEL: 'loading_model',
  COMPLETE: 'complete',
  ERROR: 'error'
};

/**
 * Convert file with position options
 * @param {File} file - File to convert
 * @param {Function} onProgress - Progress callback (phase, percent, message)
 * @param {Object} options - Conversion options
 * @param {AbortSignal} signal - Optional abort signal
 */
export async function convertFile(file, onProgress, options = {}, signal = null) {
  isConverting = true;
  
  const timeoutMs = Math.max(120000, (file.size / (1024 * 1024)) * 6000);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    currentXHR = xhr;
    const formData = new FormData();
    formData.append('file', file);
    
    // Add position options
    formData.append('preservePosition', options.preservePosition !== false ? 'true' : 'false');
    formData.append('centerModel', options.centerModel ? 'true' : 'false');
    formData.append('groundModel', options.groundModel ? 'true' : 'false');
    formData.append('rotateToYUp', options.rotateToYUp ? 'true' : 'false');

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        isConverting = false;
        currentXHR = null;
        reject(new Error('Upload cancelled'));
      });
    }

    // Upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress?.(LOADING_PHASES.UPLOADING, percent, `Uploading: ${percent}%`);
      }
    };

    // Upload complete, now processing
    xhr.upload.onload = () => {
      onProgress?.(LOADING_PHASES.PROCESSING, 100, 'Processing on server...');
    };

    xhr.onload = () => {
      isConverting = false;
      currentXHR = null;
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress?.(LOADING_PHASES.LOADING_MODEL, 100, 'Loading 3D model...');
          resolve({
            success: true,
            url: `${API_URL}${data.url}`,
            format: data.format,
            size: data.size,
            meshCount: data.meshCount,
            bounds: data.bounds,
            options: data.options
          });
        } catch { 
          reject(new Error('Invalid server response')); 
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Conversion failed'));
        } catch { 
          reject(new Error(`Server Error: ${xhr.status}`)); 
        }
      }
    };

    xhr.onerror = () => { 
      isConverting = false; 
      currentXHR = null;
      reject(new Error('Network error - check your connection')); 
    };
    
    xhr.ontimeout = () => { 
      isConverting = false; 
      currentXHR = null;
      reject(new Error('Request timed out - file may be too large')); 
    };

    xhr.onabort = () => {
      isConverting = false;
      currentXHR = null;
      reject(new Error('Upload cancelled'));
    };

    xhr.open('POST', `${API_URL}/api/convert`);
    xhr.timeout = timeoutMs;
    xhr.send(formData);
  });
}

export function cancelCurrentUpload() {
  if (currentXHR) {
    currentXHR.abort();
    currentXHR = null;
    isConverting = false;
  }
}

export function getIsConverting() {
  return isConverting;
}

export async function checkServerHealth() {
  if (isConverting) return { status: 'busy' };
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
    clearTimeout(id);
    return await res.json();
  } catch {
    return { status: 'offline' };
  }
}