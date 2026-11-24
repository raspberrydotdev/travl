
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthorizedTripId } from "@/lib/trip-access";

export async function GET(request: NextRequest) {
  const tripId = await getAuthorizedTripId(request);
  try {
    
    if (!tripId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("stays")
      .select("*")
      .eq("trip_id", tripId)
      .order("check_in", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      stays: data || [],
    });

  } catch (error) {
    console.error("Stays API error:", error);

    return NextResponse.json(
      { error: "Unable to load stays" },
      { status: 500 }
    );
  }
}
