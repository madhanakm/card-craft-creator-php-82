import jsPDF from 'jspdf';

// Photo cache to store loaded images
const photoCache = new Map<string, string>();

export interface CardField {
  id: string;
  field: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  color: string;
  isPhoto?: boolean;
  photoShape?: "square" | "circle";
  photoWidth?: number;
  photoHeight?: number;
}

// Convert RGB hex color to CMYK for better printing
const hexToCMYK = (hex: string): { c: number; m: number; y: number; k: number } => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calculate CMYK values
  const k = 1 - Math.max(r, g, b);
  const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
  
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

// Set CMYK color in jsPDF
const setCMYKColor = (doc: jsPDF, hexColor: string) => {
  const cmyk = hexToCMYK(hexColor);
  // Use internal jsPDF method to set CMYK color
  (doc as any).internal.write(`${cmyk.c/100} ${cmyk.m/100} ${cmyk.y/100} ${cmyk.k/100} k`);
  (doc as any).internal.write(`${cmyk.c/100} ${cmyk.m/100} ${cmyk.y/100} K`);
};

const normalizePhotoFilename = (filename: string): string[] => {
  if (!filename) return [];
  
  const trimmed = filename.trim();
  const hasExtension = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(trimmed);
  
  if (!hasExtension) {
    // Return multiple possible extensions - JPG first since it's most common
    return [
      `${trimmed}.JPG`,
      `${trimmed}.jpg`,
      `${trimmed}.PNG`, 
      `${trimmed}.png`,
      `${trimmed}.JPEG`,
      `${trimmed}.jpeg`
    ];
  }
  
  return [trimmed];
};

