import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // When Supabase is not configured, acknowledge but don't persist
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, persisted: false });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("waitlist")
      .upsert({ email: email.toLowerCase().trim(), source: "website" }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
