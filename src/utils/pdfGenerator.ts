
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

const loadPhotoFromFolder = async (filename: string, photoFolder: string): Promise<string | null> => {
  if (!filename || !photoFolder) {
    return null;
  }

  const fullPath = `${photoFolder}/${filename}`;

  if (photoCache.has(fullPath)) {
    return photoCache.get(fullPath) || null;
  }

  try {
    const base64Image = await loadImageAsBase64(fullPath);
    photoCache.set(fullPath, base64Image);
    return base64Image;
  } catch (error) {
    console.error(`Error loading image ${fullPath}:`, error);
    return null;
  }
};

const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = src;
  });
};

const generatePDF = async (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  photoFolder: string = ''
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
        const photoBase64 = await loadPhotoFromFolder(value, photoFolder);
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
      doc.addPage({
        orientation,
        format: [85.6 * 3.7795275591, 53.98 * 3.7795275591]
      });
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
