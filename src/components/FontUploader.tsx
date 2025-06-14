
import { useState, useRef } from "react";
import { Upload, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface FontUploaderProps {
  onFontsUpdate: (fonts: string[]) => void;
}

interface LoadedFont {
  name: string;
  family: string;
  url: string;
}

const FontUploader: React.FC<FontUploaderProps> = ({ onFontsUpdate }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<LoadedFont[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      processFontFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFontFiles(files);
    }
  };

  const processFontFiles = async (files: File[]) => {
    const fontFiles = files.filter(file => 
      file.type === 'font/woff' || 
      file.type === 'font/woff2' || 
      file.type === 'font/ttf' || 
      file.type === 'font/otf' ||
      file.name.endsWith('.woff') ||
      file.name.endsWith('.woff2') ||
      file.name.endsWith('.ttf') ||
      file.name.endsWith('.otf')
    );

    if (fontFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Font Files",
        description: "Please upload font files (.woff, .woff2, .ttf, .otf)",
      });
      return;
    }

    const newFonts: LoadedFont[] = [];

    for (const file of fontFiles) {
      try {
        const fontUrl = URL.createObjectURL(file);
        const fontName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const fontFamily = fontName.replace(/[-_]/g, ' '); // Replace dashes/underscores with spaces
        
        // Create a new FontFace and load it
        const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
        await fontFace.load();
        
        // Add the font to the document
        document.fonts.add(fontFace);
        
        newFonts.push({
          name: fontName,
          family: fontFamily,
          url: fontUrl
        });

        console.log(`Font loaded: ${fontFamily}`);
      } catch (error) {
        console.error(`Failed to load font ${file.name}:`, error);
        toast({
          variant: "destructive",
          title: "Font Load Error",
          description: `Failed to load ${file.name}`,
        });
      }
    }

    if (newFonts.length > 0) {
      const updatedFonts = [...loadedFonts, ...newFonts];
      setLoadedFonts(updatedFonts);
      
      // Update the list of available fonts
      const fontFamilies = updatedFonts.map(font => font.family);
      onFontsUpdate(fontFamilies);
      
      toast({
        title: "Fonts Loaded",
        description: `Successfully loaded ${newFonts.length} font(s)`,
      });
    }
  };

  const removeFont = (fontToRemove: LoadedFont) => {
    // Remove from document fonts
    document.fonts.forEach(font => {
      if (font.family === fontToRemove.family) {
        document.fonts.delete(font);
      }
    });
    
    // Revoke object URL
    URL.revokeObjectURL(fontToRemove.url);
    
    // Update state
    const updatedFonts = loadedFonts.filter(font => font.name !== fontToRemove.name);
    setLoadedFonts(updatedFonts);
    
    // Update available fonts
    const fontFamilies = updatedFonts.map(font => font.family);
    onFontsUpdate(fontFamilies);
    
    toast({
      title: "Font Removed",
      description: `Removed ${fontToRemove.family}`,
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
      >
        <div className="flex flex-col items-center">
          <Type className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-4">
            Drag & drop font files here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Supported formats: .woff, .woff2, .ttf, .otf
          </p>
          <Button variant="outline" className="cursor-pointer" onClick={handleButtonClick}>
            <Upload className="h-4 w-4 mr-2" />
            Select Fonts
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {loadedFonts.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-3">Loaded Fonts ({loadedFonts.length})</h3>
          <div className="space-y-2">
            {loadedFonts.map((font) => (
              <div key={font.name} className="flex items-center justify-between bg-white p-2 rounded border">
                <div className="flex items-center space-x-3">
                  <Type className="h-4 w-4 text-gray-500" />
                  <span 
                    className="text-sm font-medium"
                    style={{ fontFamily: font.family }}
                  >
                    {font.family}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFont(font)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontUploader;
