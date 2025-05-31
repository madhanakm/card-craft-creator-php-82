
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

// Fix image orientation and create circular image with proper handling
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
      
      // Set canvas size with higher resolution for better quality
      const scale = 3; // Increased scale for better PDF quality
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Scale the context to match the higher resolution
      ctx.scale(scale, scale);
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Clear the canvas with transparent background
      ctx.clearRect(0, 0, width, height);
      
      // Create circular clipping path
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      
      // Reset transformations and disable any automatic orientation
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      
      // Draw the image without any rotation - maintain original orientation
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with high quality
      const circularImageData = canvas.toDataURL('image/png', 1.0);
      resolve(circularImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.style.imageOrientation = 'none';
    img.src = imageData;
  });
};

// Fix image loading to prevent rotation issues
const loadImageWithProperOrientation = (imageData: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`Image loaded: ${img.width}x${img.height}`);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.style.imageOrientation = 'none';
    img.src = imageData;
  });
};

// Add padding constraints for text positioning
const applyPaddingConstraints = (x: number, y: number, fontSize: number, cardDimensions: { width: number; height: number }) => {
  const padding = 10;
  const minX = padding;
  const maxX = cardDimensions.width - padding;
  const minY = fontSize + padding;
  const maxY = cardDimensions.height - padding;
  
  return {
    x: Math.max(minX, Math.min(x, maxX)),
    y: Math.max(minY, Math.min(y, maxY))
  };
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  // Use exact dimensions matching the preview with higher resolution
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF with higher resolution for better quality
  const scaleFactor = 2; // 2x resolution for crisp output
  const pdfWidth = cardDimensions.width * scaleFactor;
  const pdfHeight = cardDimensions.height * scaleFactor;

  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [pdfWidth, pdfHeight]
  });

  for (const record of records) {
    if (backgroundImage) {
      const img = await loadImageWithProperOrientation(backgroundImage);
      doc.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          // Scale photo dimensions for higher resolution
          const imageWidth = (field.photoWidth || 60) * scaleFactor;
          const imageHeight = (field.photoHeight || 60) * scaleFactor;
          const scaledX = field.x * scaleFactor;
          const scaledY = field.y * scaleFactor;
          
          console.log(`Processing photo for field ${field.field}: ${value}`);
          
          if (field.photoShape === "circle") {
            try {
              const circularImageData = await createCircularImage(photoBase64, imageWidth / scaleFactor, imageHeight / scaleFactor);
              doc.addImage(circularImageData, 'PNG', scaledX, scaledY, imageWidth, imageHeight);
            } catch (error) {
              console.error('Error creating circular image:', error);
              const img = await loadImageWithProperOrientation(photoBase64);
              doc.addImage(img, 'JPEG', scaledX, scaledY, imageWidth, imageHeight);
            }
          } else {
            try {
              const img = await loadImageWithProperOrientation(photoBase64);
              doc.addImage(img, 'JPEG', scaledX, scaledY, imageWidth, imageHeight);
            } catch (error) {
              console.error('Error loading image:', error);
              doc.addImage(photoBase64, 'JPEG', scaledX, scaledY, imageWidth, imageHeight);
            }
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          // Scale font size and position for missing photo text
          doc.setFont(field.fontFamily, field.fontWeight);
          doc.setFontSize(field.fontSize * scaleFactor * 0.75); // Adjusted scaling for text
          doc.setTextColor(field.color);
          doc.text(`Photo Missing: ${field.field}`, field.x * scaleFactor, (field.y + field.fontSize) * scaleFactor);
        }
      } else {
        // Handle text fields with proper scaling to match preview
        doc.setFont(field.fontFamily, field.fontWeight);
        
        // Scale font size to match preview appearance - use 1.2x multiplier for better visual match
        const scaledFontSize = field.fontSize * scaleFactor * 1.2;
        doc.setFontSize(scaledFontSize);
        doc.setTextColor(field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Apply padding constraints with scaled dimensions
        const scaledCardDimensions = {
          width: cardDimensions.width * scaleFactor,
          height: cardDimensions.height * scaleFactor
        };
        const constrainedPos = applyPaddingConstraints(
          field.x * scaleFactor, 
          field.y * scaleFactor, 
          scaledFontSize, 
          scaledCardDimensions
        );
        
        // Calculate maximum width for text wrapping with scaling
        const maxWidth = scaledCardDimensions.width - constrainedPos.x - (10 * scaleFactor);
        
        // Use splitTextToSize with scaled dimensions
        const textLines = doc.splitTextToSize(cleanedValue, maxWidth);
        
        // Position text with proper scaling
        doc.text(textLines, constrainedPos.x, constrainedPos.y);
      }
    }

    if (records.indexOf(record) < records.length - 1) {
      doc.addPage();
    }
  }

  doc.save('id-cards.pdf');
};

// Make generatePDF available globally
declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;

export { generatePDF };
