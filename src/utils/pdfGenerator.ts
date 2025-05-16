
import { jsPDF } from "jspdf";

// Define the ID card dimensions in mm (standard ID card size)
const CARD_DIMENSIONS = {
  portrait: { width: 53.98, height: 85.6 },
  landscape: { width: 85.6, height: 53.98 }
};

// Function to generate the PDF with all ID cards
export const generatePDF = (
  records: Record<string, string>[],
  fields: Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>,
  backgroundImage: string,
  orientation: "portrait" | "landscape"
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
      img.src = backgroundImage;

      img.onload = () => {
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

          // Add each text field for this card
          fields.forEach(field => {
            const value = record[field.field] || '';
            
            // Skip empty values
            if (!value) return;
            
            // Set the font properties
            pdf.setFontSize(field.fontSize * 0.75); // Adjust font size for PDF
            pdf.setFont("helvetica", field.fontWeight === "bold" ? "bold" : "normal");
            
            // Calculate the position in mm, relative to this card's position
            const xPos = x + (field.x * scale);
            const yPos = y + (field.y * scale);
            
            // Add the text to the PDF
            pdf.text(value, xPos, yPos);
          });
        });

        // Save the PDF
        pdf.save('id-cards.pdf');
        resolve();
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
