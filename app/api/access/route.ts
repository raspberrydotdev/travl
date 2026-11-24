
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthorizedTripId } from "@/lib/trip-access";

const COOKIE_NAME = "travl_access_code";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (typeof code !== "string" || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 4-digit PIN" },
        { status: 400 }
      );
    }

    const tripId = process.env.NEXT_PUBLIC_TRIP_ID;

    if (!tripId) {
      return NextResponse.json(
        { success: false, error: "Trip configuration missing" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .select("id")
      .eq("trip_id", tripId)
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Incorrect PIN" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEN_YEARS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to verify PIN" },
      { status: 500 }
    );
  }
}

// Check whether this browser is already authorised
export async function GET(request: NextRequest) {
  const tripId = await getAuthorizedTripId(request);

  return NextResponse.json({
    authenticated: !!tripId,
  });
}

// Logout on this device
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
