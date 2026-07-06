import { whatsapp } from "@/app/services/whatsapp";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const { phone, name, date, time } = await req.json();

  if (!phone || !name || !date || !time) {
    return NextResponse.json({
      success: false,
      message: "phone, name, date, time are required",
    });
  }


  try {
    const { response, data } = await whatsapp(phone, "trial_confirmation", [{ type: "text", text: name }, { type: "text", text: date }, { type: "text", text: time }])

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: "Failed to send template message",
        error: data,
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json({
      success: false,
      message: "Server error",
    });
  }
};