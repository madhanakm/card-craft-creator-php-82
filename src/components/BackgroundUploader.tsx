
import { useState, useRef } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface BackgroundUploaderProps {
  onUpload: (imageUrl: string) => void;
}

const BackgroundUploader: React.FC<BackgroundUploaderProps> = ({ onUpload }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload an image file (JPEG, PNG, etc.).",
      });
      return;
    }
    
    // Create object URL directly from file without any processing
    // This preserves the exact binary data and colors
    const imageUrl = URL.createObjectURL(file);
    onUpload(imageUrl);
    
    toast({
      title: "Background Uploaded",
      description: "Original image uploaded with zero color processing - exact colors preserved.",
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
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
            Drag & drop your background image here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Recommended size: 3.38" x 2.13" (85.6mm x 53.98mm) for standard ID cards
          </p>
          <p className="text-xs text-blue-600 mb-4">
            Zero processing - Original file used directly for perfect color matching
          </p>
          <Button variant="outline" className="cursor-pointer" onClick={handleButtonClick}>
            <ImagePlus className="h-4 w-4 mr-2" />
            Select Image
          </Button>
          <input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default BackgroundUploader;
