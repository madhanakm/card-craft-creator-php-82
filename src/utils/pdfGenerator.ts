
import { jsPDF } from "jspdf";

// Define the ID card dimensions in mm (standard ID card size)
const CARD_DIMENSIONS = {
  portrait: { width: 53.98, height: 85.6 },
  landscape: { width: 85.6, height: 53.98 }
};

// Extended field type to include color, photo properties, and font family
export interface CardField {
  id: string; 
  field: string;
  x: number; 
  y: number; 
  fontSize: number; 
  fontWeight: string;
  color?: string; // Hex color code for text
  fontFamily?: string; // Font family
  isPhoto?: boolean; // Flag to indicate if field contains photo filename
  photoShape?: "square" | "circle"; // Shape of the photo
  photoWidth?: number; // Width of photo in pixels
  photoHeight?: number; // Height of photo in pixels
}

// Function to load image from file path with better error handling
const loadImageFromPath = (imagePath: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    // Try direct file access first
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If direct access fails, try with file:// protocol
      const fileURL = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "Anonymous";
      
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
      
      fallbackImg.src = fileURL;
    };
    
    img.src = imagePath;
  });
};

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

      img.onload = async () => {
        try {
          // Photo preloading for all records with improved loading
          const photoCache: Record<string, HTMLImageElement> = {};
          const photoPromises: Promise<void>[] = [];
          
          records.forEach(record => {
            fields.filter(f => f.isPhoto).forEach(field => {
              const photoFilename = record[field.field];
              if (!photoFilename) return;
              
              const cleanFilename = photoFilename.trim();
              const cacheKey = `${photoFolder || ""}:${cleanFilename}`;
              if (photoCache[cacheKey]) return;
              
              // Create full path to photo
              const photoPath = photoFolder ? `${photoFolder}/${cleanFilename}` : cleanFilename;
              
              const photoPromise = loadImageFromPath(photoPath)
                .then(photoImg => {
                  console.log("PDF generator photo loaded:", photoPath);
                  photoCache[cacheKey] = photoImg;
                })
                .catch(error => {
                  console.error(`Failed to load photo: ${photoPath}`, error);
                });
              
              photoPromises.push(photoPromise);
            });
          });
          
          // Wait for all photos to load (or fail)
          await Promise.allSettled(photoPromises);
          
          renderPDFCards();
        } catch (error) {
          console.error("Error during photo loading:", error);
          renderPDFCards(); // Continue without photos
        }
        
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
                
                const cleanFilename = photoFilename.trim();
                const cacheKey = `${photoFolder || ""}:${cleanFilename}`;
                const photoImg = photoCache[cacheKey];
                if (!photoImg) return;
                
                const photoX = x + (field.x * scale);
                const photoY = y + (field.y * scale);
                
                // Define photo dimensions matching preview
                const photoWidth = (field.photoWidth || 60) * scale;
                const photoHeight = (field.photoHeight || 60) * scale;
                
                // Add the photo image
                pdf.addImage(
                  photoImg,
                  'JPEG',
                  photoX,
                  photoY,
                  photoWidth,
                  photoHeight
                );
                
                // If circle shape is selected, add a circle overlay
                if (field.photoShape === "circle") {
                  pdf.saveGraphicsState();
                  const centerX = photoX + photoWidth / 2;
                  const centerY = photoY + photoHeight / 2;
                  const radius = Math.min(photoWidth, photoHeight) / 2;
                  
                  // Create a white circle to mask the square photo
                  pdf.setFillColor(255, 255, 255);
                  pdf.setDrawColor(255, 255, 255);
                  
                  // Draw four rectangles around the circle to create the mask effect
                  // Top rectangle
                  pdf.rect(photoX, photoY, photoWidth, centerY - photoY - radius, "F");
                  // Bottom rectangle  
                  pdf.rect(photoX, centerY + radius, photoWidth, photoY + photoHeight - centerY - radius, "F");
                  // Left rectangle
                  pdf.rect(photoX, centerY - radius, centerX - photoX - radius, radius * 2, "F");
                  // Right rectangle
                  pdf.rect(centerX + radius, centerY - radius, photoX + photoWidth - centerX - radius, radius * 2, "F");
                  
                  pdf.restoreGraphicsState();
                }
                
                return;
              }
              
              const value = record[field.field] || '';
              
              // Skip empty values
              if (!value) return;
              
              // Set the font properties with font family support
              const fontFamily = field.fontFamily || "helvetica";
              const fontWeight = field.fontWeight === "bold" ? "bold" : "normal";
              
              try {
                pdf.setFont(fontFamily, fontWeight);
              } catch (e) {
                // Fallback to helvetica if font is not available
                pdf.setFont("helvetica", fontWeight);
              }
              
              pdf.setFontSize(field.fontSize * 0.75); // Adjust font size for PDF to match preview
              
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
              const yPos = y + (field.y * scale + field.fontSize * 0.75); // Adjust y position to match preview
              
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
