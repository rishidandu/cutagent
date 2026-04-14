import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

/**
 * Image Normalization Engine
 *
 * Takes an array of image URLs from any source (Shopify, Amazon, Patagonia, etc.),
 * downloads them server-side (bypassing CORS), validates dimensions, and returns
 * normalized metadata ready for AI model consumption.
 *
 * Pipeline:
 * 1. Fetch each image server-side (no CORS restrictions)
 * 2. Check dimensions via header analysis or full download
 * 3. Filter out images that are too small (<300px), icons, or non-product images
 * 4. Return base64 data URLs + metadata for client to upload to fal.ai storage
 *
 * Why base64 instead of re-hosting server-side?
 * - The client already has fal.ai credentials configured
 * - fal.storage.upload works from the browser
 * - Avoids needing server-side fal.ai credentials
 */

interface NormalizedImage {
  originalUrl: string;
  dataUrl: string;       // base64 data URL for client-side fal.storage.upload
  width: number;
  height: number;
  sizeKB: number;
  contentType: string;
  quality: "high" | "medium" | "low";
}

interface NormalizeRequest {
  urls: string[];
  minWidth?: number;     // default 300
  minHeight?: number;    // default 300
  targetWidth?: number;  // optional resize target
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body: NormalizeRequest = await req.json();
    const { urls, minWidth = 300, minHeight = 300 } = body;

    if (!urls?.length) {
      return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
    }

    // Process images in parallel (max 8)
    const candidates = urls.slice(0, 8);
    const results = await Promise.allSettled(
      candidates.map((url) => processImage(url, minWidth, minHeight)),
    );

    const normalized: NormalizedImage[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        normalized.push(result.value);
      }
    }

    // Sort by quality: high > medium > low, then by size (larger = better detail)
    const qualityOrder = { high: 0, medium: 1, low: 2 };
    normalized.sort((a, b) => {
      const qDiff = qualityOrder[a.quality] - qualityOrder[b.quality];
      if (qDiff !== 0) return qDiff;
      return b.sizeKB - a.sizeKB;
    });

    return NextResponse.json({
      images: normalized,
      total: candidates.length,
      passed: normalized.length,
      filtered: candidates.length - normalized.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Normalization failed" },
      { status: 500 },
    );
  }
}

/**
 * Download, validate, and normalize a single image.
 */
async function processImage(
  url: string,
  minWidth: number,
  minHeight: number,
): Promise<NormalizedImage | null> {
  // Clean up URL first
  const cleanUrl = cleanImageUrl(url);

  try {
    const resp = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await resp.arrayBuffer());
    const sizeKB = Math.round(buffer.length / 1024);

    // Skip tiny files (likely tracking pixels or icons)
    if (sizeKB < 5) return null;

    // Get dimensions from binary header
    const dims = getImageDimensions(buffer);
    if (!dims) return null;

    // Filter by minimum dimensions
    if (dims.width < minWidth || dims.height < minHeight) return null;

    // Determine quality tier
    const quality: NormalizedImage["quality"] =
      dims.width >= 800 && dims.height >= 800 ? "high" :
      dims.width >= 400 && dims.height >= 400 ? "medium" : "low";

    // Convert to base64 data URL
    const mimeType = contentType.split(";")[0].trim() || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return {
      originalUrl: url,
      dataUrl,
      width: dims.width,
      height: dims.height,
      sizeKB,
      contentType: mimeType,
      quality,
    };
  } catch {
    return null;
  }
}

/**
 * Clean and upscale CDN thumbnail URLs to full-size.
 */
function cleanImageUrl(url: string): string {
  let u = url.replace(/&amp;/g, "&");

  // Demandware: sw=256 → sw=1200
  if (u.includes("demandware.static") || u.includes("dw/image")) {
    u = u.replace(/\bsw=\d+/g, "sw=1200").replace(/\bsh=\d+/g, "sh=1200");
  }
  // Shopify: _100x100 → remove resize
  if (u.includes("cdn.shopify.com")) {
    u = u.replace(/_\d+x\d*(\.[a-z]+)/i, "$1");
  }
  // Amazon: remove resize params
  if (u.includes("media-amazon.com")) {
    u = u.replace(/\._[A-Z]{2}\d+_/g, "");
  }

  return u;
}

/**
 * Extract image dimensions from binary data without a full image library.
 * Supports JPEG, PNG, GIF, WebP headers.
 */
function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  // PNG: bytes 16-23 contain width and height as 4-byte big-endian
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG: scan for SOF markers
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) { offset++; continue; }
      const marker = buffer[offset + 1];
      // SOF0-SOF3 markers contain dimensions
      if (marker >= 0xC0 && marker <= 0xC3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }

  // WebP: RIFF header, then VP8 chunk
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    // VP8 lossy
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
      const width = buffer.readUInt16LE(26) & 0x3FFF;
      const height = buffer.readUInt16LE(28) & 0x3FFF;
      return { width, height };
    }
    // VP8L lossless
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) {
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3FFF) + 1;
      const height = ((bits >> 14) & 0x3FFF) + 1;
      return { width, height };
    }
  }

  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  return null;
}
