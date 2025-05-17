
import { useState } from "react";
import { Bold, Type, GripVertical, Circle, Square, Palette } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { CardField } from "@/utils/pdfGenerator";

interface CardDesignerProps {
  fields: CardField[];
  onFieldsUpdate: (fields: CardField[]) => void;
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

  const handleColorChange = (color: string, fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, color };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const togglePhotoField = (fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { 
          ...field, 
          isPhoto: !field.isPhoto,
          // Set default values if toggling to photo - explicitly set as the required type
          photoShape: field.isPhoto ? undefined : "square" as "square" | "circle",
          photoWidth: field.isPhoto ? undefined : 60,
          photoHeight: field.isPhoto ? undefined : 60
        };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const setPhotoShape = (shape: "square" | "circle", fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, photoShape: shape };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const setPhotoSize = (dimension: "width" | "height", value: number, fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { 
          ...field, 
          [dimension === "width" ? "photoWidth" : "photoHeight"]: value 
        };
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
              "absolute flex items-center cursor-move px-2 py-1 rounded border border-transparent",
              activeField === field.id && "border-blue-500",
              field.isPhoto ? "bg-blue-100/70" : "bg-white/50"
            )}
            style={{
              left: `${field.x}px`,
              top: `${field.y}px`,
              fontSize: `${field.fontSize}px`,
              fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
              color: field.color || "inherit",
              zIndex: activeField === field.id ? 10 : 1,
            }}
            onMouseDown={(e) => handleDragStart(e, field.id)}
          >
            <GripVertical className="h-3 w-3 mr-1 text-gray-400" />
            <span>
              {field.isPhoto ? `[Photo: ${field.field}]` : `{${field.field}}`}
            </span>
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
                <div className="flex space-x-1">
                  <Toggle 
                    pressed={field.isPhoto || false} 
                    onPressedChange={() => togglePhotoField(field.id)}
                    size="sm"
                    aria-label="Toggle photo field"
                  >
                    <Square className={cn("h-4 w-4", field.isPhoto ? "text-blue-500" : "text-gray-500")} />
                  </Toggle>
                </div>
              </div>
              
              {field.isPhoto ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 mb-2">Photo Field Settings</p>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant={field.photoShape === "square" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPhotoShape("square", field.id)}
                      className="flex-1"
                    >
                      <Square className="h-4 w-4 mr-2" /> Square
                    </Button>
                    <Button
                      variant={field.photoShape === "circle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPhotoShape("circle", field.id)}
                      className="flex-1"
                    >
                      <Circle className="h-4 w-4 mr-2" /> Circle
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Width</label>
                      <Slider
                        value={[field.photoWidth || 60]}
                        min={30}
                        max={150}
                        step={5}
                        onValueChange={(value) => setPhotoSize("width", value[0], field.id)}
                        className="flex-1"
                      />
                      <span className="text-xs block text-right mt-1">{field.photoWidth || 60}px</span>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Height</label>
                      <Slider
                        value={[field.photoHeight || 60]}
                        min={30}
                        max={150}
                        step={5}
                        onValueChange={(value) => setPhotoSize("height", value[0], field.id)}
                        className="flex-1"
                      />
                      <span className="text-xs block text-right mt-1">{field.photoHeight || 60}px</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Type className="h-4 w-4 text-gray-500" />
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
                  
                  <div className="flex items-center gap-3">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <Input
                      type="color"
                      value={field.color || "#000000"}
                      onChange={(e) => handleColorChange(e.target.value, field.id)}
                      className="w-10 h-8 p-0 border-0"
                    />
                    <Input
                      type="text"
                      value={field.color || "#000000"}
                      onChange={(e) => handleColorChange(e.target.value, field.id)}
                      className="flex-1 h-8"
                      maxLength={7}
                      placeholder="#000000"
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleFontWeight(field.id)}
                      className={cn(
                        "h-8 w-8 p-0",
                        field.fontWeight === "bold" && "bg-gray-100"
                      )}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <span className="text-xs">
                      {field.fontWeight === "bold" ? "Bold text" : "Regular text"}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardDesigner;
