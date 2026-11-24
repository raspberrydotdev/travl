
import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthorizedTripId } from "@/lib/trip-access";

export async function GET(request: NextRequest) {
    const tripId = await getAuthorizedTripId(request);

  try {

    if (!tripId) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("flights")
      .select("*")
      .eq("trip_id", tripId)
      .order("departure_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      flights: data ?? [],
    });

  } catch (error) {
    console.error("Flights API error:", error);

    return NextResponse.json(
      { error: "Unable to load flights" },
      { status: 500 }
    );
  }
}
