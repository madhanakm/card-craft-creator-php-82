import React, { useState, useCallback } from "react";
import Draggable from "react-draggable";
import { cn } from "@/lib/utils";
import { CardField } from "@/utils/pdfGenerator";
import Ruler from "./Ruler";

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

  const cardDimensions = orientation === "portrait" 
    ? { width: 300, height: 480 } 
    : { width: 480, height: 300 };

  // Extended font families including custom fonts
  const fontFamilies = [
    "helvetica", "times", "courier", "arial", "georgia", "verdana",
    ...customFonts.map(font => font.family)
  ];

  const updateField = (fieldId: string, updates: Partial<CardField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const handleFieldsChange = useCallback(
    (newFields: CardField[]) => {
      setFields(newFields);
      onFieldsUpdate(newFields);
    },
    [onFieldsUpdate]
  );

  React.useEffect(() => {
    handleFieldsChange(fieldsState);
  }, [fieldsState, handleFieldsChange]);

  return (
    <div className="flex flex-col gap-6">
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

      {/* Orientation and dimensions display */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-700 mb-2">Card Settings</h3>
        <p className="text-sm text-blue-600">
          Orientation: <strong>{orientation}</strong> | 
          Dimensions: <strong>{cardDimensions.width}px × {cardDimensions.height}px</strong> |
          Color Space: <strong>CMYK Professional</strong>
        </p>
      </div>

      {/* Canvas and field controls */}
      <div className="flex gap-6">
        {/* Canvas section */}
        <div className="flex-1">
          <div className="relative">
            {/* Ruler components */}
            <Ruler 
              orientation="horizontal" 
              length={cardDimensions.width} 
              className="absolute -top-6 left-12 z-10"
            />
            <Ruler 
              orientation="vertical" 
              length={cardDimensions.height} 
              className="absolute -left-6 top-12 z-10"
            />
            
            {/* Canvas */}
            <div
              className="relative border-2 border-gray-300 overflow-hidden"
              style={{
                width: `${cardDimensions.width}px`,
                height: `${cardDimensions.height}px`,
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: `${cardDimensions.width}px ${cardDimensions.height}px`,
                backgroundPosition: '0px 0px',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated'
              }}
            >
              {/* Grid overlay */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #000 1px, transparent 1px),
                    linear-gradient(to bottom, #000 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Render draggable fields */}
              {fields.map((field) => (
                <Draggable
                  key={field.id}
                  position={{ x: field.x, y: field.y }}
                  onDrag={(_, data) => {
                    updateField(field.id, { x: data.x, y: data.y });
                  }}
                  bounds="parent"
                >
                  <div
                    className={cn(
                      "absolute cursor-move border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-50",
                      selectedField === field.id && "border-red-500 bg-red-100"
                    )}
                    style={{
                      width: `${field.textAreaWidth || 200}px`,
                      height: `${field.textAreaHeight || 40}px`,
                      fontSize: `${field.fontSize}px`,
                      fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                      fontFamily: field.fontFamily || "helvetica",
                      color: field.color || "inherit",
                      textAlign: field.textAlign || "left",
                      lineHeight: field.lineHeight || 1.2,
                    }}
                    onClick={() => setSelectedField(field.id)}
                  >
                    <div className="p-1 truncate text-xs">
                      {field.field} ({field.x}, {field.y})
                    </div>
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
        </div>

        {/* Field controls panel */}
        <div className="w-80 bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Field Properties</h3>
          
          {selectedField && (
            <div className="space-y-4">
              {(() => {
                const field = fields.find(f => f.id === selectedField);
                if (!field) return null;
                
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Field: {field.field}</label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">X Position</label>
                        <input
                          type="number"
                          value={field.x}
                          onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Y Position</label>
                        <input
                          type="number"
                          value={field.y}
                          onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
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
                      <select
                        value={field.textAlign || "left"}
                        onChange={(e) => updateField(field.id, { textAlign: e.target.value as "left" | "center" | "right" })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
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
            <p className="text-gray-500 text-sm">Click on a field to edit its properties</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardDesigner;
