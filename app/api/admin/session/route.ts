import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";

export async function POST(request: Request) {
  const authed = await isAuthed(request);
  return NextResponse.json({ authed });
}
