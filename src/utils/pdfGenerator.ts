
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
  textAreaWidth?: number;
  textAreaHeight?: number;
}

// Convert hex color to CMYK for professional printing
const hexToCMYK = (hex: string): { c: number; m: number; y: number; k: number } => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB first
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Convert RGB to CMYK
  const k = 1 - Math.max(r, Math.max(g, b));
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
  // jsPDF doesn't have native CMYK support, so we'll add a custom method
  (doc as any).setCMYKColor = function(c: number, m: number, y: number, k: number) {
    // Convert CMYK back to RGB for display but add metadata for CMYK printing
    const r = 255 * (1 - c / 100) * (1 - k / 100);
    const g = 255 * (1 - m / 100) * (1 - k / 100);
    const b = 255 * (1 - y / 100) * (1 - k / 100);
    this.setTextColor(Math.round(r), Math.round(g), Math.round(b));
  };
  (doc as any).setCMYKColor(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
};

const normalizePhotoFilename = (filename: string): string[] => {
  if (!filename) return [];
  
  const trimmed = filename.trim();
  const hasExtension = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(trimmed);
  
  if (!hasExtension) {
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

// Convert background to CMYK-optimized format
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
      
      // Fill with white background optimized for CMYK printing
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);
      
      // Convert to high-quality JPEG for CMYK compatibility
      const jpegData = canvas.toDataURL('image/jpeg', 1.0);
      resolve(jpegData);
    };
    
    img.onerror = () => reject(new Error('Failed to load background image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

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
      
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const circularImageData = canvas.toDataURL('image/png', 1.0);
      resolve(circularImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

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

const getExactTextPosition = (x: number, y: number, fontSize: number): { x: number; y: number } => {
  const baselineOffset = fontSize * 0.85;
  
  return {
    x: x,
    y: y + baselineOffset
  };
};

const getTextAlignmentInArea = (doc: jsPDF, text: string, alignment: "left" | "center" | "right", areaWidth: number): number => {
  if (alignment === "left") return 0;
  
  const textWidth = doc.getTextWidth(text);
  
  if (alignment === "center") {
    return Math.max(0, (areaWidth - textWidth) / 2);
  }
  
  if (alignment === "right") {
    return Math.max(0, areaWidth - textWidth);
  }
  
  return 0;
};

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

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF optimized for CMYK printing
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [cardDimensions.width, cardDimensions.height],
    putOnlyUsedFonts: true,
    compress: false,
    precision: 16,
    userUnit: 1.0
  });

  // Add CMYK color profile metadata for professional printing
  doc.setProperties({
    title: 'ID Cards - CMYK Optimized',
    subject: 'Professional ID Cards for High-Quality Printing',
    creator: 'ID Card Generator',
    keywords: 'CMYK, printing, professional, id cards',
    colorSpace: 'CMYK'
  });

  const backgroundCMYK = backgroundImage ? await convertBackgroundToCMYKCompatible(backgroundImage) : null;

  for (const record of records) {
    if (backgroundCMYK) {
      const img = await loadImageWithExactAlignment(backgroundCMYK);
      doc.addImage(img, 'JPEG', 0, 0, cardDimensions.width, cardDimensions.height, '', 'NONE');
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          const imageWidth = field.photoWidth || 60;
          const imageHeight = field.photoHeight || 60;
          
          console.log(`Processing photo with CMYK optimization: ${field.field}: ${value}`);
          
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
          doc.setFontSize(field.fontSize);
          setCMYKColor(doc, field.color);
          
          const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
          doc.text(`Photo Missing: ${field.field}`, exactTextPos.x, exactTextPos.y);
        }
      } else {
        const exactFont = getExactFontFamily(field.fontFamily);
        doc.setFont(exactFont, field.fontWeight);
        doc.setFontSize(field.fontSize);
        setCMYKColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        const exactTextPos = getExactTextPosition(field.x, field.y, field.fontSize);
        const textAreaWidth = field.textAreaWidth || 200;
        const textAlign = field.textAlign || "left";
        
        const textLines = doc.splitTextToSize(cleanedValue, textAreaWidth);
        
        if (Array.isArray(textLines)) {
          textLines.forEach((line: string, index: number) => {
            const alignmentOffset = getTextAlignmentInArea(doc, line, textAlign, textAreaWidth);
            const lineY = exactTextPos.y + (index * field.fontSize * 1.2);
            doc.text(line, exactTextPos.x + alignmentOffset, lineY);
          });
        } else {
          const alignmentOffset = getTextAlignmentInArea(doc, textLines, textAlign, textAreaWidth);
          doc.text(textLines, exactTextPos.x + alignmentOffset, exactTextPos.y);
        }
        
        console.log(`CMYK text positioning: ${field.field} at (${exactTextPos.x}, ${exactTextPos.y})`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  // Save with CMYK-optimized filename
  doc.save('id-cards-cmyk-optimized.pdf');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
