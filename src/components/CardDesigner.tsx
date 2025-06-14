
import React, { useState, useCallback } from "react";
import Draggable from "react-draggable";
import { cn } from "@/lib/utils";
import { CardField } from "@/utils/pdfGenerator";
import Ruler from "./Ruler";
import { AlignLeft, AlignCenter, AlignRight, Move, Grid, Eye, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardDesignerProps {
  fields: CardField[];
  onFieldsUpdate: (fields: CardField[]) => void;
  backgroundImage: string;
  orientation: "portrait" | "landscape";
  customFonts?: Array<{
    id: string;
    name: string;
    family: string;
    weight: string;
    style: string;
    url: string;
  }>;
}

const CardDesigner: React.FC<CardDesignerProps> = ({ 
  fields, 
  onFieldsUpdate, 
  backgroundImage, 
  orientation,
  customFonts = []
}) => {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldsState, setFields] = useState<CardField[]>(fields);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showAxisLines, setShowAxisLines] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Extended font families including custom fonts
  const fontFamilies = [
    "helvetica", "times", "courier", "arial", "georgia", "verdana",
    ...customFonts.map(font => font.family)
  ];

  const updateField = (fieldId: string, updates: Partial<CardField>) => {
    const newFields = fieldsState.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setFields(newFields);
    onFieldsUpdate(newFields);
  };

  const handleFieldsChange = useCallback(
    (newFields: CardField[]) => {
      setFields(newFields);
      onFieldsUpdate(newFields);
    },
    [onFieldsUpdate]
  );

  React.useEffect(() => {
    setFields(fields);
  }, [fields]);

  const snapToGridPosition = (value: number, gridSize: number = 10) => {
    return snapToGrid ? Math.round(value / gridSize) * gridSize : value;
  };

  const alignField = (alignment: "left" | "center" | "right") => {
    if (!selectedField) return;
    
    const field = fieldsState.find(f => f.id === selectedField);
    if (!field) return;

    let newX = field.x;
    const textAreaWidth = field.textAreaWidth || 200;

    switch (alignment) {
      case "left":
        newX = 20;
        break;
      case "center":
        newX = (cardDimensions.width - textAreaWidth) / 2;
        break;
      case "right":
        newX = cardDimensions.width - textAreaWidth - 20;
        break;
    }

    updateField(selectedField, { x: snapToGridPosition(newX) });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Custom Fonts Display */}
      {customFonts.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-700 mb-2">
            Custom Fonts Available ({customFonts.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {customFonts.map((font) => (
              <span 
                key={font.id} 
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                style={{ fontFamily: font.family }}
              >
                {font.family}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Control Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Card Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Card Settings</h3>
            <p className="text-sm text-blue-600">
              <strong>{orientation}</strong><br/>
              <strong>{cardDimensions.width}×{cardDimensions.height}px</strong><br/>
              <strong>CMYK Professional</strong>
            </p>
          </div>

          {/* Design Tools */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Design Tools</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={snapToGrid ? "default" : "outline"}
                size="sm"
                onClick={() => setSnapToGrid(!snapToGrid)}
              >
                <Move className="h-4 w-4 mr-1" />
                Snap
              </Button>
              <Button
                variant={showAxisLines ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAxisLines(!showAxisLines)}
              >
                <Crosshair className="h-4 w-4 mr-1" />
                Axis
              </Button>
            </div>
          </div>

          {/* Mouse Position */}
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-700 mb-2">Cursor Position</h3>
            <p className="text-sm text-purple-600 font-mono">
              X: {Math.round(mousePosition.x)}px<br/>
              Y: {Math.round(mousePosition.y)}px
            </p>
          </div>

          {/* Quick Alignment */}
          {selectedField && (
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h3 className="text-sm font-medium text-orange-700 mb-2">Quick Align</h3>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alignField("left")}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alignField("center")}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alignField("right")}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Design Area - Improved Layout */}
      <div className="flex gap-6">
        {/* Canvas Section - Better Centered */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-center">
            <div className="relative">
              {/* Enhanced Rulers */}
              <Ruler 
                orientation="horizontal" 
                length={cardDimensions.width} 
                className="absolute -top-6 left-0 z-20 bg-white border border-gray-300 shadow-sm"
              />
              <Ruler 
                orientation="vertical" 
                length={cardDimensions.height} 
                className="absolute -left-6 top-0 z-20 bg-white border border-gray-300 shadow-sm"
              />
              
              {/* Canvas with improved styling and axis lines */}
              <div
                className="relative border-2 border-gray-400 overflow-visible shadow-lg"
                style={{
                  width: `${cardDimensions.width}px`,
                  height: `${cardDimensions.height}px`,
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: `${cardDimensions.width}px ${cardDimensions.height}px`,
                  backgroundPosition: '0px 0px',
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated'
                }}
                onMouseMove={handleMouseMove}
              >
                {/* Enhanced Grid overlay */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #3b82f6 1px, transparent 1px),
                        linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
                      `,
                      backgroundSize: '10px 10px'
                    }}
                  />
                )}

                {/* X and Y Axis Lines */}
                {showAxisLines && selectedField && (
                  <>
                    {(() => {
                      const field = fieldsState.find(f => f.id === selectedField);
                      if (!field) return null;
                      
                      return (
                        <>
                          {/* Vertical line at field X position */}
                          <div
                            className="absolute top-0 w-px bg-red-500 opacity-70 pointer-events-none z-10"
                            style={{
                              left: `${field.x}px`,
                              height: `${cardDimensions.height}px`
                            }}
                          />
                          {/* Horizontal line at field Y position */}
                          <div
                            className="absolute left-0 h-px bg-red-500 opacity-70 pointer-events-none z-10"
                            style={{
                              top: `${field.y}px`,
                              width: `${cardDimensions.width}px`
                            }}
                          />
                          {/* Center alignment guides */}
                          <div
                            className="absolute top-0 w-px bg-green-500 opacity-50 pointer-events-none z-10"
                            style={{
                              left: `${cardDimensions.width / 2}px`,
                              height: `${cardDimensions.height}px`
                            }}
                          />
                          <div
                            className="absolute left-0 h-px bg-green-500 opacity-50 pointer-events-none z-10"
                            style={{
                              top: `${cardDimensions.height / 2}px`,
                              width: `${cardDimensions.width}px`
                            }}
                          />
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Render draggable fields with improved styling */}
                {fieldsState.map((field) => (
                  <Draggable
                    key={field.id}
                    position={{ x: field.x, y: field.y }}
                    onDrag={(_, data) => {
                      const newX = snapToGridPosition(data.x);
                      const newY = snapToGridPosition(data.y);
                      updateField(field.id, { x: newX, y: newY });
                    }}
                    bounds="parent"
                  >
                    <div
                      className={cn(
                        "absolute cursor-move border-2 transition-all duration-200 rounded",
                        selectedField === field.id 
                          ? "border-red-500 bg-red-100 bg-opacity-80 shadow-lg ring-2 ring-red-300" 
                          : "border-blue-500 bg-blue-100 bg-opacity-60 hover:bg-opacity-80"
                      )}
                      style={{
                        width: `${field.isPhoto ? (field.photoWidth || 60) : (field.textAreaWidth || 200)}px`,
                        height: `${field.isPhoto ? (field.photoHeight || 60) : (field.textAreaHeight || 40)}px`,
                        fontSize: `${field.fontSize}px`,
                        fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                        fontFamily: field.fontFamily || "helvetica",
                        color: field.color || "inherit",
                        textAlign: field.textAlign || "left",
                        lineHeight: field.lineHeight || 1.2,
                      }}
                      onClick={() => setSelectedField(field.id)}
                    >
                      <div className="p-2 truncate text-xs font-medium">
                        <div className="flex items-center gap-1">
                          {field.field} {field.isPhoto && "📷"}
                        </div>
                        <div className="text-xs text-gray-600 font-mono">
                          ({field.x}, {field.y})
                        </div>
                      </div>
                    </div>
                  </Draggable>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Field controls panel */}
        <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Field Properties
            </h3>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            {selectedField && (
              <div className="space-y-4">
                {(() => {
                  const field = fieldsState.find(f => f.id === selectedField);
                  if (!field) return null;
                  
                  return (
                    <>
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <label className="block text-sm font-medium mb-1">
                          Selected Field: <span className="text-blue-600">{field.field}</span>
                        </label>
                        <p className="text-xs text-gray-500">
                          Type: {field.isPhoto ? "Photo Field" : "Text Field"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">X Position</label>
                          <input
                            type="number"
                            value={field.x}
                            onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            step={snapToGrid ? 10 : 1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Y Position</label>
                          <input
                            type="number"
                            value={field.y}
                            onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            step={snapToGrid ? 10 : 1}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Font Size</label>
                        <input
                          type="number"
                          value={field.fontSize}
                          onChange={(e) => updateField(field.id, { fontSize: parseInt(e.target.value) || 12 })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          min="8"
                          max="72"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Font Family</label>
                        <select
                          value={field.fontFamily}
                          onChange={(e) => updateField(field.id, { fontFamily: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          {fontFamilies.map(font => (
                            <option key={font} value={font} style={{ fontFamily: font }}>
                              {font}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Font Weight</label>
                        <select
                          value={field.fontWeight}
                          onChange={(e) => updateField(field.id, { fontWeight: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Text Color (CMYK Optimized)</label>
                        <input
                          type="color"
                          value={field.color}
                          onChange={(e) => updateField(field.id, { color: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          Colors are automatically converted to CMYK color space for professional printing
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Text Alignment</label>
                        <div className="flex gap-1">
                          {[
                            { value: "left", icon: AlignLeft },
                            { value: "center", icon: AlignCenter },
                            { value: "right", icon: AlignRight }
                          ].map(({ value, icon: Icon }) => (
                            <Button
                              key={value}
                              variant={field.textAlign === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateField(field.id, { textAlign: value as "left" | "center" | "right" })}
                              className="flex-1"
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium mb-1">Area Width</label>
                          <input
                            type="number"
                            value={field.textAreaWidth || 200}
                            onChange={(e) => updateField(field.id, { textAreaWidth: parseInt(e.target.value) || 200 })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            min="50"
                            max="400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Line Height</label>
                          <input
                            type="number"
                            step="0.1"
                            value={field.lineHeight || 1.2}
                            onChange={(e) => updateField(field.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            min="0.8"
                            max="3.0"
                          />
                        </div>
                      </div>

                      {/* Photo field controls */}
                      <div className="border-t pt-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.isPhoto || false}
                            onChange={(e) => updateField(field.id, { isPhoto: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">Photo Field</span>
                        </label>
                      </div>

                      {field.isPhoto && (
                        <div className="space-y-3 bg-gray-50 p-3 rounded">
                          <div>
                            <label className="block text-sm font-medium mb-1">Photo Shape</label>
                            <select
                              value={field.photoShape || "square"}
                              onChange={(e) => updateField(field.id, { photoShape: e.target.value as "square" | "circle" })}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            >
                              <option value="square">Square</option>
                              <option value="circle">Circle</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium mb-1">Photo Width</label>
                              <input
                                type="number"
                                value={field.photoWidth || 60}
                                onChange={(e) => updateField(field.id, { photoWidth: parseInt(e.target.value) || 60 })}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                min="20"
                                max="200"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Photo Height</label>
                              <input
                                type="number"
                                value={field.photoHeight || 60}
                                onChange={(e) => updateField(field.id, { photoHeight: parseInt(e.target.value) || 60 })}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                min="20"
                                max="200"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            {!selectedField && (
              <div className="text-center py-8">
                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Click on a field to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDesigner;
