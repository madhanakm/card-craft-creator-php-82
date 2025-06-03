
import jsPDF from 'jspdf';

// Photo cache to store loaded images
const photoCache = new Map<string, string>();

export interface CardField {
  id: string;
  field: string;
  x: number; // in pixels
  y: number; // in pixels
  fontSize: number; // in pixels
  fontWeight: string;
  fontFamily: string;
  color: string;
  textAlign?: "left" | "center" | "right";
  isPhoto?: boolean;
  photoShape?: "square" | "circle";
  photoWidth?: number; // in mm for photos
  photoHeight?: number; // in mm for photos
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
const createCircularImage = (imageData: string, widthMM: number, heightMM: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Convert mm to pixels for image processing (assuming 300 DPI: 1mm = ~11.81 pixels)
      const width = Math.round(widthMM * 11.81);
      const height = Math.round(heightMM * 11.81);
      
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

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // Professional print dimensions in mm
  const cardDimensions = orientation === "portrait" 
    ? { width: 88, height: 58 } // Portrait: 88mm x 58mm
    : { width: 58, height: 88 }; // Landscape: 58mm x 88mm

  console.log(`Creating PDF with exact dimensions: ${cardDimensions.width}mm x ${cardDimensions.height}mm`);

  // Create PDF with millimeter precision for professional printing
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
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
          const imageWidth = field.photoWidth || 15; // Default 15mm
          const imageHeight = field.photoHeight || 15; // Default 15mm
          
          // Convert pixel position to mm for PDF
          const xMM = (field.x / 3.78); // Convert px to mm
          const yMM = (field.y / 3.78); // Convert px to mm
          
          console.log(`Processing photo with mm precision: ${field.field}: ${value} (${imageWidth}mm x ${imageHeight}mm)`);
          
          if (field.photoShape === "circle") {
            try {
              const circularImageData = await createCircularImage(photoBase64, imageWidth, imageHeight);
              doc.addImage(circularImageData, 'PNG', xMM, yMM, imageWidth, imageHeight, '', 'NONE');
            } catch (error) {
              console.error('Error creating circular image:', error);
              const img = await loadImageWithExactAlignment(photoBase64);
              doc.addImage(img, 'JPEG', xMM, yMM, imageWidth, imageHeight, '', 'NONE');
            }
          } else {
            try {
              const img = await loadImageWithExactAlignment(photoBase64);
              doc.addImage(img, 'JPEG', xMM, yMM, imageWidth, imageHeight, '', 'NONE');
            } catch (error) {
              console.error('Error loading image:', error);
              doc.addImage(photoBase64, 'JPEG', xMM, yMM, imageWidth, imageHeight, '', 'NONE');
            }
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          doc.setFont('helvetica', field.fontWeight);
          doc.setFontSize(field.fontSize / 3.78); // Convert px to mm
          setRGBColor(doc, field.color);
          
          const xMM = field.x / 3.78;
          const yMM = (field.y + field.fontSize) / 3.78;
          doc.text(`Photo Missing: ${field.field}`, xMM, yMM);
        }
      } else {
        // Text rendering
        const fontFamily = field.fontFamily?.toLowerCase() === 'helvetica' ? 'helvetica' : 
                          field.fontFamily?.toLowerCase() === 'times' ? 'times' : 
                          field.fontFamily?.toLowerCase() === 'courier' ? 'courier' : 'helvetica';
        
        doc.setFont(fontFamily, field.fontWeight);
        doc.setFontSize(field.fontSize / 3.78); // Convert px to mm
        setRGBColor(doc, field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Convert pixel position to mm for PDF
        const xMM = field.x / 3.78;
        const yMM = (field.y + field.fontSize) / 3.78; // Add font size for baseline
        
        // Handle text alignment
        const textAlign = field.textAlign || "left";
        
        if (textAlign === "left") {
          doc.text(cleanedValue, xMM, yMM);
        } else if (textAlign === "center") {
          doc.text(cleanedValue, xMM, yMM, { align: 'center' });
        } else if (textAlign === "right") {
          doc.text(cleanedValue, xMM, yMM, { align: 'right' });
        }
        
        console.log(`Text positioning: ${field.field} at (${xMM}mm, ${yMM}mm) align:${textAlign}`);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  doc.save('id-cards-professional-print.pdf');
};

declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
