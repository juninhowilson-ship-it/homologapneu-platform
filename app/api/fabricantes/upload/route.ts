import { NextResponse, type NextRequest } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await saveUploadedImage(formData, "fabricantes");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
