import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

/**
 * Server-side product URL scraper.
 * Fetches the page HTML and extracts OpenGraph / meta / structured data
 * for product title, description, images, and price.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // For Shopify stores, try the product JSON API first — much richer data
    const shopifyProduct = await tryShopifyJson(parsed);
    if (shopifyProduct) {
      return NextResponse.json(shopifyProduct);
    }

    // Fallback: fetch HTML and parse metadata
    const resp = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${resp.status}` },
        { status: 502 },
      );
    }

    const html = await resp.text();

    // Extract metadata from HTML
    const product = extractProductData(html, parsed.hostname);

    return NextResponse.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Shopify JSON API ──

/**
 * Shopify stores expose product data at /products/[handle].json
 * This gives us ALL product images, variants, descriptions — much richer than HTML scraping.
 */
async function tryShopifyJson(parsed: URL): Promise<ProductData | null> {
  try {
    // Extract the product handle from the URL path
    // Shopify URLs: /products/product-handle or /collections/*/products/product-handle
    const pathMatch = parsed.pathname.match(/\/products\/([^/?#]+)/);
    if (!pathMatch) return null;

    const handle = pathMatch[1];
    const jsonUrl = `${parsed.origin}/products/${handle}.json`;

    const resp = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const p = data.product;
    if (!p) return null;

    // Extract ALL product images (Shopify provides them in high quality)
    const images: string[] = [];
    if (p.images && Array.isArray(p.images)) {
      for (const img of p.images) {
        const src = img.src || img.url;
        if (src) images.push(src);
      }
    }
    // Also add the featured image if not already included
    if (p.image?.src && !images.includes(p.image.src)) {
      images.unshift(p.image.src);
    }

    // Extract price from first variant
    let price = "";
    if (p.variants?.[0]?.price) {
      const amount = p.variants[0].price;
      price = `$${amount}`;
    }

    // Strip HTML from description
    const description = (p.body_html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    // Extract entities from Shopify product data
    const category = p.product_type || "";
    const tags: string[] = Array.isArray(p.tags) ? p.tags : typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()) : [];
    // Try to extract color from first variant option
    const color = p.variants?.[0]?.option1 && /color|colour/i.test(p.options?.[0]?.name || "")
      ? p.variants[0].option1 : "";
    const material = tags.find((t: string) => /leather|cotton|nylon|polyester|wool|silk|metal|wood|glass|ceramic/i.test(t)) || "";

    return {
      title: cleanProductTitle(p.title || ""),
      description,
      price,
      images: images.slice(0, 8),
      brand: p.vendor || parsed.hostname.replace("www.", ""),
      source: "shopify",
      category,
      color,
      material,
      keywords: tags.slice(0, 10),
    };
  } catch {
    return null; // Not a Shopify store or API not available
  }
}

// ── HTML metadata extraction ──

interface ProductData {
  title: string;
  description: string;
  price: string;
  images: string[];
  brand: string;
  source: string;
  /** Extracted product entities for better prompting */
  category?: string;
  color?: string;
  material?: string;
  keywords?: string[];
}

function extractProductData(html: string, hostname: string): ProductData {
  const meta = (name: string): string => {
    // Try property= first (OpenGraph), then name=
    const ogMatch = html.match(
      new RegExp(
        `<meta[^>]*property=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
    );
    if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

    const nameMatch = html.match(
      new RegExp(
        `<meta[^>]*name=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
    );
    if (nameMatch?.[1]) return decodeHtmlEntities(nameMatch[1]);

    // Also try content= before property=/name= (some sites reverse order)
    const reverseOg = html.match(
      new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${escapeRegex(name)}["']`,
        "i",
      ),
    );
    if (reverseOg?.[1]) return decodeHtmlEntities(reverseOg[1]);

    return "";
  };

  // Title: og:title > twitter:title > <title> — then clean up
  const rawTitle =
    meta("og:title") ||
    meta("twitter:title") ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");
  const title = cleanProductTitle(rawTitle);

  // ── Extract structured data from JSON-LD (richest source) ──
  const jsonLd = extractJsonLd(html);

  // Description: JSON-LD > og:description > meta description
  const description =
    jsonLd.description ||
    meta("og:description") ||
    meta("description") || "";

  // Entity extraction from JSON-LD
  const category = jsonLd.category || "";
  const color = jsonLd.color || "";
  const material = jsonLd.material || "";
  const keywords = jsonLd.keywords || [];

  // Price: JSON-LD > meta tags > regex fallback
  let price = jsonLd.price || meta("product:price:amount") || meta("og:price:amount") || "";
  if (!price) {
    const jsonLdMatch = html.match(/"price"\s*:\s*"?(\d+\.?\d*)"?/i);
    if (jsonLdMatch?.[1]) price = jsonLdMatch[1];
  }
  const currency = meta("product:price:currency") || meta("og:price:currency") || "USD";
  if (price && !price.startsWith("$")) {
    price = `${currency === "USD" ? "$" : currency + " "}${price}`;
  }

  // Images: og:image + JSON-LD + product gallery + Shopify CDN patterns
  const images: string[] = [];
  const addImage = (url: string) => {
    if (!url || images.includes(url)) return;
    // Skip tiny icons, SVGs, and tracking pixels
    if (/\.(svg|gif)(\?|$)/i.test(url)) return;
    if (/logo|icon|favicon|badge|sprite|pixel/i.test(url)) return;
    images.push(url);
  };

  // 1. OpenGraph images
  const ogImage = meta("og:image");
  if (ogImage) addImage(ogImage);
  const ogMatches = html.matchAll(
    /<meta[^>]*(?:property|name)=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/gi,
  );
  for (const m of ogMatches) { if (m[1]) addImage(m[1]); }
  const ogMatchesReverse = html.matchAll(
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image(?::url)?["']/gi,
  );
  for (const m of ogMatchesReverse) { if (m[1]) addImage(m[1]); }

  // 2. JSON-LD product images (Shopify, Amazon, most e-commerce)
  const jsonLdBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of jsonLdBlocks) {
    try {
      const ld = JSON.parse(block[1]);
      // Could be a single object or an array
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item.image) {
          const imgs = Array.isArray(item.image) ? item.image : [item.image];
          for (const img of imgs) {
            const url = typeof img === "string" ? img : img?.url;
            if (url) addImage(url);
          }
        }
        // Also check offers.image
        if (item.offers?.image) {
          const url = typeof item.offers.image === "string" ? item.offers.image : item.offers.image?.url;
          if (url) addImage(url);
        }
      }
    } catch { /* invalid JSON-LD, skip */ }
  }

  // 3. Shopify-specific: product images from window.__SHOPIFY__ or featured_image patterns
  const shopifyImgMatches = html.matchAll(/["'](https?:\/\/cdn\.shopify\.com\/s\/files\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi);
  for (const m of shopifyImgMatches) {
    if (m[1]) addImage(m[1].replace(/&amp;/g, "&"));
  }

  // 4. Amazon-specific: high-res product images
  const amazonImgMatches = html.matchAll(/["'](https?:\/\/m\.media-amazon\.com\/images\/[^"']+\.(?:jpg|jpeg|png))["']/gi);
  for (const m of amazonImgMatches) {
    if (m[1]) addImage(m[1]);
  }

  // 5. General product gallery: large <img> tags with product-related classes/attributes
  const productImgMatches = html.matchAll(/<img[^>]*(?:class=["'][^"']*(?:product|gallery|hero|main|featured)[^"']*["']|data-(?:zoom|large|src)=["']([^"']+)["'])[^>]*src=["']([^"']+)["'][^>]*>/gi);
  for (const m of productImgMatches) {
    // Prefer data-zoom/data-large URL over src
    const url = m[1] || m[2];
    if (url && /\.(jpg|jpeg|png|webp)/i.test(url)) addImage(url);
  }

  // Also check reverse attribute order (src before class)
  const productImgMatchesAlt = html.matchAll(/<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*(?:class=["'][^"']*(?:product|gallery|hero|main|featured)[^"']*["'])/gi);
  for (const m of productImgMatchesAlt) {
    if (m[1]) addImage(m[1]);
  }

  // Brand
  const brand =
    meta("og:site_name") || meta("product:brand") || hostname.replace("www.", "");

  // Determine source type
  let source = "generic";
  if (hostname.includes("shopify") || html.includes("Shopify.theme")) source = "shopify";
  else if (hostname.includes("amazon")) source = "amazon";
  else if (hostname.includes("etsy")) source = "etsy";
  else if (hostname.includes("ebay")) source = "ebay";

  // Clean up and upscale image URLs
  const cleanImages = images
    .map((u) => upscaleImageUrl(decodeHtmlEntities(u)))
    .slice(0, 6);

  return {
    title,
    description: decodeHtmlEntities(description).slice(0, 500),
    price,
    images: cleanImages,
    brand,
    source,
    category,
    color,
    material,
    keywords,
  };
}

/**
 * Extract rich product data from JSON-LD structured data blocks.
 * This is the BEST source for product info — contains description, category,
 * color, material, price, and more that meta tags often miss.
 */
function extractJsonLd(html: string): {
  description: string;
  category: string;
  color: string;
  material: string;
  price: string;
  keywords: string[];
} {
  const result = { description: "", category: "", color: "", material: "", price: "", keywords: [] as string[] };

  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const raw = JSON.parse(block[1]);
      const items = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        // Only process Product schema
        const type = item["@type"];
        if (type !== "Product" && type !== "IndividualProduct") continue;

        // Description — prefer JSON-LD over meta tags (richer, more complete)
        if (item.description && !result.description) {
          result.description = String(item.description)
            .replace(/<[^>]*>/g, " ")   // strip HTML
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 600);
        }

        // Category / product type
        if (item.category && !result.category) {
          result.category = String(item.category);
        }
        if (item.productGroupID && !result.category) {
          result.category = String(item.productGroupID);
        }

        // Color
        if (item.color && !result.color) {
          result.color = String(typeof item.color === "string" ? item.color : item.color.name || "");
        }
        // Also check additionalProperty for color
        if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
          for (const prop of item.additionalProperty) {
            if (/color/i.test(prop.name) && prop.value && !result.color) {
              result.color = String(prop.value);
            }
            if (/material/i.test(prop.name) && prop.value && !result.material) {
              result.material = String(prop.value);
            }
          }
        }

        // Material
        if (item.material && !result.material) {
          result.material = String(typeof item.material === "string" ? item.material : item.material.name || "");
        }

        // Price from offers
        if (item.offers && !result.price) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const offer of offers) {
            if (offer.price) {
              const currency = offer.priceCurrency || "USD";
              const symbol = currency === "USD" ? "$" : currency === "GBP" ? "\u00A3" : currency === "EUR" ? "\u20AC" : `${currency} `;
              result.price = `${symbol}${offer.price}`;
              break;
            }
          }
        }

        // Keywords from breadcrumb or tags
        if (item.keywords) {
          const kw = typeof item.keywords === "string"
            ? item.keywords.split(",").map((k: string) => k.trim())
            : Array.isArray(item.keywords) ? item.keywords : [];
          result.keywords = kw.filter((k: string) => k.length > 0).slice(0, 10);
        }
      }

      // Also check BreadcrumbList for category inference
      for (const item of items) {
        if (item["@type"] === "BreadcrumbList" && item.itemListElement && !result.category) {
          const crumbs = item.itemListElement
            .filter((c: { name?: string }) => c.name)
            .map((c: { name: string }) => c.name);
          // Last breadcrumb before the product name is usually the category
          if (crumbs.length >= 2) {
            result.category = crumbs[crumbs.length - 2];
          }
        }
      }
    } catch {
      // Invalid JSON-LD block, skip
    }
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&reg;/gi, "")
    .replace(/&trade;/gi, "")
    .replace(/&copy;/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&deg;/gi, "")
    .replace(/&mdash;/gi, " - ")
    .replace(/&ndash;/gi, " - ")
    .replace(/&#\d+;/g, "")      // numeric entities
    .replace(/&#x[\da-f]+;/gi, "") // hex entities
    .replace(/[®™©°]/g, "")       // literal unicode symbols
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean a product title: strip pipe separators, trim brand suffixes, normalize.
 * "Product Name | Brand | Extra" → "Product Name"
 * "Blue Tent - Camping Gear - OutdoorCo" → "Blue Tent"
 */
function cleanProductTitle(raw: string): string {
  let title = decodeHtmlEntities(raw);

  // Strip pipe-separated suffixes (keep the first segment which is usually the product name)
  if (title.includes("|")) {
    title = title.split("|")[0].trim();
  }
  // Also strip " - Brand Name" suffixes (common on Amazon, DTC sites)
  if (title.includes(" - ") && title.split(" - ").length > 2) {
    title = title.split(" - ").slice(0, -1).join(" - ").trim();
  }
  // Strip leading "Buy " or "Shop "
  title = title.replace(/^(buy|shop|new|sale)\s+/i, "");

  return title.trim();
}

/**
 * Rewrite CDN thumbnail URLs to request full-size images (fal.ai requires min 300x300).
 */
function upscaleImageUrl(url: string): string {
  let u = url;

  // Demandware / Salesforce Commerce: sw=256&sh=256 → sw=1200&sh=1200
  if (u.includes("demandware.static") || u.includes("dw/image")) {
    u = u.replace(/\bsw=\d+/g, "sw=1200").replace(/\bsh=\d+/g, "sh=1200");
  }

  // Shopify CDN: _100x100 → _1200x1200
  if (u.includes("cdn.shopify.com")) {
    u = u.replace(/_\d+x\d*(\.[a-z]+)/i, "_1200x$1");
  }

  // Amazon: remove resize params like ._SX200_ or ._SS100_
  if (u.includes("media-amazon.com")) {
    u = u.replace(/\._[A-Z]{2}\d+_/g, "");
  }

  return u;
}
