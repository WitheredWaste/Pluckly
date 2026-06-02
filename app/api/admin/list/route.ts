import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { tools } from "@/db/schema";

type ToolRow = {
  name: string;
  slug: string;
  priceCheckedAt: Date | null;
  publishedAt: Date | null;
};

export async function POST(request: Request) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rows: ToolRow[] = await db
    .select({
      name: tools.name,
      slug: tools.slug,
      priceCheckedAt: tools.priceCheckedAt,
      publishedAt: tools.publishedAt,
    })
    .from(tools);

  rows.sort((a: ToolRow, b: ToolRow) => {
    const at = a.priceCheckedAt ? new Date(a.priceCheckedAt).getTime() : 0;
    const bt = b.priceCheckedAt ? new Date(b.priceCheckedAt).getTime() : 0;
    return at - bt;
  });

  return NextResponse.json({ tools: rows });
}
