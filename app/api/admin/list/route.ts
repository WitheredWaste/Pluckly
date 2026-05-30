import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tools } from "@/db/schema";

type ToolRow = {
  name: string;
  slug: string;
  priceCheckedAt: Date | null;
  publishedAt: Date | null;
};

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
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
