
import { useState } from "react";
import { FontBold, FontSize, GripVertical } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CardDesignerProps {
  fields: Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>;
  onFieldsUpdate: (fields: Array<{ id: string; field: string; x: number; y: number; fontSize: number; fontWeight: string }>) => void;
  backgroundImage: string;
  orientation: "portrait" | "landscape";
}

const CardDesigner: React.FC<CardDesignerProps> = ({ 
  fields, 
  onFieldsUpdate, 
  backgroundImage,
  orientation 
}) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Card dimensions based on orientation
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  const handleDragStart = (e: React.MouseEvent, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setActiveField(fieldId);
    setIsDragging(true);
    
    // Calculate the offset between mouse position and field position
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || !activeField) return;
    
    // Get the container's position and dimensions
    const containerRect = document.getElementById('card-designer-container')?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Calculate new position accounting for the offset
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Ensure field stays within container boundaries
    const boundedX = Math.max(0, Math.min(newX, cardDimensions.width - 100));
    const boundedY = Math.max(0, Math.min(newY, cardDimensions.height - 30));
    
    // Update the field position
    const updatedFields = fields.map(field => {
      if (field.id === activeField) {
        return { ...field, x: boundedX, y: boundedY };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setActiveField(null);
  };

  const handleFontSizeChange = (size: number, fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, fontSize: size };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const toggleFontWeight = (fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        const newWeight = field.fontWeight === "normal" ? "bold" : "normal";
        return { ...field, fontWeight: newWeight };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  return (
    <div className="flex flex-col">
      <div
        id="card-designer-container"
        className="relative overflow-hidden border border-gray-200 rounded-lg mb-6"
        style={{
          width: `${cardDimensions.width}px`,
          height: `${cardDimensions.height}px`,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(
              "absolute flex items-center cursor-move bg-white/50 px-2 py-1 rounded border border-transparent",
              activeField === field.id && "border-blue-500"
            )}
            style={{
              left: `${field.x}px`,
              top: `${field.y}px`,
              fontSize: `${field.fontSize}px`,
              fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
              zIndex: activeField === field.id ? 10 : 1,
            }}
            onMouseDown={(e) => handleDragStart(e, field.id)}
          >
            <GripVertical className="h-3 w-3 mr-1 text-gray-400" />
            <span>{`{${field.field}}`}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Field Properties</h3>
        
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="p-3 bg-white rounded-md shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{field.field}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleFontWeight(field.id)}
                  className={cn(
                    "h-8 w-8 p-0",
                    field.fontWeight === "bold" && "bg-gray-100"
                  )}
                >
                  <FontBold className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <FontSize className="h-4 w-4 text-gray-500" />
                <Slider
                  value={[field.fontSize]}
                  min={8}
                  max={36}
                  step={1}
                  onValueChange={(value) => handleFontSizeChange(value[0], field.id)}
                  className="flex-1"
                />
                <span className="text-xs w-8 text-right">{field.fontSize}px</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardDesigner;
