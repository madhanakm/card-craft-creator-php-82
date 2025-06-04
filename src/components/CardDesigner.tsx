import { useState } from "react";
import { Bold, Type, GripVertical, Circle, Square, Palette, FileText, Grid, AlignCenter, Move, AlignLeft, AlignRight, Maximize2 } from "lucide-react";
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
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [isDraggingGuide, setIsDraggingGuide] = useState<string | null>(null);
  const [isResizingTextArea, setIsResizingTextArea] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'width' | 'height' | 'both' | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  
  // Card dimensions - exact print size: 88mm × 58mm
  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 192 } // Scaled for display (88mm × 58mm ratio)
    : { width: 192, height: 300 };

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
      newPosition = e.clientY - containerRect.top - 20;
      newPosition = Math.max(0, Math.min(newPosition, cardDimensions.height));
    } else {
      newPosition = e.clientX - containerRect.left - 20;
      newPosition = Math.max(0, Math.min(newPosition, cardDimensions.width));
    }
    
    setAlignmentGuides(alignmentGuides.map(g => 
      g.id === isDraggingGuide ? { ...g, position: newPosition } : g
    ));
  };

  const handleGuideMouseUp = () => {
    setIsDraggingGuide(null);
  };

  const handleTextAreaResizeStart = (e: React.MouseEvent, fieldId: string, handle: 'width' | 'height' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setIsResizingTextArea(fieldId);
    setResizeHandle(handle);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ 
      width: field.textAreaWidth || 200, 
      height: field.textAreaHeight || 40 
    });
  };

  const handleTextAreaResize = (e: React.MouseEvent) => {
    if (!isResizingTextArea || !resizeHandle) return;
    
    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;
    
    let newWidth = resizeStartSize.width;
    let newHeight = resizeStartSize.height;
    
    if (resizeHandle === 'width' || resizeHandle === 'both') {
      newWidth = Math.max(50, Math.min(resizeStartSize.width + deltaX, cardDimensions.width - 20));
    }
    
    if (resizeHandle === 'height' || resizeHandle === 'both') {
      newHeight = Math.max(20, Math.min(resizeStartSize.height + deltaY, 200));
    }
    
    const updatedFields = fields.map(field => {
      if (field.id === isResizingTextArea) {
        return { 
          ...field, 
          textAreaWidth: newWidth,
          textAreaHeight: newHeight
        };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const handleTextAreaResizeEnd = () => {
    setIsResizingTextArea(null);
    setResizeHandle(null);
  };

  const handleDragStart = (e: React.MouseEvent, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setActiveField(fieldId);
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (isDragging && activeField) {
      const containerRect = document.getElementById('card-designer-container')?.getBoundingClientRect();
      if (!containerRect) return;
      
      let newX = e.clientX - containerRect.left - dragOffset.x - 20;
      let newY = e.clientY - containerRect.top - dragOffset.y - 20;
      
      const boundedX = Math.max(0, Math.min(newX, cardDimensions.width - 20));
      const boundedY = Math.max(0, Math.min(newY, cardDimensions.height - 20));
      
      const updatedFields = fields.map(field => {
        if (field.id === activeField) {
          return { ...field, x: boundedX, y: boundedY };
        }
        return field;
      });
      
      onFieldsUpdate(updatedFields);
    }
    
    if (isResizingTextArea) {
      handleTextAreaResize(e);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setActiveField(null);
    handleTextAreaResizeEnd();
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

  const handleTextAlignChange = (textAlign: "left" | "center" | "right", fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, textAlign };
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

  const setTextAreaSize = (dimension: "width" | "height", value: number, fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { 
          ...field, 
          [dimension === "width" ? "textAreaWidth" : "textAreaHeight"]: value 
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
            newX = 5;
            break;
          case 'center':
            newX = cardDimensions.width / 2 - 50;
            break;
          case 'right':
            newX = cardDimensions.width - 60;
            break;
          case 'top':
            newY = 5;
            break;
          case 'middle':
            newY = cardDimensions.height / 2;
            break;
          case 'bottom':
            newY = cardDimensions.height - 30;
            break;
        }
        
        return { ...field, x: newX, y: newY };
      }
      return field;
    });
    
    onFieldsUpdate(updatedFields);
  };

  const generateGridLines = () => {
    if (!showGrid) return null;
    
    const lines = [];
    const GRID_SIZE = 10;
    
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
      {/* Print dimensions info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Print Specifications</h3>
        <p className="text-xs text-blue-600">
          Card Size: {orientation === "portrait" ? "88mm × 58mm" : "58mm × 88mm"} • 
          300 DPI • CMYK Color Space • Professional Print Ready
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
        <Toggle pressed={showGrid} onPressedChange={setShowGrid} size="sm">
          <Grid className="h-4 w-4" />
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
        <div className="w-5 h-5"></div>
        <Ruler orientation="horizontal" length={cardDimensions.width} />
      </div>
      
      <div className="flex">
        <Ruler orientation="vertical" length={cardDimensions.height} />
        
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
          {generateGridLines()}
          
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
          
          {fields.map((field) => (
            <div key={field.id}>
              {/* Enhanced text area visualization with resize handles for non-photo fields */}
              {!field.isPhoto && (
                <div
                  className={cn(
                    "absolute border-2 bg-blue-50/30",
                    activeField === field.id 
                      ? "border-blue-500 border-solid shadow-lg" 
                      : "border-blue-300 border-dashed"
                  )}
                  style={{
                    left: `${field.x}px`,
                    top: `${field.y}px`,
                    width: `${field.textAreaWidth || 200}px`,
                    height: `${field.textAreaHeight || 40}px`,
                    zIndex: activeField === field.id ? 5 : 1,
                  }}
                  onClick={() => setActiveField(field.id)}
                >
                  {/* Text area label */}
                  <div className="absolute -top-5 left-0 text-xs text-blue-600 bg-white px-1 rounded">
                    Text Area: {field.textAreaWidth || 200}×{field.textAreaHeight || 40}
                  </div>
                  
                  {/* Resize handles - only show when field is active */}
                  {activeField === field.id && (
                    <>
                      {/* Right edge resize handle (width) */}
                      <div
                        className="absolute top-0 -right-1 w-2 h-full cursor-ew-resize bg-blue-500 opacity-50 hover:opacity-100"
                        onMouseDown={(e) => handleTextAreaResizeStart(e, field.id, 'width')}
                        title="Resize width"
                      />
                      
                      {/* Bottom edge resize handle (height) */}
                      <div
                        className="absolute -bottom-1 left-0 w-full h-2 cursor-ns-resize bg-blue-500 opacity-50 hover:opacity-100"
                        onMouseDown={(e) => handleTextAreaResizeStart(e, field.id, 'height')}
                        title="Resize height"
                      />
                      
                      {/* Bottom-right corner resize handle (both) */}
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize bg-blue-600 hover:bg-blue-700"
                        onMouseDown={(e) => handleTextAreaResizeStart(e, field.id, 'both')}
                        title="Resize both"
                      />
                    </>
                  )}
                </div>
              )}
              
              {/* Field element */}
              <div
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
            </div>
          ))}
          
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
                  <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                    Photo dimensions in millimeters (mm) for professional printing
                  </p>
                  
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
                      <label className="text-xs text-gray-500 block mb-1">Width (mm)</label>
                      <Slider
                        value={[field.photoWidth || 15]}
                        min={5}
                        max={40}
                        step={1}
                        onValueChange={(value) => setPhotoSize("width", value[0], field.id)}
                        className="flex-1"
                      />
                      <span className="text-xs block text-right mt-1">{field.photoWidth || 15}mm</span>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Height (mm)</label>
                      <Slider
                        value={[field.photoHeight || 15]}
                        min={5}
                        max={40}
                        step={1}
                        onValueChange={(value) => setPhotoSize("height", value[0], field.id)}
                        className="flex-1"
                      />
                      <span className="text-xs block text-right mt-1">{field.photoHeight || 15}mm</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Text Area Size Controls */}
                  <div className="space-y-3 mb-4 p-2 bg-blue-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Maximize2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Text Area</span>
                      <span className="text-xs text-blue-600">
                        (Click field to see resize handles)
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Width</label>
                        <Slider
                          value={[field.textAreaWidth || 200]}
                          min={50}
                          max={cardDimensions.width - 20}
                          step={5}
                          onValueChange={(value) => setTextAreaSize("width", value[0], field.id)}
                          className="flex-1"
                        />
                        <span className="text-xs block text-right mt-1">{field.textAreaWidth || 200}px</span>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Height</label>
                        <Slider
                          value={[field.textAreaHeight || 40]}
                          min={20}
                          max={200}
                          step={5}
                          onValueChange={(value) => setTextAreaSize("height", value[0], field.id)}
                          className="flex-1"
                        />
                        <span className="text-xs block text-right mt-1">{field.textAreaHeight || 40}px</span>
                      </div>
                    </div>
                  </div>

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

                  {/* Text Alignment Controls */}
                  <div className="flex items-center gap-3 mb-3">
                    <AlignCenter className="h-4 w-4 text-gray-500" />
                    <div className="flex space-x-1">
                      <Button
                        variant={field.textAlign === "left" || !field.textAlign ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTextAlignChange("left", field.id)}
                        className="h-8 w-8 p-0"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={field.textAlign === "center" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTextAlignChange("center", field.id)}
                        className="h-8 w-8 p-0"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={field.textAlign === "right" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTextAlignChange("right", field.id)}
                        className="h-8 w-8 p-0"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {field.textAlign || "left"}
                    </span>
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
