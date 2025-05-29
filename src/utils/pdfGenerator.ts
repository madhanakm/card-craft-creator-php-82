
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

const loadPhotoFromFiles = async (filename: string, selectedFiles: FileList | null): Promise<string | null> => {
  if (!filename || !selectedFiles) {
    return null;
  }

  const cacheKey = `file:${filename}`;
  
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || null;
  }

  try {
    // Find the file that matches the filename
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.name === filename || file.name === filename.trim()) {
        const base64Image = await convertFileToBase64(file);
        photoCache.set(cacheKey, base64Image);
        return base64Image;
      }
    }
    
    console.warn(`Photo file not found: ${filename}`);
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

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  selectedFiles: FileList | null = null
) => {
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [85.6 * 3.7795275591, 53.98 * 3.7795275591] // ID card size in mm converted to pixels
  });

  for (const record of records) {
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
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
          const imageWidth = field.photoWidth || 50;
          const imageHeight = field.photoHeight || 50;
          doc.addImage(photoBase64, 'PNG', field.x, field.y, imageWidth, imageHeight);
        } else {
          console.warn(`Photo not found for ${field.field}: ${value}`);
          doc.setFont(field.fontFamily, field.fontWeight);
          doc.setFontSize(field.fontSize);
          doc.setTextColor(field.color);
          doc.text(`Photo Missing: ${field.field}`, field.x, field.y);
        }
      } else {
        doc.setFont(field.fontFamily, field.fontWeight);
        doc.setFontSize(field.fontSize);
        doc.setTextColor(field.color);
        doc.text(value, field.x, field.y);
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
