
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

// Convert background image to JPEG format to avoid transparency issues in CorelDraw
const convertBackgroundToJPEG = (imageData: string): Promise<string> => {
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
      
      // Fill with white background to avoid transparency issues
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image on top
      ctx.drawImage(img, 0, 0);
      
      // Convert to JPEG with high quality (no transparency)
      const jpegData = canvas.toDataURL('image/jpeg', 0.95);
      resolve(jpegData);
    };
    
    img.onerror = () => reject(new Error('Failed to load background image'));
    img.crossOrigin = 'anonymous';
    img.src = imageData;
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
      
      // Convert to PNG with high quality
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

// Enhanced padding constraints for better text positioning
const applyPaddingConstraints = (x: number, y: number, fontSize: number, cardDimensions: { width: number; height: number }) => {
  const padding = 15; // Increased padding for better margins
  const minX = padding;
  const maxX = cardDimensions.width - padding - 20; // Extra margin for text
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
  // Use exact dimensions matching the preview - no scaling to maintain 1:1 accuracy
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Create PDF with exact preview dimensions for perfect accuracy
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [cardDimensions.width, cardDimensions.height]
  });

  // Convert background to JPEG for CorelDraw compatibility
  const backgroundJPEG = backgroundImage ? await convertBackgroundToJPEG(backgroundImage) : null;

  for (const record of records) {
    if (backgroundJPEG) {
      const img = await loadImageWithProperOrientation(backgroundJPEG);
      // Use JPEG format specifically for better CorelDraw compatibility
      doc.addImage(img, 'JPEG', 0, 0, cardDimensions.width, cardDimensions.height);
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          // Use exact dimensions without scaling for perfect accuracy
          const imageWidth = field.photoWidth || 60;
          const imageHeight = field.photoHeight || 60;
          
          console.log(`Processing photo for field ${field.field}: ${value}`);
          
          if (field.photoShape === "circle") {
            try {
              const circularImageData = await createCircularImage(photoBase64, imageWidth, imageHeight);
              doc.addImage(circularImageData, 'PNG', field.x, field.y, imageWidth, imageHeight);
            } catch (error) {
              console.error('Error creating circular image:', error);
              const img = await loadImageWithProperOrientation(photoBase64);
              doc.addImage(img, 'JPEG', field.x, field.y, imageWidth, imageHeight);
            }
          } else {
            try {
              const img = await loadImageWithProperOrientation(photoBase64);
              doc.addImage(img, 'JPEG', field.x, field.y, imageWidth, imageHeight);
            } catch (error) {
              console.error('Error loading image:', error);
              doc.addImage(photoBase64, 'JPEG', field.x, field.y, imageWidth, imageHeight);
            }
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          // Use exact font sizing for missing photo text
          doc.setFont(field.fontFamily, field.fontWeight);
          doc.setFontSize(field.fontSize);
          doc.setTextColor(field.color);
          doc.text(`Photo Missing: ${field.field}`, field.x, field.y + field.fontSize);
        }
      } else {
        // Handle text fields with EXACT same sizing as preview
        doc.setFont(field.fontFamily, field.fontWeight);
        
        // Use EXACT font size from preview - NO SCALING OR MULTIPLIERS
        doc.setFontSize(field.fontSize);
        doc.setTextColor(field.color);
        
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Apply enhanced padding constraints
        const constrainedPos = applyPaddingConstraints(
          field.x, 
          field.y, 
          field.fontSize, 
          cardDimensions
        );
        
        // Calculate maximum width for text wrapping with better margins
        const maxWidth = cardDimensions.width - constrainedPos.x - 20;
        
        // Use splitTextToSize with exact dimensions
        const textLines = doc.splitTextToSize(cleanedValue, maxWidth);
        
        // Position text with exact coordinates - NO ADJUSTMENTS
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
