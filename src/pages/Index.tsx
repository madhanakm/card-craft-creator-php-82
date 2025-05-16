
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUploader from "@/components/CSVUploader";
import BackgroundUploader from "@/components/BackgroundUploader";
import CardDesigner from "@/components/CardDesigner";
import CardPreview from "@/components/CardPreview";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<{ headers: string[]; records: Record<string, string>[]; }>({ headers: [], records: [] });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [cardFields, setCardFields] = useState<Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>>([]);
  const [activeStep, setActiveStep] = useState("upload-data");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewsPerPage, setPreviewsPerPage] = useState(5);

  const handleCSVUpload = (data: { headers: string[]; records: Record<string, string>[]; }) => {
    setCsvData(data);
    
    // Create initial card fields from headers
    const initialFields = data.headers.map((header, index) => ({
      id: `field-${index}`,
      field: header,
      x: 50,
      y: 50 + (index * 30),
      fontSize: 14,
      fontWeight: "normal"
    }));
    
    setCardFields(initialFields);
    setCurrentPreviewIndex(0);
    
    toast({
      title: "CSV File Uploaded",
      description: `Successfully loaded ${data.records.length} records with ${data.headers.length} fields.`,
    });
  };

  const handleBackgroundUpload = (imageUrl: string) => {
    setBackgroundImage(imageUrl);
    toast({
      title: "Background Uploaded",
      description: "Your background image has been set.",
    });
  };

  const handleFieldUpdate = (updatedFields: Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>) => {
    setCardFields(updatedFields);
  };

  const handleOrientationToggle = () => {
    setOrientation(orientation === "portrait" ? "landscape" : "portrait");
  };

  const handleNextStep = () => {
    if (activeStep === "upload-data" && csvData.headers.length > 0) {
      setActiveStep("upload-background");
    } else if (activeStep === "upload-background" && backgroundImage) {
      setActiveStep("design");
    }
  };

  const handleGeneratePDF = async () => {
    if (typeof window.generatePDF !== 'function' || !backgroundImage) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "PDF generation is not available or background image is missing.",
      });
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      await window.generatePDF(csvData.records, cardFields, backgroundImage, orientation);
      toast({
        title: "Success",
        description: `Generated PDF with ${csvData.records.length} ID cards.`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  const nextPreview = () => {
    if (currentPreviewIndex < csvData.records.length - 1) {
      setCurrentPreviewIndex(currentPreviewIndex + 1);
    }
  };
  
  const prevPreview = () => {
    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(currentPreviewIndex - 1);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">ID Card Generator</h1>
      
      <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="upload-data">1. Upload CSV Data</TabsTrigger>
          <TabsTrigger value="upload-background" disabled={csvData.headers.length === 0}>2. Upload Background</TabsTrigger>
          <TabsTrigger value="design" disabled={!backgroundImage}>3. Design & Download</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload-data" className="mt-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
              <CSVUploader onUpload={handleCSVUpload} />
              
              {csvData.headers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">CSV Data Preview</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          {csvData.headers.map((header, index) => (
                            <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvData.records.slice(0, previewsPerPage).map((record, rowIndex) => (
                          <tr key={rowIndex}>
                            {csvData.headers.map((header, colIndex) => (
                              <td key={colIndex} className="px-3 py-2 text-sm text-gray-500">
                                {record[header]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.records.length > previewsPerPage && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing {previewsPerPage} of {csvData.records.length} records
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Upload a CSV file with your ID card data</li>
                <li>The first row should contain the field names</li>
                <li>Each row after that represents one ID card</li>
                <li>Make sure your CSV file is properly formatted</li>
                <li>Recommended fields: Name, ID, Department, etc.</li>
                <li><strong>Large datasets supported:</strong> This application can handle large CSV files with many records</li>
              </ul>
            </div>
          </div>
          
          {csvData.headers.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button onClick={handleNextStep}>Next: Upload Background</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upload-background" className="mt-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Upload Background Image</h2>
              <BackgroundUploader onUpload={handleBackgroundUpload} />
            </div>
            
            {backgroundImage && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Background Preview</h2>
                <div className="aspect-[85.6/53.98] relative overflow-hidden rounded border border-gray-200">
                  <img 
                    src={backgroundImage} 
                    alt="ID Card Background" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
          
          {backgroundImage && (
            <div className="mt-8 flex justify-end">
              <Button onClick={handleNextStep}>Next: Design Card</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="design" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Design ID Card</h2>
                <Button 
                  variant="outline" 
                  onClick={handleOrientationToggle}
                >
                  Toggle {orientation === "portrait" ? "Landscape" : "Portrait"}
                </Button>
              </div>
              
              <CardDesigner 
                fields={cardFields}
                onFieldsUpdate={handleFieldUpdate}
                backgroundImage={backgroundImage || ''}
                orientation={orientation}
              />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Card Preview</h2>
              
              {csvData.records.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      Previewing record {currentPreviewIndex + 1} of {csvData.records.length}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={prevPreview}
                        disabled={currentPreviewIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={nextPreview}
                        disabled={currentPreviewIndex === csvData.records.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <CardPreview 
                backgroundImage={backgroundImage || ''}
                fields={cardFields}
                data={csvData.records[currentPreviewIndex] || {}}
                orientation={orientation}
              />
              
              <div className="mt-6">
                <Button 
                  className="w-full" 
                  onClick={handleGeneratePDF} 
                  disabled={isGeneratingPDF || csvData.records.length === 0}
                >
                  {isGeneratingPDF ? "Generating..." : "Generate PDF"}
                  <Download className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
