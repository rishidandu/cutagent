import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side product URL scraper.
 * Fetches the page HTML and extracts OpenGraph / meta / structured data
 * for product title, description, images, and price.
 */
export async function POST(req: NextRequest) {
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

    return {
      title: p.title || "",
      description,
      price,
      images: images.slice(0, 8), // Up to 8 product images
      brand: p.vendor || parsed.hostname.replace("www.", ""),
      source: "shopify",
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

  // Title: og:title > twitter:title > <title>
  const title =
    meta("og:title") ||
    meta("twitter:title") ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");

  // Description: og:description > description
  const description =
    meta("og:description") || meta("description") || "";

  // Price: product:price:amount > various structured data patterns
  let price =
    meta("product:price:amount") ||
    meta("og:price:amount") ||
    "";
  if (!price) {
    // Try JSON-LD
    const jsonLdMatch = html.match(
      /"price"\s*:\s*"?(\d+\.?\d*)"?/i,
    );
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
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description).slice(0, 500),
    price,
    images: cleanImages,
    brand,
    source,
  };
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
    .replace(/&#x2F;/g, "/");
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
