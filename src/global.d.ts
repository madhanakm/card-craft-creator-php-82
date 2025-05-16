
// Type definitions for the PDF generator function
declare module "jspdf" {
  export class jsPDF {
    constructor(options?: {
      orientation?: "portrait" | "landscape";
      unit?: string;
      format?: number[];
    });
    
    addPage(): jsPDF;
    addImage(
      imageData: string | HTMLImageElement,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(font: string, style?: string): jsPDF;
    text(text: string, x: number, y: number, options?: object): jsPDF;
    save(filename: string): jsPDF;
  }
}
