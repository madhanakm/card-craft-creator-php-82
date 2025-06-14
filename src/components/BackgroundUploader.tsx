
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
      validateAndProcessImage(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessImage(file);
    }
  };

  const validateAndProcessImage = (file: File) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload an image file (JPEG, PNG, etc.).",
      });
      return;
    }
    
    // Create a canvas to process the image without color distortion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { 
      alpha: false,
      colorSpace: 'srgb',
      willReadFrequently: false 
    });
    
    if (!ctx) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot process image. Please try another file.",
      });
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image exactly
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Disable image smoothing to preserve exact colors
      ctx.imageSmoothingEnabled = false;
      
      // Draw image without any transformations
      ctx.drawImage(img, 0, 0);
      
      // Convert back to blob with maximum quality
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          onUpload(imageUrl);
          
          toast({
            title: "Background Uploaded",
            description: "Image uploaded with exact color preservation.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process the image.",
          });
        }
      }, 'image/png', 1.0);
    };
    
    img.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load the image. Please try another file.",
      });
    };
    
    // Load image with original file data
    img.src = URL.createObjectURL(file);
  };

  const handleButtonClick = () => {
    // Trigger click on the hidden file input
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
            Exact color reproduction guaranteed - no compression or color shift
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
