"use client";

import { useState } from "react";
import type { ProductData } from "@/lib/storyboard-generator";

interface NormalizedImage {
  originalUrl: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
  quality: "high" | "medium" | "low";
  /** fal.ai-hosted URL after upload */
  hostedUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (product: ProductData) => void;
  onHookLab?: (product: ProductData) => void;
}

export default function ProductImport({ open, onClose, onImport, onHookLab }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [normalizedImages, setNormalizedImages] = useState<NormalizedImage[]>([]);

  if (!open) return null;

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setProduct(null);
    setNormalizedImages([]);

    try {
      // Step 1: Scrape product data
      const resp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to scrape URL");
        return;
      }

      setProduct(data);
      setLoading(false);

      // Step 2: Normalize images (runs in background after product shows)
      if (data.images?.length > 0) {
        setNormalizing(true);
        try {
          const normResp = await fetch("/api/normalize-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: data.images }),
          });
          if (normResp.ok) {
            const normData = await normResp.json();
            const images = (normData.images || []) as NormalizedImage[];
            setNormalizedImages(images);

            // Update product.images with the original (cleaned/upscaled) URLs
            // fal.ai upload happens automatically at generation time via ensureHostedUrl()
            if (images.length > 0) {
              setProduct((prev) => prev ? {
                ...prev,
                images: images.map((img) => img.originalUrl),
              } : prev);
            }
          }
        } catch {
          // Normalization failed — original images will be used
        } finally {
          setNormalizing(false);
        }
      }
    } catch {
      setError("Network error — could not reach scraper");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (product) {
      onImport(product);
      setUrl("");
      setProduct(null);
      setNormalizedImages([]);
      setError("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Import Product</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Paste a product URL to auto-generate an ad storyboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* URL Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
            placeholder="https://shopify.com/products/your-product..."
            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2.5 text-xs font-semibold transition whitespace-nowrap"
          >
            {loading ? "Scraping..." : "Fetch"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-4 justify-center">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            Fetching product data...
          </div>
        )}

        {/* Product Preview */}
        {product && !loading && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3 mb-4">
            <div className="flex gap-3">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-16 h-16 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-100 truncate">
                  {product.title || "Untitled Product"}
                </h3>
                {product.price && (
                  <span className="text-xs text-emerald-400 font-medium">{product.price}</span>
                )}
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                  {product.description || "No description found"}
                </p>
              </div>
            </div>

            {/* Normalized product assets */}
            {(normalizedImages.length > 0 || normalizing || (product.images?.length ?? 0) > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-zinc-400">
                    Product assets
                  </span>
                  {normalizing && (
                    <span className="text-[10px] text-blue-400 animate-pulse">
                      Normalizing & uploading to AI-ready format...
                    </span>
                  )}
                  {!normalizing && normalizedImages.length > 0 && (
                    <span className="text-[10px] text-emerald-400">
                      {normalizedImages.length} image{normalizedImages.length !== 1 ? "s" : ""} validated
                    </span>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {normalizedImages.length > 0
                    ? normalizedImages.map((img, i) => (
                        <div key={`norm-img-${i}`} className="relative flex-shrink-0">
                          <img
                            src={img.dataUrl}
                            alt={`Product ${i + 1}`}
                            className="w-20 h-20 rounded-lg object-cover border border-emerald-600"
                          />
                          <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
                            <span className={`text-[7px] rounded px-1 py-0.5 font-semibold ${
                              img.quality === "high" ? "bg-emerald-600 text-white" :
                              img.quality === "medium" ? "bg-amber-600 text-white" :
                              "bg-zinc-600 text-zinc-200"
                            }`}>
                              {img.width}x{img.height}
                            </span>
                          </div>
                          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] text-white">
                            ✓
                          </span>
                        </div>
                      ))
                    : product.images?.slice(0, 6).map((img, i) => (
                        <div key={`raw-img-${i}`} className="relative flex-shrink-0">
                          <img
                            src={img}
                            alt={`Product ${i + 1}`}
                            className="w-20 h-20 rounded-lg object-cover border border-zinc-700 opacity-60"
                          />
                          {normalizing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            </div>
                          )}
                        </div>
                      ))
                  }
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-2 py-0.5">
                {product.source}
              </span>
              <span className="text-[10px] text-zinc-600">{product.brand}</span>
            </div>
          </div>
        )}

        {/* Or: manual entry */}
        {!product && !loading && (
          <div className="text-center py-3 mb-4">
            <p className="text-[11px] text-zinc-600">
              Supports Shopify, Amazon, Etsy, and most product pages with OpenGraph tags
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition"
          >
            Cancel
          </button>
          {onHookLab && (
            <button
              onClick={() => product && onHookLab(product)}
              disabled={!product}
              className="rounded-lg bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold text-white transition shadow-[0_6px_16px_rgba(249,115,22,0.2)]"
            >
              Hook Lab — Test 20 Hooks
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!product}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
          >
            Generate 4-Scene Ad
          </button>
        </div>
      </div>
    </div>
  );
}
