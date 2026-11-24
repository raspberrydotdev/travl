
import "server-only";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_NAME = "travl_access_code";

export async function getAuthorizedTripId(
  request: NextRequest
): Promise<string | null> {
  const tripId = process.env.NEXT_PUBLIC_TRIP_ID;
  const code = request.cookies.get(COOKIE_NAME)?.value;

  if (!tripId || !code || !/^\d{4}$/.test(code)) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .select("id")
    .eq("trip_id", tripId)
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    console.error("Trip access verification failed:", error);
    return null;
  }

  return tripId;
}
