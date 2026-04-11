"use client";

import { useRef } from "react";
import type { BrandKit } from "@/lib/brand-kit";

interface Props {
  brandKit: BrandKit;
  onChange: (kit: BrandKit) => void;
}

export default function BrandKitPanel({ brandKit, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string | number) => {
    onChange({ ...brandKit, [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoUrl", reader.result as string);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const hasBrand = brandKit.name.trim() || brandKit.logoUrl;

  return (
    <div className="space-y-3">
      {/* Brand name */}
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="brand-name">Brand name</label>
        <input
          id="brand-name"
          type="text"
          value={brandKit.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Acme Co"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Logo */}
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="brand-logo">Logo</label>
        <div className="flex items-center gap-2">
          {brandKit.logoUrl ? (
            <div className="relative">
              <img src={brandKit.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain bg-zinc-800 border border-zinc-700 p-1" />
              <button
                onClick={() => update("logoUrl", "")}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="h-10 w-10 rounded-lg border border-dashed border-zinc-600 hover:border-zinc-500 flex items-center justify-center text-zinc-500 text-xs transition"
            >
              +
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <span className="text-[10px] text-zinc-600">{brandKit.logoUrl ? "Logo set" : "Upload PNG/SVG"}</span>
        </div>
      </div>

      {/* Colors */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="brand-primary">Primary color</label>
          <div className="flex gap-1.5 items-center">
            <input
              id="brand-primary"
              type="color"
              value={brandKit.primaryColor}
              onChange={(e) => update("primaryColor", e.target.value)}
              className="w-7 h-7 rounded border border-zinc-700 cursor-pointer"
            />
            <input
              type="text"
              value={brandKit.primaryColor}
              onChange={(e) => update("primaryColor", e.target.value)}
              className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[10px] font-mono focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="brand-secondary">Secondary</label>
          <div className="flex gap-1.5 items-center">
            <input
              id="brand-secondary"
              type="color"
              value={brandKit.secondaryColor}
              onChange={(e) => update("secondaryColor", e.target.value)}
              className="w-7 h-7 rounded border border-zinc-700 cursor-pointer"
            />
            <input
              type="text"
              value={brandKit.secondaryColor}
              onChange={(e) => update("secondaryColor", e.target.value)}
              className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-[10px] font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="brand-tagline">Tagline</label>
        <input
          id="brand-tagline"
          type="text"
          value={brandKit.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          placeholder="e.g. Built different."
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Watermark settings */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="watermark-pos">Watermark position</label>
          <select
            id="watermark-pos"
            value={brandKit.watermarkPosition}
            onChange={(e) => update("watermarkPosition", e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-[10px] focus:outline-none"
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="watermark-opacity">Opacity: {Math.round(brandKit.watermarkOpacity * 100)}%</label>
          <input
            id="watermark-opacity"
            type="range"
            min={10}
            max={100}
            value={Math.round(brandKit.watermarkOpacity * 100)}
            onChange={(e) => update("watermarkOpacity", Number(e.target.value) / 100)}
            className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
