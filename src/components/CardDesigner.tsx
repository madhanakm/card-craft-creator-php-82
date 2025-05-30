import { useState } from "react";
import { Bold, Type, GripVertical, Circle, Square, Palette, FileText, Grid, AlignCenter, Move } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardField } from "@/utils/pdfGenerator";
import Ruler from "./Ruler";

interface CardDesignerProps {
  fields: CardField[];
  onFieldsUpdate: (fields: CardField[]) => void;
  backgroundImage: string;
  orientation: "portrait" | "landscape";
}

interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
}

const FONT_FAMILIES = [
  { value: "helvetica", label: "Helvetica" },
  { value: "times", label: "Times" },
  { value: "courier", label: "Courier" },
  { value: "arial", label: "Arial" },
  { value: "georgia", label: "Georgia" },
  { value: "verdana", label: "Verdana" }
];

const CardDesigner: React.FC<CardDesignerProps> = ({ 
  fields, 
  onFieldsUpdate, 
  backgroundImage,
  orientation 
}) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [isDraggingGuide, setIsDraggingGuide] = useState<string | null>(null);
  
  // Card dimensions - same as preview and PDF
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  const GRID_SIZE = 10; // Snap to 10px grid

  const snapToGridIfEnabled = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const addAlignmentGuide = (type: 'horizontal' | 'vertical') => {
    const newGuide: AlignmentGuide = {
      id: `guide-${Date.now()}`,
      type,
      position: type === 'horizontal' ? cardDimensions.height / 2 : cardDimensions.width / 2
    };
    setAlignmentGuides([...alignmentGuides, newGuide]);
  };

  const removeAlignmentGuide = (guideId: string) => {
    setAlignmentGuides(alignmentGuides.filter(g => g.id !== guideId));
  };

  const handleGuideMouseDown = (e: React.MouseEvent, guideId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGuide(guideId);
  };

  const handleGuideMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingGuide) return;
    
    const guide = alignmentGuides.find(g => g.id === isDraggingGuide);
    if (!guide) return;
    
    const containerRect = document.getElementById('card-designer-container')?.getBoundingClientRect();
    if (!containerRect) return;
    
    let newPosition: number;
    
    if (guide.type === 'horizontal') {
      newPosition = e.clientY - containerRect.top - 20; // Account for ruler
      newPosition = Math.max(0, Math.min(newPosition, cardDimensions.height));
    } else {
      newPosition = e.clientX - containerRect.left - 20; // Account for ruler
      newPosition = Math.max(0, Math.min(newPosition, cardDimensions.width));
    }
    
    setAlignmentGuides(alignmentGuides.map(g => 
      g.id === isDraggingGuide ? { ...g, position: newPosition } : g
    ));
  };

  const handleGuideMouseUp = () => {
    setIsDraggingGuide(null);
  };

  const snapToGuides = (x: number, y: number, threshold = 5) => {
    let snappedX = x;
    let snappedY = y;
    
    // Snap to vertical guides
    for (const guide of alignmentGuides) {
      if (guide.type === 'vertical' && Math.abs(x - guide.position) <= threshold) {
        snappedX = guide.position;
        break;
      }
    }
    
    // Snap to horizontal guides
    for (const guide of alignmentGuides) {
      if (guide.type === 'horizontal' && Math.abs(y - guide.position) <= threshold) {
        snappedY = guide.position;
        break;
      }
    }
    
    return { x: snappedX, y: snappedY };
  };

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
    let newX = e.clientX - containerRect.left - dragOffset.x - 20; // Account for ruler width
    let newY = e.clientY - containerRect.top - dragOffset.y - 20; // Account for ruler height
    
    // Snap to guides first
    const snapped = snapToGuides(newX, newY);
    newX = snapped.x;
    newY = snapped.y;
    
    // Then snap to grid if enabled
    newX = snapToGridIfEnabled(newX);
    newY = snapToGridIfEnabled(newY);
    
    // Reduced padding constraints - allow fields to be positioned closer to edges
    const boundedX = Math.max(0, Math.min(newX, cardDimensions.width - 20)); // Reduced from 100 to 20
    const boundedY = Math.max(0, Math.min(newY, cardDimensions.height - 20)); // Reduced from 30 to 20
    
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

  const handleFontFamilyChange = (fontFamily: string, fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, fontFamily };
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
          // Set default values if toggling to photo
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

  const alignFields = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!activeField) return;
    
    const activeFieldData = fields.find(f => f.id === activeField);
    if (!activeFieldData) return;
    
    const updatedFields = fields.map(field => {
      if (field.id === activeField) {
        let newX = field.x;
        let newY = field.y;
        
        switch (alignment) {
          case 'left':
            newX = 5; // Reduced from 10 to 5
            break;
          case 'center':
            newX = cardDimensions.width / 2 - 50; // Approximate center
            break;
          case 'right':
            newX = cardDimensions.width - 60; // Reduced from 100 to 60
            break;
          case 'top':
            newY = 5; // Reduced from 10 to 5
            break;
          case 'middle':
            newY = cardDimensions.height / 2;
            break;
          case 'bottom':
            newY = cardDimensions.height - 30; // Reduced from 50 to 30
            break;
        }
        
        return { ...field, x: snapToGridIfEnabled(newX), y: snapToGridIfEnabled(newY) };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  // Generate grid lines
  const generateGridLines = () => {
    if (!showGrid) return null;
    
    const lines = [];
    
    // Vertical lines
    for (let x = 0; x <= cardDimensions.width; x += GRID_SIZE) {
      lines.push(
        <div
          key={`v-${x}`}
          className="absolute border-l border-gray-200 opacity-30"
          style={{
            left: `${x}px`,
            top: 0,
            height: `${cardDimensions.height}px`
          }}
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= cardDimensions.height; y += GRID_SIZE) {
      lines.push(
        <div
          key={`h-${y}`}
          className="absolute border-t border-gray-200 opacity-30"
          style={{
            top: `${y}px`,
            left: 0,
            width: `${cardDimensions.width}px`
          }}
        />
      );
    }
    
    return lines;
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
        <Toggle pressed={showGrid} onPressedChange={setShowGrid} size="sm">
          <Grid className="h-4 w-4" />
        </Toggle>
        <Toggle pressed={snapToGrid} onPressedChange={setSnapToGrid} size="sm">
          Snap
        </Toggle>
        <Toggle pressed={showAlignmentGuides} onPressedChange={setShowAlignmentGuides} size="sm">
          Guides
        </Toggle>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => addAlignmentGuide('vertical')}
          title="Add vertical guide"
        >
          <Move className="h-4 w-4 rotate-90" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => addAlignmentGuide('horizontal')}
          title="Add horizontal guide"
        >
          <Move className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => alignFields('left')}
          disabled={!activeField}
          title="Align left"
        >
          <AlignCenter className="h-4 w-4 rotate-90" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => alignFields('center')}
          disabled={!activeField}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => alignFields('right')}
          disabled={!activeField}
          title="Align right"
        >
          <AlignCenter className="h-4 w-4 -rotate-90" />
        </Button>
      </div>

      <div className="flex">
        {/* Top ruler */}
        <div className="w-5 h-5"></div>
        <Ruler orientation="horizontal" length={cardDimensions.width} />
      </div>
      
      <div className="flex">
        {/* Left ruler */}
        <Ruler orientation="vertical" length={cardDimensions.height} />
        
        {/* Main design area */}
        <div
          id="card-designer-container"
          className="relative overflow-hidden border border-gray-200"
          style={{
            width: `${cardDimensions.width}px`,
            height: `${cardDimensions.height}px`,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onMouseMove={(e) => {
            handleDrag(e);
            handleGuideMouseMove(e);
          }}
          onMouseUp={() => {
            handleDragEnd();
            handleGuideMouseUp();
          }}
          onMouseLeave={() => {
            handleDragEnd();
            handleGuideMouseUp();
          }}
        >
          {/* Grid overlay */}
          {generateGridLines()}
          
          {/* Alignment guides */}
          {showAlignmentGuides && alignmentGuides.map((guide) => (
            <div
              key={guide.id}
              className={cn(
                "absolute cursor-move select-none",
                guide.type === 'horizontal' 
                  ? "border-t-2 border-cyan-500 w-full hover:border-cyan-600" 
                  : "border-l-2 border-cyan-500 h-full hover:border-cyan-600",
                isDraggingGuide === guide.id && "border-cyan-700"
              )}
              style={{
                [guide.type === 'horizontal' ? 'top' : 'left']: `${guide.position}px`,
                [guide.type === 'horizontal' ? 'left' : 'top']: 0,
                zIndex: 5
              }}
              onMouseDown={(e) => handleGuideMouseDown(e, guide.id)}
              onDoubleClick={() => removeAlignmentGuide(guide.id)}
              title={`${guide.type} guide - double-click to remove`}
            >
              <div 
                className={cn(
                  "absolute bg-cyan-500 text-white text-xs px-1 rounded",
                  guide.type === 'horizontal' ? "-top-5 left-2" : "-left-8 top-2"
                )}
              >
                {Math.round(guide.position)}
              </div>
            </div>
          ))}
          
          {/* Fields */}
          {fields.map((field) => (
            <div
              key={field.id}
              className={cn(
                "absolute flex items-center cursor-move px-2 py-1 rounded border border-transparent",
                activeField === field.id && "border-blue-500 shadow-lg",
                field.isPhoto ? "bg-blue-100/70" : "bg-white/50"
              )}
              style={{
                left: `${field.x}px`,
                top: `${field.y}px`,
                fontSize: `${field.fontSize}px`,
                fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                fontFamily: field.fontFamily || "helvetica",
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
          
          {/* Show coordinates for active field */}
          {activeField && (
            <div className="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
              x: {fields.find(f => f.id === activeField)?.x}, y: {fields.find(f => f.id === activeField)?.y}
            </div>
          )}
        </div>
      </div>

      {/* Field Properties */}
      <div className="bg-gray-50 p-4 rounded-lg mt-4">
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

                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <Select 
                      value={field.fontFamily || "helvetica"} 
                      onValueChange={(value) => handleFontFamilyChange(value, field.id)}
                    >
                      <SelectTrigger className="flex-1 h-8">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
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

                  <div className="flex items-center gap-3">
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
