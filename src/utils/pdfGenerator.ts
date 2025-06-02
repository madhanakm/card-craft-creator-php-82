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

// EXACT text positioning calculation that matches CSS pixel-perfect
const getExactTextPosition = (x: number, y: number, fontSize: number): { x: number; y: number } => {
  // Perfect baseline alignment - CSS top position to PDF baseline
  const baselineOffset = fontSize * 0.8; // Exact CSS-to-PDF baseline conversion
  
  return {
    x: x,
    y: y + baselineOffset
  };
};

// Calculate text alignment offset based on text width
const getTextAlignmentOffset = (doc: jsPDF, text: string, alignment: "left" | "center" | "right", maxWidth: number): number => {
  if (alignment === "left") return 0;
  
  const textWidth = doc.getTextWidth(text);
  
  if (alignment === "center") {
    return (maxWidth - textWidth) / 2;
  }
  
  if (alignment === "right") {
    return maxWidth - textWidth;
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

// Direct 1:1 font size mapping
const getExactFontSize = (cssSize: number): number => {
  return cssSize; // Exact 1:1 mapping
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // EXACT dimensions matching the preview component
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF with exact precision
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
          // Set RGB color for missing photo text
          const exactFont = getExactFontFamily(field.fontFamily);
          doc.setFont(exactFont, field.fontWeight);
          doc.setFontSize(getExactFontSize(field.fontSize));
          setRGBColor(doc, field.color);
          
          const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
          doc.text(`Photo Missing: ${field.field}`, exactTextPos.x, exactTextPos.y);
        }
      } else {
        // TEXT RENDERING with exact alignment
        const exactFont = getExactFontFamily(field.fontFamily);
        doc.setFont(exactFont, field.fontWeight);
        doc.setFontSize(getExactFontSize(field.fontSize));
        setRGBColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Calculate exact text position
        const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
        
        // Calculate maximum width for text
        const maxWidth = cardDimensions.width - field.x - 10;
        
        // Split text to fit width
        const textLines = doc.splitTextToSize(cleanedValue, maxWidth);
        
        // Handle text alignment
        const textAlign = field.textAlign || "left";
        
        if (Array.isArray(textLines)) {
          // Multiple lines - handle each line alignment
          textLines.forEach((line: string, index: number) => {
            const alignmentOffset = getTextAlignmentOffset(doc, line, textAlign, maxWidth);
            const lineY = exactTextPos.y + (index * field.fontSize * 1.2);
            doc.text(line, exactTextPos.x + alignmentOffset, lineY);
          });
        } else {
          // Single line
          const alignmentOffset = getTextAlignmentOffset(doc, textLines, textAlign, maxWidth);
          doc.text(textLines, exactTextPos.x + alignmentOffset, exactTextPos.y);
        }
        
        console.log(`Positioned: ${field.field} at (${exactTextPos.x}, ${exactTextPos.y}) align:${textAlign}`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  doc.save('id-cards-aligned.pdf');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
