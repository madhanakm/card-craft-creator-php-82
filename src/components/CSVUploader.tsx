
import { useState, useRef } from "react";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';

interface CSVUploaderProps {
  onUpload: (data: { headers: string[]; records: Record<string, string>[]; }) => void;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onUpload }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processExcelFile = (file: File) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            throw new Error("The Excel file appears to be empty.");
          }
          
          // Get headers from first row
          const headers = (jsonData[0] as string[]).map(header => String(header).trim());
          
          // Process data rows
          const records: Record<string, string>[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;
            
            const record: Record<string, string> = {};
            
            // Map each value to its corresponding header
            for (let j = 0; j < headers.length; j++) {
              record[headers[j]] = row[j] ? String(row[j]).trim() : '';
            }
            
            records.push(record);
          }
          
          onUpload({ headers, records });
        } catch (error) {
          console.error("Error processing Excel file:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process the Excel file. Please check the format and try again.",
          });
        }
      };
      
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to read the Excel file. Please try again.",
      });
    }
  };

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
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv') || file.type === "text/csv";
    
    if (!isExcel && !isCSV) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a CSV or Excel (.xlsx) file.",
      });
      return;
    }
    
    if (isExcel) {
      processExcelFile(file);
    } else {
      readCSVFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const readCSVFile = (file: File) => {
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
            Drag & drop your CSV or Excel file here, or click to browse
          </p>
          <Button variant="outline" className="cursor-pointer" onClick={handleButtonClick}>
            <FileUp className="h-4 w-4 mr-2" />
            Select CSV/Excel File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
