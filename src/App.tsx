import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import CSVUploader from './components/CSVUploader';
import BackgroundUploader from './components/BackgroundUploader';
import FontUploader from './components/FontUploader';
import CardDesigner from './components/CardDesigner';
import CardPreview from './components/CardPreview';
import { Button } from "@/components/ui/button";
import { CardField } from './utils/pdfGenerator';
import { Download, RotateCcw } from "lucide-react";
import './App.css';

interface CustomFont {
  id: string;
  name: string;
  family: string;
  weight: string;
  style: string;
  url: string;
}

function App() {
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [fields, setFields] = useState<CardField[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleCSVUpload = (data: { headers: string[]; records: Record<string, string>[]; }) => {
    setCsvData(data.records);
    // Note: We're not handling selectedFiles here since CSVUploader doesn't provide it
    
    if (data.records.length > 0) {
      const columns = data.headers;
      const newFields: CardField[] = columns.map((column, index) => ({
        id: `field-${index}`,
        field: column,
        x: 10,
        y: 20 + (index * 25),
        fontSize: 14,
        fontWeight: "normal",
        fontFamily: "helvetica",
        color: "#000000",
        textAlign: "left",
        lineHeight: 1.2,
        textAreaWidth: 200,
        textAreaHeight: 20
      }));
      setFields(newFields);
    }
  };

  const handleFontsUpdate = (fonts: CustomFont[]) => {
    setCustomFonts(fonts);
  };

  const generatePDF = () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    if (!backgroundImage) {
      alert('Please upload a background image first');
      return;
    }

    if (typeof window.generatePDF === 'function') {
      window.generatePDF(csvData, fields, backgroundImage, orientation, selectedFiles);
    } else {
      console.error('PDF generation function not available');
    }
  };

  const toggleOrientation = () => {
    setOrientation(prev => prev === "portrait" ? "landscape" : "portrait");
  };

  const previewData = csvData.length > 0 ? csvData[0] : {};

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ID Card Generator</h1>
          <p className="text-gray-600">Create professional ID cards with exact color matching</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="background">Background</TabsTrigger>
                <TabsTrigger value="fonts">Fonts</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
              </TabsList>
              
              <TabsContent value="data" className="space-y-4">
                <CSVUploader onUpload={handleCSVUpload} />
              </TabsContent>
              
              <TabsContent value="background" className="space-y-4">
                <BackgroundUploader onUpload={setBackgroundImage} />
              </TabsContent>

              <TabsContent value="fonts" className="space-y-4">
                <FontUploader onFontsUpdate={handleFontsUpdate} customFonts={customFonts} />
              </TabsContent>
              
              <TabsContent value="design" className="space-y-4">
                {fields.length > 0 && backgroundImage && (
                  <CardDesigner
                    fields={fields}
                    onFieldsUpdate={setFields}
                    backgroundImage={backgroundImage}
                    orientation={orientation}
                    customFonts={customFonts}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button onClick={toggleOrientation} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                {orientation === "portrait" ? "Switch to Landscape" : "Switch to Portrait"}
              </Button>
              <Button onClick={generatePDF} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              {backgroundImage && fields.length > 0 ? (
                <CardPreview
                  backgroundImage={backgroundImage}
                  fields={fields}
                  data={previewData}
                  orientation={orientation}
                  selectedFiles={selectedFiles}
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Upload background and data to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
