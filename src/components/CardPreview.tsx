
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
  
  // Debug the incoming data
  useEffect(() => {
    console.log("CardPreview props:", { photoFolder, data });
    const photoFields = fields.filter(f => f.isPhoto);
    if (photoFields.length > 0) {
      console.log("Photo fields:", photoFields);
      photoFields.forEach(field => {
        console.log(`Field ${field.field} has value:`, data[field.field]);
      });
    }
  }, [fields, data, photoFolder]);
  
  // Load photos when component mounts or when photoFolder/data changes
  useEffect(() => {
    // Find photo fields and try to load their images
    const photoFields = fields.filter(f => f.isPhoto);
    
    // If no photo fields, don't do anything
    if (photoFields.length === 0) return;
    
    // Clear loaded photos when folder changes
    if (photoFolder) {
      console.log("Photo folder changed, clearing loaded photos");
      setLoadedPhotos({});
    }
    
    // For each photo field, load the image if possible
    photoFields.forEach(field => {
      const photoFilename = data[field.field];
      if (!photoFilename) {
        console.log(`No filename for field ${field.field}`);
        return;
      }
      
      // Create the photo path based on folder - remove any leading/trailing whitespace
      const cleanFilename = photoFilename.trim();
      const photoPath = photoFolder 
        ? `${photoFolder}/${cleanFilename}`
        : cleanFilename;
        
      const cacheKey = `${photoFolder || ""}:${cleanFilename}`;
      
      // Only load if not already loaded
      if (loadedPhotos[cacheKey]) {
        console.log(`Using cached photo for ${photoPath}`);
        return;
      }
      
      console.log("Attempting to load photo:", photoPath);
      
      // Try loading the image directly from file path
      try {
        fetch(photoPath)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            const objectURL = URL.createObjectURL(blob);
            console.log("Photo loaded successfully:", photoPath);
            setLoadedPhotos(prev => ({
              ...prev,
              [cacheKey]: objectURL
            }));
          })
          .catch(error => {
            console.error(`Fetch error for ${photoPath}:`, error);
            
            // Fallback to direct image loading
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = photoPath;
            
            img.onload = () => {
              console.log("Fallback photo loaded successfully:", photoPath);
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
              console.error(`Both methods failed to load photo: ${photoPath}`, e);
            };
          });
      } catch (error) {
        console.error("Error during photo loading:", error);
      }
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
            const cleanFilename = photoFilename?.trim() || "";
            const cacheKey = `${photoFolder || ""}:${cleanFilename}`;
            const photoSrc = loadedPhotos[cacheKey];
            
            // Show a placeholder if photo not loaded yet
            if (!photoSrc) {
              return (
                <div
                  key={field.id}
                  className={cn(
                    "absolute overflow-hidden bg-gray-200 flex items-center justify-center",
                    field.photoShape === "circle" && "rounded-full"
                  )}
                  style={{
                    left: `${field.x * scaleFactor}px`,
                    top: `${field.y * scaleFactor}px`,
                    width: `${(field.photoWidth || 60) * scaleFactor}px`,
                    height: `${(field.photoHeight || 60) * scaleFactor}px`,
                  }}
                >
                  <span className="text-xs text-gray-500">Loading...</span>
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
