
import { cn } from "@/lib/utils";
import { CardField } from "@/utils/pdfGenerator";
import { useState, useEffect } from "react";

interface CardPreviewProps {
  backgroundImage: string;
  fields: CardField[];
  data: Record<string, string>;
  orientation: "portrait" | "landscape";
  photoFolder?: string;
}

const CardPreview: React.FC<CardPreviewProps> = ({ 
  backgroundImage, 
  fields, 
  data, 
  orientation,
  photoFolder
}) => {
  // Scale factor to fit the preview within its container
  const scaleFactor = 0.8;
  
  // Card dimensions based on orientation
  const cardDimensions = orientation === "portrait" 
    ? { width: 300 * scaleFactor, height: 480 * scaleFactor } 
    : { width: 480 * scaleFactor, height: 300 * scaleFactor };
    
  // State to track loaded photos
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, string>>({});
  
  // Load photos when component mounts or when photoFolder/data changes
  useEffect(() => {
    // Find photo fields and try to load their images
    const photoFields = fields.filter(f => f.isPhoto);
    
    // If no photo fields, don't do anything
    if (photoFields.length === 0) return;
    
    // For each photo field, load the image if possible
    photoFields.forEach(field => {
      const photoFilename = data[field.field];
      if (!photoFilename) return;
      
      // Don't reload if already loaded with same path
      const photoPath = photoFolder ? `${photoFolder}/${photoFilename}` : photoFilename;
      const cacheKey = `${photoFolder || ""}:${photoFilename}`;
      
      // Only load if not already loaded or if folder changed
      if (loadedPhotos[cacheKey]) return;
      
      console.log("Attempting to load photo:", photoPath);
      
      // Load the image
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = photoPath;
      
      img.onload = () => {
        console.log("Photo loaded successfully:", photoPath);
        // Create a data URL from the loaded image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        setLoadedPhotos(prev => ({
          ...prev,
          [cacheKey]: dataUrl
        }));
      };
      
      img.onerror = (e) => {
        console.error(`Failed to load photo: ${photoPath}`, e);
      };
    });
  }, [data, photoFolder, fields]);

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
            const photoFilename = data[field.field];
            const cacheKey = `${photoFolder || ""}:${photoFilename}`;
            const photoSrc = loadedPhotos[cacheKey];
            
            // Skip if no photo data
            if (!photoSrc) return null;
            
            return (
              <div
                key={field.id}
                className={cn(
                  "absolute overflow-hidden",
                  field.photoShape === "circle" && "rounded-full"
                )}
                style={{
                  left: `${field.x * scaleFactor}px`,
                  top: `${field.y * scaleFactor}px`,
                  width: `${(field.photoWidth || 60) * scaleFactor}px`,
                  height: `${(field.photoHeight || 60) * scaleFactor}px`,
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
          
          // Handle regular text fields
          const fieldValue = data[field.field] || '';
          // Clean the text value - remove unwanted quotes
          const cleanedValue = fieldValue.replace(/^"|"$/g, '');
          
          return (
            <div
              key={field.id}
              className="absolute"
              style={{
                left: `${field.x * scaleFactor}px`,
                top: `${field.y * scaleFactor}px`,
                fontSize: `${field.fontSize * scaleFactor}px`,
                fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                color: field.color || "inherit",
                maxWidth: `${cardDimensions.width - (field.x * scaleFactor) - 10}px`,
                wordBreak: "break-word"
              }}
            >
              {cleanedValue}
            </div>
          );
        })}
      </div>
      
      <p className="text-sm text-gray-500 italic text-center">
        Preview shows how the record will appear on the ID card
      </p>
    </div>
  );
};

export default CardPreview;
