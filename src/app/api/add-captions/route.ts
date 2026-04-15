import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

// Allow up to 60 seconds for video processing (Vercel Pro)
export const maxDuration = 60;

interface CaptionSegment {
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * POST /api/add-captions
 *
 * Accepts a stitched video + caption timing data.
 * Burns captions into the video using FFmpeg drawtext filter.
 * Returns the captioned MP4.
 */
export async function POST(req: NextRequest) {
  const tmpDir = "/tmp";
  const id = randomUUID().slice(0, 8);
  const inputPath = path.join(tmpDir, `input-${id}.mp4`);
  const outputPath = path.join(tmpDir, `output-${id}.mp4`);

  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const captionsJson = formData.get("captions") as string | null;

    if (!videoFile || !captionsJson) {
      return NextResponse.json({ error: "Missing video or captions" }, { status: 400 });
    }

    const captions: CaptionSegment[] = JSON.parse(captionsJson);
    if (!captions.length) {
      return NextResponse.json({ error: "No caption segments" }, { status: 400 });
    }

    // Write video to temp file
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(inputPath, videoBuffer);

    // Build drawtext filter chain
    const filterChain = buildDrawtextFilter(captions);

    // Get FFmpeg binary path
    let ffmpegPath: string;
    try {
      ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
    } catch {
      ffmpegPath = "ffmpeg"; // Fallback to system FFmpeg
    }

    // Run FFmpeg
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegPath,
        [
          "-i", inputPath,
          "-vf", filterChain,
          "-c:a", "copy",
          "-y",
          outputPath,
        ],
        { timeout: 55_000 }, // Leave 5s buffer before Vercel timeout
        (error, _stdout, stderr) => {
          if (error) {
            console.error("[add-captions] FFmpeg error:", stderr);
            reject(new Error(`FFmpeg failed: ${error.message}`));
          } else {
            resolve();
          }
        },
      );
    });

    // Read output and return
    const output = await readFile(outputPath);

    return new NextResponse(output, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="cutagent-captioned.mp4"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Caption rendering failed" },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Build FFmpeg drawtext filter chain from caption segments.
 *
 * Each caption becomes a drawtext filter with enable='between(t,START,END)'.
 * Long text is word-wrapped across 2 lines.
 */
function buildDrawtextFilter(captions: CaptionSegment[]): string {
  const filters: string[] = [];

  for (const cap of captions) {
    const escaped = escapeFfmpegText(cap.text);
    const lines = wordWrap(escaped, 35);

    if (lines.length === 1) {
      filters.push(
        `drawtext=text='${lines[0]}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80:enable='between(t\\,${cap.startTime}\\,${cap.endTime})'`,
      );
    } else {
      // Two lines: top line + bottom line
      filters.push(
        `drawtext=text='${lines[0]}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-110:enable='between(t\\,${cap.startTime}\\,${cap.endTime})'`,
      );
      filters.push(
        `drawtext=text='${lines[1]}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-70:enable='between(t\\,${cap.startTime}\\,${cap.endTime})'`,
      );
    }
  }

  return filters.join(",");
}

function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function wordWrap(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current.trim()) lines.push(current.trim());

  // Max 2 lines for readability
  return lines.slice(0, 2);
}
