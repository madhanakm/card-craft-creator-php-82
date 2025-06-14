
import { useState, useRef } from "react";
import { Upload, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomFont {
  id: string;
  name: string;
  family: string;
  weight: string;
  style: string;
  url: string;
}

interface FontUploaderProps {
  onFontsUpdate: (fonts: CustomFont[]) => void;
  customFonts: CustomFont[];
}

const FontUploader: React.FC<FontUploaderProps> = ({ onFontsUpdate, customFonts }) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
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
    const validExtensions = ['.woff', '.woff2', '.ttf', '.otf'];
    const newFonts: CustomFont[] = [];

    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          variant: "destructive",
          title: "Invalid Font File",
          description: `${file.name} is not a valid font file. Please upload .woff, .woff2, .ttf, or .otf files.`,
        });
        continue;
      }

      try {
        const fontUrl = URL.createObjectURL(file);
        const fontName = file.name.replace(/\.[^/.]+$/, "");
        
        // Extract font family name (remove weight/style suffixes)
        const familyName = fontName
          .replace(/-?(Regular|Bold|Light|Medium|SemiBold|ExtraBold|Black|Thin|Italic|Oblique)$/i, '')
          .replace(/[-_]/g, ' ');

        // Detect weight and style from filename
        const weight = detectFontWeight(fontName);
        const style = detectFontStyle(fontName);

        const customFont: CustomFont = {
          id: `font-${Date.now()}-${Math.random()}`,
          name: fontName,
          family: familyName,
          weight: weight,
          style: style,
          url: fontUrl
        };

        // Load the font to ensure it's valid
        await loadFont(customFont);
        newFonts.push(customFont);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Font Loading Error",
          description: `Failed to load ${file.name}. Please check the font file.`,
        });
      }
    }

    if (newFonts.length > 0) {
      const updatedFonts = [...customFonts, ...newFonts];
      onFontsUpdate(updatedFonts);
      
      toast({
        title: "Fonts Uploaded",
        description: `Successfully uploaded ${newFonts.length} font${newFonts.length > 1 ? 's' : ''}.`,
      });
    }
  };

  const detectFontWeight = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes('thin')) return '100';
    if (name.includes('light')) return '300';
    if (name.includes('medium')) return '500';
    if (name.includes('semibold')) return '600';
    if (name.includes('bold') && !name.includes('extrabold')) return 'bold';
    if (name.includes('extrabold') || name.includes('black')) return '900';
    return 'normal';
  };

  const detectFontStyle = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes('italic') || name.includes('oblique')) return 'italic';
    return 'normal';
  };

  const loadFont = (font: CustomFont): Promise<void> => {
    return new Promise((resolve, reject) => {
      const fontFace = new FontFace(font.family, `url(${font.url})`, {
        weight: font.weight,
        style: font.style
      });

      fontFace.load()
        .then(() => {
          document.fonts.add(fontFace);
          resolve();
        })
        .catch(reject);
    });
  };

  const removeFont = (fontId: string) => {
    const fontToRemove = customFonts.find(f => f.id === fontId);
    if (fontToRemove) {
      // Remove from document fonts
      document.fonts.forEach(font => {
        if (font.family === fontToRemove.family) {
          document.fonts.delete(font);
        }
      });
      
      // Revoke object URL
      URL.revokeObjectURL(fontToRemove.url);
      
      // Update fonts list
      const updatedFonts = customFonts.filter(f => f.id !== fontId);
      onFontsUpdate(updatedFonts);
      
      toast({
        title: "Font Removed",
        description: `${fontToRemove.name} has been removed.`,
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Custom Fonts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 ${
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
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              Drag & drop font files here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Supported formats: .woff, .woff2, .ttf, .otf
            </p>
            <Button variant="outline" onClick={handleButtonClick}>
              <Type className="h-4 w-4 mr-2" />
              Select Font Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".woff,.woff2,.ttf,.otf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {customFonts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Uploaded Fonts:</h4>
            {customFonts.map((font) => (
              <div key={font.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ fontFamily: font.family }}>
                    {font.family}
                  </p>
                  <p className="text-xs text-gray-500">
                    Weight: {font.weight}, Style: {font.style}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFont(font.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FontUploader;
