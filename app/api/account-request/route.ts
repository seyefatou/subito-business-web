import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    company_name,
    ninea,
    sector,
    contact_name,
    phone,
    email,
    estimated_vehicles,
    estimated_users,
  } = body;

  // TODO: persist to Supabase, send confirmation email, etc.
  console.log("Account request received:", {
    company_name,
    ninea,
    sector,
    contact_name,
    phone,
    email,
    estimated_vehicles,
    estimated_users,
  });

  return NextResponse.json(
    { success: true, message: "Demande reçue avec succès." },
    { status: 200 }
  );
}
