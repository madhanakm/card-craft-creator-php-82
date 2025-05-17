
import { jsPDF } from "jspdf";

// Define the ID card dimensions in mm (standard ID card size)
const CARD_DIMENSIONS = {
  portrait: { width: 53.98, height: 85.6 },
  landscape: { width: 85.6, height: 53.98 }
};

// Extended field type to include color, photo properties
export interface CardField {
  id: string; 
  field: string;
  x: number; 
  y: number; 
  fontSize: number; 
  fontWeight: string;
  color?: string; // Hex color code for text
  isPhoto?: boolean; // Flag to indicate if field contains photo filename
  photoShape?: "square" | "circle"; // Shape of the photo
  photoWidth?: number; // Width of photo in pixels
  photoHeight?: number; // Height of photo in pixels
}

// Function to generate the PDF with all ID cards
export const generatePDF = (
  records: Record<string, string>[],
  fields: CardField[],
  backgroundImage: string,
  orientation: "portrait" | "landscape",
  photoFolder?: string // Path to folder containing photos
) => {
  return new Promise<void>((resolve, reject) => {
    try {
      // Create a new PDF document with A4 format to allow multiple cards per page
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Calculate how many cards we can fit on a page (with 5mm margins)
      const cardsPerRow = Math.floor((pageWidth - 10) / (CARD_DIMENSIONS[orientation].width + 5));
      const cardsPerColumn = Math.floor((pageHeight - 10) / (CARD_DIMENSIONS[orientation].height + 5));
      const cardsPerPage = cardsPerRow * cardsPerColumn;

      // Load the background image
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = backgroundImage;

      img.onload = () => {
        // Process each record to create an ID card
        let loadedPhotos = 0;
        let totalPhotoFields = 0;
        
        // Count how many photo fields we need to load
        records.forEach(record => {
          fields.filter(f => f.isPhoto).forEach(field => {
            if (record[field.field]) totalPhotoFields++;
          });
        });
        
        // If no photos, proceed with rendering
        if (totalPhotoFields === 0) {
          renderPDFCards();
          return;
        }
        
        // Photo preloading for all records
        const photoCache: Record<string, HTMLImageElement> = {};
        
        records.forEach(record => {
          fields.filter(f => f.isPhoto).forEach(field => {
            const photoFilename = record[field.field];
            if (!photoFilename) return;
            
            const cacheKey = `${photoFolder || ""}:${photoFilename}`;
            if (photoCache[cacheKey]) return;
            
            const photoImg = new Image();
            photoImg.crossOrigin = "Anonymous";
            // Create full path to photo
            const photoPath = photoFolder ? `${photoFolder}/${photoFilename}` : photoFilename;
            
            console.log("PDF generator loading photo:", photoPath);
            photoImg.src = photoPath;
            
            photoImg.onload = () => {
              console.log("PDF generator photo loaded:", photoPath);
              photoCache[cacheKey] = photoImg;
              loadedPhotos++;
              
              // Once all photos are loaded, render the PDF
              if (loadedPhotos === totalPhotoFields) {
                renderPDFCards();
              }
            };
            
            photoImg.onerror = (e) => {
              console.error(`Failed to load photo: ${photoPath}`, e);
              loadedPhotos++;
              // Continue even if some photos fail to load
              if (loadedPhotos === totalPhotoFields) {
                renderPDFCards();
              }
            };
          });
        });
        
        // Function to render PDF cards after all resources are loaded
        function renderPDFCards() {
          // Process each record to create an ID card
          records.forEach((record, index) => {
            // Calculate position on page
            const pageIndex = Math.floor(index / cardsPerPage);
            const positionOnPage = index % cardsPerPage;
            const row = Math.floor(positionOnPage / cardsPerRow);
            const col = positionOnPage % cardsPerRow;
            
            // Add new page if needed
            if (positionOnPage === 0 && index > 0) {
              pdf.addPage();
            }
            
            // Calculate card position on page (with margins)
            const x = 5 + col * (CARD_DIMENSIONS[orientation].width + 5);
            const y = 5 + row * (CARD_DIMENSIONS[orientation].height + 5);
            
            // Add the background image for this card
            pdf.addImage(
              img,
              'JPEG',
              x,
              y,
              CARD_DIMENSIONS[orientation].width,
              CARD_DIMENSIONS[orientation].height
            );

            // Scale factor to convert from pixels to mm
            // Assuming the designer uses a 300px width for portrait cards or 480px for landscape
            const scale = orientation === "portrait" 
              ? CARD_DIMENSIONS.portrait.width / 300
              : CARD_DIMENSIONS.landscape.width / 480;

            // Add each field for this card
            fields.forEach(field => {
              // If this is a photo field, handle differently
              if (field.isPhoto) {
                const photoFilename = record[field.field];
                if (!photoFilename) return;
                
                const cacheKey = `${photoFolder || ""}:${photoFilename}`;
                const photoImg = photoCache[cacheKey];
                if (!photoImg) return;
                
                const photoX = x + (field.x * scale);
                const photoY = y + (field.y * scale);
                
                // Define photo dimensions
                const photoWidth = (field.photoWidth || 60) * scale;
                const photoHeight = (field.photoHeight || 60) * scale;
                
                // If circle shape is selected, we need to clip the image
                if (field.photoShape === "circle") {
                  // Save current context to restore later
                  pdf.saveGraphicsState();
                  
                  // Create a circular clipping path
                  const centerX = photoX + photoWidth / 2;
                  const centerY = photoY + photoHeight / 2;
                  const radius = Math.min(photoWidth, photoHeight) / 2;
                  
                  // Create circular clipping path (this is basic and might not be perfect)
                  // jsPDF has limited support for this, so this is a simplified approach
                  pdf.setDrawColor(0);
                  pdf.setFillColor(255, 255, 255);
                  pdf.circle(centerX, centerY, radius, "F");
                  
                  // Add the image (it will be clipped by the path)
                  pdf.addImage(
                    photoImg,
                    'JPEG',
                    photoX,
                    photoY,
                    photoWidth,
                    photoHeight
                  );
                  
                  // Restore the context
                  pdf.restoreGraphicsState();
                } else {
                  // Default square image
                  pdf.addImage(
                    photoImg,
                    'JPEG',
                    photoX,
                    photoY,
                    photoWidth,
                    photoHeight
                  );
                }
                
                return;
              }
              
              const value = record[field.field] || '';
              
              // Skip empty values
              if (!value) return;
              
              // Set the font properties
              pdf.setFontSize(field.fontSize * 0.75); // Adjust font size for PDF
              pdf.setFont("helvetica", field.fontWeight === "bold" ? "bold" : "normal");
              
              // Set text color if provided, otherwise use default black
              if (field.color) {
                // Convert hex to RGB
                const hex = field.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                pdf.setTextColor(r, g, b);
              } else {
                pdf.setTextColor(0, 0, 0);
              }
              
              // Calculate the position in mm, relative to this card's position
              const xPos = x + (field.x * scale);
              const yPos = y + (field.y * scale);
              
              // Clean the text value - remove unwanted quotes
              const cleanedValue = value.replace(/^"|"$/g, '');
              
              // Get available width for text wrapping
              const maxWidth = CARD_DIMENSIONS[orientation].width - (field.x * scale) - 2; // 2mm margin
              
              // Add the text to the PDF with word wrapping to prevent overlap
              const splitText = pdf.splitTextToSize(cleanedValue, maxWidth);
              pdf.text(splitText, xPos, yPos);
            });
          });

          // Save the PDF
          pdf.save('id-cards.pdf');
          resolve();
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load background image"));
      };
    } catch (error) {
      reject(error);
    }
  });
};

// Add the function to the window object to make it accessible from components
declare global {
  interface Window {
    generatePDF: typeof generatePDF;
  }
}

window.generatePDF = generatePDF;
