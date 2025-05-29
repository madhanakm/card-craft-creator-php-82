
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

// Create a circular canvas from an image with improved quality and no black outline
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
      const scale = 2; // 2x resolution for better quality
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
      
      // Draw the image with better quality
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with high quality
      const circularImageData = canvas.toDataURL('image/png', 1.0); // Use PNG for transparency, max quality
      resolve(circularImageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous'; // Handle CORS issues
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
  // Use exact dimensions matching the preview
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [cardDimensions.width, cardDimensions.height]
  });

  for (const record of records) {
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, 'PNG', 0, 0, cardDimensions.width, cardDimensions.height);
          resolve(null);
        };
        img.onerror = reject;
      });
    }

    for (const field of fields) {
      const value = record[field.field] || '';
      
      // Check if the field is a photo field
      if (field.isPhoto) {
        const photoBase64 = await loadPhotoFromFiles(value, selectedFiles);
        if (photoBase64) {
          const imageWidth = field.photoWidth || 60;
          const imageHeight = field.photoHeight || 60;
          
          if (field.photoShape === "circle") {
            // Create a circular version of the image with improved quality
            try {
              const circularImageData = await createCircularImage(photoBase64, imageWidth, imageHeight);
              doc.addImage(circularImageData, 'PNG', field.x, field.y, imageWidth, imageHeight);
            } catch (error) {
              console.error('Error creating circular image:', error);
              // Fallback to square image
              doc.addImage(photoBase64, 'JPEG', field.x, field.y, imageWidth, imageHeight);
            }
          } else {
            // Regular square/rectangle photo
            doc.addImage(photoBase64, 'JPEG', field.x, field.y, imageWidth, imageHeight);
          }
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          doc.setFont(field.fontFamily, field.fontWeight);
          doc.setFontSize(field.fontSize);
          doc.setTextColor(field.color);
          doc.text(`Photo Missing: ${field.field}`, field.x, field.y + field.fontSize);
        }
      } else {
        // Handle text fields with exact same positioning as preview
        doc.setFont(field.fontFamily, field.fontWeight);
        doc.setFontSize(field.fontSize);
        doc.setTextColor(field.color);
        
        // Clean the value (remove quotes)
        const cleanedValue = value.replace(/^"|"$/g, '');
        
        // Position text exactly as in preview (add fontSize to y for baseline alignment)
        doc.text(cleanedValue, field.x, field.y + field.fontSize);
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
