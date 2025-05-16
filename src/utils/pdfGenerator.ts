
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
      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: orientation === "portrait" ? "portrait" : "landscape",
        unit: "mm",
        format: [
          CARD_DIMENSIONS[orientation].width,
          CARD_DIMENSIONS[orientation].height
        ]
      });

      // Load the background image
      const img = new Image();
      img.src = backgroundImage;

      img.onload = () => {
        // For each record, create a new page with an ID card
        records.forEach((record, index) => {
          // Add a new page for each card after the first one
          if (index > 0) {
            pdf.addPage();
          }

          // Add the background image
          pdf.addImage(
            img,
            'JPEG',
            0,
            0,
            CARD_DIMENSIONS[orientation].width,
            CARD_DIMENSIONS[orientation].height
          );

          // Scale factor to convert from pixels to mm
          // Assuming the designer uses a 300px width for portrait cards
          const scale = orientation === "portrait" 
            ? CARD_DIMENSIONS.portrait.width / 300
            : CARD_DIMENSIONS.landscape.width / 480;

          // Add each text field
          fields.forEach(field => {
            const value = record[field.field] || '';
            
            // Set the font properties
            pdf.setFontSize(field.fontSize * 0.75); // Adjust font size for PDF
            pdf.setFont("helvetica", field.fontWeight === "bold" ? "bold" : "normal");
            
            // Calculate the position in mm
            const xPos = field.x * scale;
            const yPos = field.y * scale;
            
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
