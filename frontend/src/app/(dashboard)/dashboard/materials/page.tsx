"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

interface GeneratedMaterial {
  url: string;
  template: string;
  width: number;
  height: number;
}

interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
}

const TEMPLATES: Template[] = [
  { id: "business_card", name: "Business Card", width: 1080, height: 1920 },
  { id: "store_card", name: "Store Card", width: 2480, height: 3508 },
  { id: "instagram", name: "Instagram", width: 1080, height: 1080 },
  { id: "social", name: "Social", width: 1200, height: 630 },
];

export default function MaterialsPage() {
  const api = useApiClient();
  const [url, setUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("#e1306c");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedMaterial | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !selectedTemplate) {
      toast.error("Please enter a URL and select a template");
      return;
    }

    setGenerating(true);
    setResult(null);
    try {
      const data = await api.fetch<GeneratedMaterial>("/materials/generate", {
        method: "POST",
        body: JSON.stringify({
          url,
          template: selectedTemplate,
          brand_colors: {
            primary: primaryColor,
            secondary: secondaryColor,
          },
        }),
      });
      setResult(data);
      toast.success("Material generated");
    } catch {
      toast.error("Failed to generate material");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">QR Materials</h1>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourdomain.com/page"
            required
          />
        </div>

        {/* Template Selector */}
        <div className="space-y-2">
          <Label>Template</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id
                    ? "ring-2 ring-primary border-primary"
                    : ""
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[3/4] bg-muted rounded flex items-center justify-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      Preview
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {template.width} x {template.height}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <Input
                id="primary_color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#7c3aed"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Secondary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border shrink-0"
                style={{ backgroundColor: secondaryColor }}
              />
              <Input
                id="secondary_color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#e1306c"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button type="submit" disabled={generating || !url || !selectedTemplate}>
          {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {generating ? "Generating..." : "Generate Material"}
        </Button>
      </form>

      {/* Result */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Material</CardTitle>
              <a href={result.url} download>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <img
                src={result.url}
                alt={`Generated ${result.template} material`}
                className="max-w-full max-h-[600px] rounded border object-contain"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {result.template} &mdash; {result.width} x {result.height}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
