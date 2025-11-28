const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function convertFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  onProgress?.('Uploading file...');

  try {
    const response = await fetch(`${API_URL}/api/convert`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Conversion failed');
    }

    if (data.originalFile) {
      return {
        success: true,
        url: `${API_URL}${data.url}`,
        format: data.format,
        originalFile: true
      };
    }

    onProgress?.('Conversion complete!');

    return {
      success: true,
      url: `${API_URL}${data.url}`,
      format: data.format,
      size: data.size
    };

  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to server.\n\n' +
        'Start the backend:\n' +
        'cd backend && npm start'
      );
    }
    throw error;
  }
}

export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_URL}/api/health`, {
      signal: controller.signal
    });

    clearTimeout(timeout);
    return await response.json();

  } catch {
    return {
      status: 'offline',
      converters: { occt: false, blender: false, maya: false }
    };
  }
}

export default { convertFile, checkServerHealth };