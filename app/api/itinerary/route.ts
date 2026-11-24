
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

    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError) throw tripError;

    const { data: days, error: daysError } = await supabaseAdmin
      .from("trip_days")
      .select(`
        *,
        activities (*)
      `)
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: true });

    if (daysError) throw daysError;

    return NextResponse.json({
      success: true,
      trip,
      days,
    });

  } catch (error) {
    console.error("Itinerary API error:", error);

    return NextResponse.json(
      { error: "Unable to load itinerary" },
      { status: 500 }
    );
  }
}
