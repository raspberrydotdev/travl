
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthorizedTripId } from "@/lib/trip-access";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: Context
) {
    const tripId = await getAuthorizedTripId(request);

  try {

    if (!tripId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: stay, error: stayError } =
      await supabaseAdmin
        .from("stays")
        .select("id")
        .eq("id", id)
        .eq("trip_id", tripId)
        .maybeSingle();

    if (stayError || !stay) {
      return NextResponse.json(
        { error: "Stay not found" },
        { status: 404 }
      );
    }

    const { data: document, error: documentError } =
      await supabaseAdmin
        .from("stay_documents")
        .select("*")
        .eq("stay_id", id)
        .maybeSingle();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Stay document not found" },
        { status: 404 }
      );
    }

    const download =
      request.nextUrl.searchParams.get("download") === "1";

    const { data, error } = await supabaseAdmin.storage
      .from("trip-documents")
      .createSignedUrl(
        document.storage_path,
        60 * 60 * 24,
        download ? { download: document.file_name } : {}
      );

    if (error || !data) throw error;

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      fileName: document.file_name,
    });
  } catch (error) {
    console.error("Stay document API:", error);

    return NextResponse.json(
      { error: "Unable to access stay document" },
      { status: 500 }
    );
  }
}
