
import { useState, useRef } from "react";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface CSVUploaderProps {
  onUpload: (data: { headers: string[]; records: Record<string, string>[]; }) => void;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onUpload }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = (csvText: string) => {
    try {
      // Split by line breaks to get rows
      const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== '');
      
      if (rows.length === 0) {
        throw new Error("The CSV file appears to be empty.");
      }
      
      // Parse the header row (first row)
      const headers = rows[0].split(',').map(header => header.trim());
      
      // Process the data rows
      const records: Record<string, string>[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(value => value.trim());
        const record: Record<string, string> = {};
        
        // Make sure we have the right number of values
        if (values.length !== headers.length) {
          continue; // Skip malformed rows
        }
        
        // Map each value to its corresponding header
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = values[j];
        }
        
        records.push(record);
      }
      
      // Return the processed data
      onUpload({ headers, records });
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process the CSV file. Please check the format and try again.",
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please upload a CSV file.",
        });
        return;
      }
      
      readFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please upload a CSV file.",
        });
        return;
      }
      
      readFile(file);
    }
  };

  const handleButtonClick = () => {
    // Trigger click on the hidden file input
    fileInputRef.current?.click();
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processCSV(content);
    };
    
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to read the file. Please try again.",
      });
    };
    
    reader.readAsText(file);
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
      >
        <div className="flex flex-col items-center">
          <Upload className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-4">
            Drag & drop your CSV file here, or click to browse
          </p>
          <Button variant="outline" className="cursor-pointer" onClick={handleButtonClick}>
            <FileUp className="h-4 w-4 mr-2" />
            Select CSV File
          </Button>
          <input
            ref={fileInputRef}
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
