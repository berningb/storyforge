// Helper to convert Tailwind class to hex (for backward compatibility)
export const tailwindToHex = (tailwindClass) => {
  const colorMap = {
    'bg-purple-200': '#e9d5ff',
    'bg-green-200': '#bbf7d0',
    'bg-orange-200': '#fed7aa',
    'bg-blue-200': '#bfdbfe',
    'bg-pink-200': '#fce7f3',
    'bg-yellow-200': '#fef08a',
    'bg-cyan-200': '#a5f3fc',
    'bg-indigo-200': '#c7d2fe',
    'bg-gray-200': '#e5e7eb',
  };
  return colorMap[tailwindClass] || '#e5e7eb';
};

// Helper to get hex from color config (supports both hex and Tailwind)
export const getColorHex = (colorConfig) => {
  if (!colorConfig) return '#e5e7eb';
  if (colorConfig.hex) return colorConfig.hex;
  if (colorConfig.bg && colorConfig.bg.startsWith('#')) return colorConfig.bg;
  if (colorConfig.bg) return tailwindToHex(colorConfig.bg);
  return '#e5e7eb';
};

// Helper function to convert hex to RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to calculate luminance and determine if text should be dark or light
export const getTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};