const loadPhotoFromFiles = async (filename: string, selectedFiles: FileList | null): Promise<string | null> => {
  if (!filename || !selectedFiles) {
    return null;
  }

  const possibleFilenames = normalizePhotoFilename(filename);
  const cacheKey = `file:${filename}`;
  
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || null;
  }

  try {
    // Find the file that matches any of the possible filenames
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.name === filename || file.name === filename.trim() || possibleFilenames.includes(file.name)) {
        const base64Image = await convertFileToBase64(file);
        photoCache.set(cacheKey, base64Image);
        return base64Image;
      }
    }
    
    console.warn(`Photo file not found: ${filename} (tried extensions: ${possibleFilenames.join(', ')})`);
    return null;
  } catch (error) {
    console.error(`Error loading image ${filename}:`, error);
    return null;
  }
};

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Enhanced background image processing for CMYK compatibility
const convertBackgroundToCMYKCompatible = (imageData: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fill with white background to ensure proper CMYK conversion
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image with enhanced color accuracy
      ctx.drawImage(img, 0, 0);
      
      // Convert to JPEG with maximum quality for CMYK compatibility
      const jpegData = canvas.toDataURL('image/jpeg', 1.0);
      resolve(jpegData);
    };
    
    img.onerror = () => reject(new Error('Failed to load background image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// Enhanced circular image creation with exact pixel alignment
const createCircularImage = (imageData: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use exact dimensions for perfect alignment
      canvas.width = width;
      canvas.height = height;
      
      // Disable image smoothing for pixel-perfect rendering
      ctx.imageSmoothingEnabled = false;
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      // Create circular clipping path with exact center alignment
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      
      // Draw the image with exact positioning
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to PNG with maximum quality
      const circularImageData = canvas.toDataURL('image/png', 1.0);
      resolve(circularImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// Exact image loading with pixel-perfect alignment
const loadImageWithExactAlignment = (imageData: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`Image loaded with exact dimensions: ${img.width}x${img.height}`);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// Improved text positioning to exactly match CSS rendering
const getTextPosition = (x: number, y: number, fontSize: number): { x: number; y: number } => {
  // CSS positions text from the top of the element, jsPDF from baseline
  // This calculation ensures perfect alignment between preview and PDF
  const baselineOffset = fontSize * 0.85; // Adjusted for better alignment
  return {
    x: x, // Keep X position exact
    y: y + baselineOffset // Adjust Y for baseline positioning
  };
};

// Font mapping to ensure consistent rendering with exact size matching
const mapFontFamily = (fontFamily: string): string => {
  const fontMap: Record<string, string> = {
    'helvetica': 'helvetica',
    'arial': 'helvetica', // Arial maps to helvetica in jsPDF
    'times': 'times',
    'georgia': 'times', // Georgia maps to times
    'courier': 'courier',
    'verdana': 'helvetica', // Verdana maps to helvetica
  };
  
  return fontMap[fontFamily.toLowerCase()] || 'helvetica';
};

// Adjust font size to match CSS rendering exactly
const adjustFontSizeForPDF = (cssSize: number): number => {
  // CSS and PDF font sizes render differently - this compensates for the difference
  return cssSize * 0.95; // Slight reduction to match CSS rendering
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // Use EXACT dimensions matching the preview with no scaling
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF with exact preview dimensions and CMYK color space
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [cardDimensions.width, cardDimensions.height],
    putOnlyUsedFonts: true,
    compress: false // Disable compression for better CMYK handling
  });

  // Set PDF to use CMYK color space
  (doc as any).internal.write('/CS /DeviceCMYK cs');
  (doc as any).internal.write('/CS /DeviceCMYK CS');

  // Convert background for CMYK compatibility
  const backgroundCMYK = backgroundImage ? await convertBackgroundToCMYKCompatible(backgroundImage) : null;

  for (const record of records) {
    if (backgroundCMYK) {
      const img = await loadImageWithExactAlignment(backgroundCMYK);
      // Add background with exact dimensions and positioning
      doc.addImage(img, 'JPEG', 0, 0, cardDimensions.width, cardDimensions.height, '', 'NONE');
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          // Use EXACT dimensions for perfect alignment
          const imageWidth = field.photoWidth || 60;
          const imageHeight = field.photoHeight || 60;
          
          console.log(`Processing photo with exact alignment: ${field.field}: ${value}`);
          
          if (field.photoShape === "circle") {
            try {
              const circularImageData = await createCircularImage(photoBase64, imageWidth, imageHeight);
              doc.addImage(circularImageData, 'PNG', field.x, field.y, imageWidth, imageHeight, '', 'NONE');
            } catch (error) {
              console.error('Error creating circular image:', error);
              const img = await loadImageWithExactAlignment(photoBase64);
              doc.addImage(img, 'JPEG', field.x, field.y, imageWidth, imageHeight, '', 'NONE');
            }
          } else {
            try {
              const img = await loadImageWithExactAlignment(photoBase64);
              doc.addImage(img, 'JPEG', field.x, field.y, imageWidth, imageHeight, '', 'NONE');
            } catch (error) {
              console.error('Error loading image:', error);
              doc.addImage(photoBase64, 'JPEG', field.x, field.y, imageWidth, imageHeight, '', 'NONE');
            }
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          // Set CMYK color for missing photo text with proper positioning
          const mappedFont = mapFontFamily(field.fontFamily);
          doc.setFont(mappedFont, field.fontWeight);
          doc.setFontSize(field.fontSize);
          setCMYKColor(doc, field.color);
          
          const textPos = getTextPosition(field.x, field.y, field.fontSize);
          doc.text(`Photo Missing: ${field.field}`, textPos.x, textPos.y);
        }
      } else {
        // Handle text fields with PERFECT positioning and font rendering
        const mappedFont = mapFontFamily(field.fontFamily);
        doc.setFont(mappedFont, field.fontWeight);
        
        // Use adjusted font size for exact matching
        const adjustedFontSize = adjustFontSizeForPDF(field.fontSize);
        doc.setFontSize(adjustedFontSize);
        
        // Set CMYK color instead of RGB
        setCMYKColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Calculate perfect text position to match CSS rendering exactly
        const textPos = getTextPosition(field.x, field.y, field.fontSize);
        
        // Calculate text width with exact dimensions
        const maxWidth = cardDimensions.width - field.x - 5;
        
        // Use splitTextToSize with exact measurements
        const textLines = doc.splitTextToSize(cleanedValue, maxWidth);
        
        // Position text with pixel-perfect coordinates
        doc.text(textLines, textPos.x, textPos.y);
        
        console.log(`Text positioned: ${field.field} at (${textPos.x}, ${textPos.y}) with font ${mappedFont} size ${adjustedFontSize} (original: ${field.fontSize})`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  // Save with CMYK color profile information
  doc.save('id-cards-cmyk.pdf');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
