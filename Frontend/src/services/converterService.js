// Frontend/src/services/converterService.js
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

let isConverting = false;

/**
 * Convert file with position options
 * @param {File} file - File to convert
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Conversion options
 * @param {boolean} options.preservePosition - Keep original CAD position (default: true)
 * @param {boolean} options.centerModel - Center model at origin
 * @param {boolean} options.groundModel - Place on ground (Y=0)
 * @param {boolean} options.rotateToYUp - Rotate Z-up to Y-up
 */
export async function convertFile(file, onProgress, options = {}) {
  isConverting = true;
  
  const timeoutMs = Math.max(120000, (file.size / (1024 * 1024)) * 6000);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    
    // Add position options (default: preserve original)
    formData.append('preservePosition', options.preservePosition !== false ? 'true' : 'false');
    formData.append('centerModel', options.centerModel ? 'true' : 'false');
    formData.append('groundModel', options.groundModel ? 'true' : 'false');
    formData.append('rotateToYUp', options.rotateToYUp ? 'true' : 'false');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct < 100 ? `Uploading: ${pct}%` : 'Processing...', pct);
      }
    };

    xhr.onload = () => {
      isConverting = false;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            url: `${API_URL}${data.url}`,
            format: data.format,
            size: data.size,
            meshCount: data.meshCount,
            bounds: data.bounds,
            options: data.options
          });
        } catch { reject(new Error('Invalid server response')); }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Conversion failed'));
        } catch { reject(new Error(`Server Error: ${xhr.status}`)); }
      }
    };

    xhr.onerror = () => { isConverting = false; reject(new Error('Network error')); };
    xhr.ontimeout = () => { isConverting = false; reject(new Error('Timeout')); };

    xhr.open('POST', `${API_URL}/api/convert`);
    xhr.timeout = timeoutMs;
    xhr.send(formData);
  });
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