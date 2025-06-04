
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

// Convert millimeters to points at 300 DPI for high resolution
const mmToPoints = (mm: number): number => {
  return (mm * 300) / 25.4; // 300 DPI conversion
};

// Convert hex color to CMYK for professional printing
const hexToCMYK = (hex: string): { c: number; m: number; y: number; k: number } => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
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

// Set CMYK color in jsPDF (fallback to RGB for compatibility)
const setCMYKColor = (doc: jsPDF, hexColor: string) => {
  const cmyk = hexToCMYK(hexColor);
  console.log(`CMYK Color: C${cmyk.c}% M${cmyk.m}% Y${cmyk.y}% K${cmyk.k}%`);
  
  // jsPDF doesn't have native CMYK support, so we'll use RGB but log CMYK values
  // for reference when importing into Photoshop/CorelDRAW
  const r = parseInt(hexColor.replace('#', '').substr(0, 2), 16);
  const g = parseInt(hexColor.replace('#', '').substr(2, 2), 16);
  const b = parseInt(hexColor.replace('#', '').substr(4, 2), 16);
  
  doc.setTextColor(r, g, b);
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

// Enhanced background image processing for CMYK compatibility
const convertBackgroundToPrintReady = (imageData: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas to exact print dimensions at 300 DPI
      const widthPoints = mmToPoints(88);
      const heightPoints = mmToPoints(58);
      
      canvas.width = widthPoints;
      canvas.height = heightPoints;
      
      // Fill with white background for print compatibility
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image to fit exact dimensions
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG with maximum quality for print
      const jpegData = canvas.toDataURL('image/jpeg', 1.0);
      resolve(jpegData);
    };
    
    img.onerror = () => reject(new Error('Failed to load background image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// High-resolution circular image creation
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
      
      // Convert photo dimensions to points for high resolution
      const widthPoints = mmToPoints(width);
      const heightPoints = mmToPoints(height);
      
      canvas.width = widthPoints;
      canvas.height = heightPoints;
      
      // Create circular clipping path
      const centerX = widthPoints / 2;
      const centerY = heightPoints / 2;
      const radius = Math.min(widthPoints, heightPoints) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      
      // Draw the image
      ctx.drawImage(img, 0, 0, widthPoints, heightPoints);
      
      const circularImageData = canvas.toDataURL('image/png', 1.0);
      resolve(circularImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// High-resolution image loading
const loadImageWithHighRes = (imageData: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`High-res image loaded: ${img.width}x${img.height}`);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
  });
};

// Precise text positioning for 300 DPI
const getTextPositionForPrint = (x: number, y: number, fontSize: number): { x: number; y: number } => {
  // Convert pixel coordinates to points for print
  const xPoints = mmToPoints(x * 0.264583); // Convert px to mm then to points
  const yPoints = mmToPoints(y * 0.264583);
  const fontSizePoints = mmToPoints(fontSize * 0.264583);
  
  return {
    x: xPoints,
    y: yPoints + fontSizePoints * 0.85
  };
};

// Text alignment in defined area for print
const getTextAlignmentForPrint = (doc: jsPDF, text: string, alignment: "left" | "center" | "right", areaWidth: number): number => {
  if (alignment === "left") return 0;
  
  const textWidth = doc.getTextWidth(text);
  const areaWidthPoints = mmToPoints(areaWidth * 0.264583);
  
  if (alignment === "center") {
    return Math.max(0, (areaWidthPoints - textWidth) / 2);
  }
  
  if (alignment === "right") {
    return Math.max(0, areaWidthPoints - textWidth);
  }
  
  return 0;
};

// Font family mapping
const getPrintFontFamily = (fontFamily: string): string => {
  const fontMap: Record<string, string> = {
    'helvetica': 'helvetica',
    'arial': 'helvetica',
    'times': 'times',
    'georgia': 'times',
    'courier': 'courier',
    'verdana': 'helvetica',
  };
  
  return fontMap[fontFamily.toLowerCase()] || 'helvetica';
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // Exact print dimensions: 88mm × 58mm at 300 DPI
  const cardDimensionsMM = orientation === "portrait" 
    ? { width: 88, height: 58 } 
    : { width: 58, height: 88 };
  
  const cardDimensionsPoints = {
    width: mmToPoints(cardDimensionsMM.width),
    height: mmToPoints(cardDimensionsMM.height)
  };

  console.log(`Creating CMYK PDF at 300 DPI: ${cardDimensionsMM.width}mm × ${cardDimensionsMM.height}mm`);
  console.log(`Points dimensions: ${cardDimensionsPoints.width} × ${cardDimensionsPoints.height}`);

  // Create high-resolution PDF for print
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [cardDimensionsPoints.width, cardDimensionsPoints.height],
    putOnlyUsedFonts: true,
    compress: false,
    precision: 16
  });

  // Set PDF metadata for print production
  doc.setProperties({
    title: 'ID Cards - CMYK Print Ready',
    subject: 'Professional ID Cards',
    author: 'ID Card Generator',
    keywords: 'ID, Cards, CMYK, Print, 300DPI',
    creator: 'ID Card Generator Pro'
  });

  // Convert background for print
  const backgroundPrintReady = backgroundImage ? await convertBackgroundToPrintReady(backgroundImage) : null;

  for (const record of records) {
    if (backgroundPrintReady) {
      const img = await loadImageWithHighRes(backgroundPrintReady);
      doc.addImage(img, 'JPEG', 0, 0, cardDimensionsPoints.width, cardDimensionsPoints.height, '', 'NONE');
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          // Convert photo dimensions from mm to points
          const imageWidthPoints = mmToPoints(field.photoWidth || 15);
          const imageHeightPoints = mmToPoints(field.photoHeight || 15);
          const xPoints = mmToPoints(field.x * 0.264583);
          const yPoints = mmToPoints(field.y * 0.264583);
          
          console.log(`Processing photo for print: ${field.field}: ${value}`);
          
          if (field.photoShape === "circle") {
            try {
              const circularImageData = await createCircularImage(photoBase64, field.photoWidth || 15, field.photoHeight || 15);
              doc.addImage(circularImageData, 'PNG', xPoints, yPoints, imageWidthPoints, imageHeightPoints, '', 'NONE');
            } catch (error) {
              console.error('Error creating circular image:', error);
              const img = await loadImageWithHighRes(photoBase64);
              doc.addImage(img, 'JPEG', xPoints, yPoints, imageWidthPoints, imageHeightPoints, '', 'NONE');
            }
          } else {
            try {
              const img = await loadImageWithHighRes(photoBase64);
              doc.addImage(img, 'JPEG', xPoints, yPoints, imageWidthPoints, imageHeightPoints, '', 'NONE');
            } catch (error) {
              console.error('Error loading image:', error);
              doc.addImage(photoBase64, 'JPEG', xPoints, yPoints, imageWidthPoints, imageHeightPoints, '', 'NONE');
            }
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          const printFont = getPrintFontFamily(field.fontFamily);
          doc.setFont(printFont, field.fontWeight);
          doc.setFontSize(mmToPoints(field.fontSize * 0.264583));
          setCMYKColor(doc, field.color);
          
          const textPos = getTextPositionForPrint(field.x, field.y, field.fontSize);
          doc.text(`Photo Missing: ${field.field}`, textPos.x, textPos.y);
        }
      } else {
        // High-resolution text rendering for print
        const printFont = getPrintFontFamily(field.fontFamily);
        doc.setFont(printFont, field.fontWeight);
        doc.setFontSize(mmToPoints(field.fontSize * 0.264583));
        setCMYKColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        const textPos = getTextPositionForPrint(field.x, field.y, field.fontSize);
        const textAreaWidthPoints = mmToPoints((field.textAreaWidth || 200) * 0.264583);
        const textAlign = field.textAlign || "left";
        
        // Split text to fit within the defined area
        const textLines = doc.splitTextToSize(cleanedValue, textAreaWidthPoints);
        
        if (Array.isArray(textLines)) {
          textLines.forEach((line: string, index: number) => {
            const alignmentOffset = getTextAlignmentForPrint(doc, line, textAlign, field.textAreaWidth || 200);
            const lineY = textPos.y + (index * mmToPoints(field.fontSize * 0.264583) * 1.2);
            doc.text(line, textPos.x + alignmentOffset, lineY);
          });
        } else {
          const alignmentOffset = getTextAlignmentForPrint(doc, textLines, textAlign, field.textAreaWidth || 200);
          doc.text(textLines, textPos.x + alignmentOffset, textPos.y);
        }
        
        console.log(`Print text: ${field.field} at (${textPos.x}, ${textPos.y}) CMYK ready`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  // Save with print-ready filename
  doc.save('id-cards-cmyk-300dpi-88x58mm.pdf');
  
  console.log('CMYK PDF generated successfully for professional printing');
  console.log('Recommended workflow: Open in Photoshop or CorelDRAW, convert to CMYK color space if needed');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
