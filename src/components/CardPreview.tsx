
import { cn } from "@/lib/utils";
import { CardField } from "@/utils/pdfGenerator";
import { useState, useEffect } from "react";

interface CardPreviewProps {
  backgroundImage: string;
  fields: CardField[];
  data: Record<string, string>;
  orientation: "portrait" | "landscape";
  photoFolder?: string;
  selectedFiles?: FileList | null;
}

const CardPreview: React.FC<CardPreviewProps> = ({ 
  backgroundImage, 
  fields, 
  data, 
  orientation,
  photoFolder,
  selectedFiles
}) => {
  // Use exact same dimensions as CardDesigner and PDF
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };
    
  // State to track loaded photos
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, string>>({});
  
  // Load photo from selected files
  const loadPhotoFromFiles = async (filename: string): Promise<string | null> => {
    if (!selectedFiles || !filename) return null;
    
    console.log("Looking for photo:", filename, "in", selectedFiles.length, "files");
    
    // Find the file that matches the filename
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileName = file.name;
      
      console.log("Checking file:", fileName, "against:", filename);
      
      if (fileName === filename || fileName === filename.trim()) {
        try {
          const objectURL = URL.createObjectURL(file);
          console.log("Found and loaded photo:", fileName);
          return objectURL;
        } catch (error) {
          console.error("Error creating object URL:", error);
          return null;
        }
      }
    }
    
    console.log("Photo not found:", filename);
    return null;
  };
  
  // Load photos when component mounts or when data/selectedFiles changes
  useEffect(() => {
    const photoFields = fields.filter(f => f.isPhoto);
    
    if (photoFields.length === 0 || !selectedFiles) return;
    
    console.log("Loading photos for", photoFields.length, "photo fields");
    
    const loadPhotos = async () => {
      const newLoadedPhotos: Record<string, string> = {};
      
      for (const field of photoFields) {
        const photoFilename = data[field.field]?.trim();
        if (!photoFilename) continue;
        
        const cacheKey = `file:${photoFilename}`;
        
        // Only load if not already loaded
        if (loadedPhotos[cacheKey]) {
          newLoadedPhotos[cacheKey] = loadedPhotos[cacheKey];
          continue;
        }
        
        const photoURL = await loadPhotoFromFiles(photoFilename);
        if (photoURL) {
          newLoadedPhotos[cacheKey] = photoURL;
        }
      }
      
      setLoadedPhotos(prev => ({ ...prev, ...newLoadedPhotos }));
    };
    
    loadPhotos();
  }, [data, selectedFiles, fields]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(loadedPhotos).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-lg overflow-hidden shadow-lg mb-4"
        style={{
          width: `${cardDimensions.width}px`,
          height: `${cardDimensions.height}px`,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {fields.map((field) => {
          // Check if this is a photo field
          if (field.isPhoto) {
            const photoFilename = data[field.field]?.trim() || "";
            const cacheKey = `file:${photoFilename}`;
            const photoSrc = loadedPhotos[cacheKey];
            
            // Show a placeholder if photo not loaded yet
            if (!photoSrc) {
              return (
                <div
                  key={field.id}
                  className={cn(
                    "absolute overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400",
                    field.photoShape === "circle" && "rounded-full"
                  )}
                  style={{
                    left: `${field.x}px`,
                    top: `${field.y}px`,
                    width: `${field.photoWidth || 60}px`,
                    height: `${field.photoHeight || 60}px`,
                  }}
                >
                  <span className="text-xs text-gray-500 text-center px-1">
                    {photoFilename ? "Photo Missing" : "No Photo"}
                  </span>
                </div>
              );
            }
            
            return (
              <div
                key={field.id}
                className={cn(
                  "absolute overflow-hidden",
                  field.photoShape === "circle" && "rounded-full"
                )}
                style={{
                  left: `${field.x}px`,
                  top: `${field.y}px`,
                  width: `${field.photoWidth || 60}px`,
                  height: `${field.photoHeight || 60}px`,
                }}
              >
                <img 
                  src={photoSrc}
                  alt="ID Photo"
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }
          
          // Handle regular text fields - exact same positioning as PDF
          const fieldValue = data[field.field] || '';
          const cleanedValue = fieldValue.replace(/^"|"$/g, '');
          
          return (
            <div
              key={field.id}
              className="absolute"
              style={{
                left: `${field.x}px`,
                top: `${field.y}px`,
                fontSize: `${field.fontSize}px`,
                fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                fontFamily: field.fontFamily || "helvetica, sans-serif",
                color: field.color || "inherit",
                maxWidth: `${cardDimensions.width - field.x - 10}px`,
                wordBreak: "break-word"
              }}
            >
              {cleanedValue}
            </div>
          );
        })}
      </div>
      
      <p className="text-sm text-gray-500 italic text-center">
        Preview shows exactly how the PDF will appear
      </p>
    </div>
  );
};

export default CardPreview;
