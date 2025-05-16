
import { cn } from "@/lib/utils";

interface CardPreviewProps {
  backgroundImage: string;
  fields: Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>;
  data: Record<string, string>;
  orientation: "portrait" | "landscape";
}

const CardPreview: React.FC<CardPreviewProps> = ({ backgroundImage, fields, data, orientation }) => {
  // Scale factor to fit the preview within its container
  const scaleFactor = 0.8;
  
  // Card dimensions based on orientation
  const cardDimensions = orientation === "portrait" 
    ? { width: 300 * scaleFactor, height: 480 * scaleFactor } 
    : { width: 480 * scaleFactor, height: 300 * scaleFactor };

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
          // Get the actual data for this field
          const fieldValue = data[field.field] || '';
          
          return (
            <div
              key={field.id}
              className="absolute"
              style={{
                left: `${field.x * scaleFactor}px`,
                top: `${field.y * scaleFactor}px`,
                fontSize: `${field.fontSize * scaleFactor}px`,
                fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
              }}
            >
              {fieldValue}
            </div>
          );
        })}
      </div>
      
      <p className="text-sm text-gray-500 italic text-center">
        Preview shows how the first record will appear on the ID card
      </p>
    </div>
  );
};

export default CardPreview;
