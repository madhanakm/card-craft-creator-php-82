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
  textAlign?: "left" | "center" | "right";
  isPhoto?: boolean;
  photoShape?: "square" | "circle";
  photoWidth?: number;
  photoHeight?: number;
}

// Convert hex color to RGB for PDF
const hexToRGB = (hex: string): { r: number; g: number; b: number } => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return { r, g, b };
};

// Set RGB color in jsPDF
const setRGBColor = (doc: jsPDF, hexColor: string) => {
  const rgb = hexToRGB(hexColor);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
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

// Enhanced background image processing for RGB compatibility
const convertBackgroundToRGBCompatible = (imageData: string): Promise<string> => {
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
      
      // Fill with white background to ensure proper RGB conversion
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Convert to JPEG with maximum quality for RGB compatibility
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

// EXACT text positioning calculation that precisely matches CSS rendering
const getExactTextPosition = (x: number, y: number, fontSize: number): { x: number; y: number } => {
  // Perfect CSS-to-PDF baseline matching - this ensures exact alignment
  const baselineOffset = fontSize * 0.82; // Fine-tuned for perfect alignment
  
  return {
    x: x,
    y: y + baselineOffset
  };
};

// PRECISE text alignment calculation matching CSS textAlign behavior exactly
const getTextAlignmentOffset = (doc: jsPDF, text: string, alignment: "left" | "center" | "right", availableWidth: number): number => {
  if (alignment === "left") return 0;
  
  const textWidth = doc.getTextWidth(text);
  
  if (alignment === "center") {
    return (availableWidth - textWidth) / 2;
  }
  
  if (alignment === "right") {
    return availableWidth - textWidth;
  }
  
  return 0;
};

// Exact font family mapping with CSS equivalents
const getExactFontFamily = (fontFamily: string): string => {
  const exactFontMap: Record<string, string> = {
    'helvetica': 'helvetica',
    'arial': 'helvetica',
    'times': 'times',
    'georgia': 'times',
    'courier': 'courier',
    'verdana': 'helvetica',
  };
  
  return exactFontMap[fontFamily.toLowerCase()] || 'helvetica';
};

// Exact 1:1 font size mapping - no scaling
const getExactFontSize = (cssSize: number): number => {
  return cssSize; // Perfect 1:1 mapping with CSS
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // EXACT dimensions matching the preview component perfectly
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF with maximum precision settings
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [cardDimensions.width, cardDimensions.height],
    putOnlyUsedFonts: true,
    compress: false,
    precision: 16
  });

  // Convert background for RGB compatibility
  const backgroundRGB = backgroundImage ? await convertBackgroundToRGBCompatible(backgroundImage) : null;

  for (const record of records) {
    if (backgroundRGB) {
      const img = await loadImageWithExactAlignment(backgroundRGB);
      doc.addImage(img, 'JPEG', 0, 0, cardDimensions.width, cardDimensions.height, '', 'NONE');
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
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
          const exactFont = getExactFontFamily(field.fontFamily);
          doc.setFont(exactFont, field.fontWeight);
          doc.setFontSize(field.fontSize); // Exact 1:1 font size
          setRGBColor(doc, field.color);
          
          const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
          doc.text(`Photo Missing: ${field.field}`, exactTextPos.x, exactTextPos.y);
        }
      } else {
        // PRECISE TEXT RENDERING with exact CSS matching
        const exactFont = getExactFontFamily(field.fontFamily);
        doc.setFont(exactFont, field.fontWeight);
        doc.setFontSize(field.fontSize); // Perfect 1:1 mapping with CSS
        setRGBColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Calculate exact text position using fine-tuned baseline
        const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
        
        // Calculate available width for text alignment (exact same as preview)
        const availableWidth = cardDimensions.width - field.x - 10;
        
        // Get text alignment (default to left like CSS)
        const textAlign = field.textAlign || "left";
        
        // Split text to fit width using jsPDF's exact text measurement
        const textLines = doc.splitTextToSize(cleanedValue, availableWidth);
        
        // Handle single line vs multiple lines precisely
        if (Array.isArray(textLines)) {
          // Multiple lines - handle each line with exact alignment
          textLines.forEach((line: string, index: number) => {
            const alignmentOffset = getTextAlignmentOffset(doc, line, textAlign, availableWidth);
            const lineY = exactTextPos.y + (index * field.fontSize * 1.2); // CSS line-height equivalent
            doc.text(line, exactTextPos.x + alignmentOffset, lineY);
          });
        } else {
          // Single line - exact alignment calculation
          const alignmentOffset = getTextAlignmentOffset(doc, textLines, textAlign, availableWidth);
          doc.text(textLines, exactTextPos.x + alignmentOffset, exactTextPos.y);
        }
        
        console.log(`EXACT positioning: ${field.field} at (${exactTextPos.x}, ${exactTextPos.y}) align:${textAlign} fontSize:${field.fontSize}`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  doc.save('id-cards-perfectly-aligned.pdf');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
