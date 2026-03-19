import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const field = formData.get("field") as string | null; // "logo" | "upiQr"

  if (!file) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only image files are allowed (jpg, png, webp, gif)" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Build a safe filename
  const ext = path.extname(file.name) || ".png";
  const filename = `${field ?? "upload"}-${Date.now()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const relativePath = `/uploads/${filename}`;
  return NextResponse.json({ path: relativePath });
}
