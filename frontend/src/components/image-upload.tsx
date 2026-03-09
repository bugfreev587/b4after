"use client";

import { useCallback, useState } from "react";
import { useApiClient } from "@/lib/api";

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const api = useApiClient();

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Please upload a JPEG, PNG, WebP, or GIF image");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File must be under 10MB");
        return;
      }
      setUploading(true);
      try {
        const result = await api.upload(file);
        onChange(result.url);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onChange, api],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/20 hover:border-white/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt={label}
              className="max-h-48 mx-auto rounded"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
            >
              &times;
            </button>
          </div>
        ) : (
          <div>
            {uploading ? (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag & drop an image or click to browse
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
