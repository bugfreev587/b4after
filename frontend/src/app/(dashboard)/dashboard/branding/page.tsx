"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  website_url: string | null;
}

export default function BrandingPage() {
  const api = useApiClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#833AB4");
  const [secondaryColor, setSecondaryColor] = useState("#E1306C");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const fetchBrands = useCallback(async () => {
    try {
      const data = await api.fetch<Brand[]>("/brands");
      setBrands(data);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const resetForm = () => {
    setName("");
    setLogoUrl("");
    setPrimaryColor("#833AB4");
    setSecondaryColor("#E1306C");
    setWebsiteUrl("");
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (brand: Brand) => {
    setEditing(brand);
    setName(brand.name);
    setLogoUrl(brand.logo_url || "");
    setPrimaryColor(brand.primary_color);
    setSecondaryColor(brand.secondary_color);
    setWebsiteUrl(brand.website_url || "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const body = {
      name,
      logo_url: logoUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      website_url: websiteUrl,
    };

    try {
      if (editing) {
        await api.fetch(`/brands/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Brand updated!");
      } else {
        await api.fetch("/brands", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Brand created!");
      }
      resetForm();
      fetchBrands();
    } catch {
      toast.error(editing ? "Failed to update brand" : "Failed to create brand");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading brands...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Branding</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            New Brand
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6 max-w-xl">
          <CardHeader>
            <CardTitle>{editing ? "Edit Brand" : "New Brand"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Business"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload
                  label="Upload Logo"
                  value={logoUrl}
                  onChange={setLogoUrl}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      id="primary"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      id="secondary"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://mybusiness.com"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editing ? "Update Brand" : "Create Brand"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {brands.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-2">No brands yet</h2>
          <p className="text-muted-foreground mb-6">
            Create a brand to customize your comparisons
          </p>
          <Button onClick={() => setShowForm(true)}>Create Brand</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => startEdit(brand)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{brand.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  {brand.logo_url && (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="w-10 h-10 rounded object-contain"
                    />
                  )}
                  <div className="flex gap-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: brand.primary_color }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: brand.secondary_color }}
                    />
                  </div>
                </div>
                {brand.website_url && (
                  <p className="text-sm text-muted-foreground truncate">
                    {brand.website_url}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
