/**
 * Brand Kit — logo, colors, and watermark settings.
 * Applied as visual overlay during export and as prompt context during generation.
 */

export interface BrandKit {
  /** Brand name */
  name: string;
  /** Logo image as data URL or hosted URL */
  logoUrl: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Watermark position during export */
  watermarkPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Watermark opacity 0-1 */
  watermarkOpacity: number;
  /** Tagline for CTA scenes */
  tagline: string;
}

export function createDefaultBrandKit(): BrandKit {
  return {
    name: "",
    logoUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e1e1e",
    watermarkPosition: "bottom-right",
    watermarkOpacity: 0.7,
    tagline: "",
  };
}

/**
 * Generate a style brief addendum from brand kit settings.
 * Appended to the Style Engine's brief for prompt-level branding.
 */
export function brandKitToBrief(kit: BrandKit): string {
  if (!kit.name) return "";
  const parts: string[] = [];
  parts.push(`Brand: ${kit.name}.`);
  if (kit.tagline) parts.push(`Tagline: "${kit.tagline}".`);
  parts.push(`Brand colors: ${kit.primaryColor} and ${kit.secondaryColor}. Incorporate these colors subtly in lighting, props, or background.`);
  return parts.join(" ");
}
