import axios from "axios";
import { sendEmail } from "@/src/lib/services/email";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

// =========================================================
// FAST2SMS DLT SMS HELPER
// =========================================================

async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const senderId = process.env.FAST2SMS_SENDER_ID;
    const messageId = process.env.FAST2SMS_DLT_MESSAGE_ID;

    if (!apiKey || !senderId || !messageId) {
      throw new Error(
        "FAST2SMS_API_KEY, FAST2SMS_SENDER_ID or FAST2SMS_DLT_MESSAGE_ID is not configured"
      );
    }

    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      headers: {
        authorization: apiKey,
      },
      params: {
        route: "dlt",
        sender_id: senderId,
        message: messageId,
        variables_values: otp, // single {#var#} in the template
        flash: 0,
        numbers: phone, // plain 10-digit number, no 91 prefix
      },
      timeout: 10000,
    });

    // Fast2SMS returns { return: true, request_id, message: [...] } on success
    if (response.data?.return !== true) {
      console.error("FAST2SMS ERROR:", response.data);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(
      "SMS OTP ERROR:",
      error.response?.data || error.message
    );
    return false;
  }
}

// =========================================================
// EMAIL OTP HELPER
// =========================================================

async function sendOtpEmail(
  email: string,
  name: string,
  otp: string
): Promise<boolean> {
  try {
    await sendEmail({
      to: email.trim().toLowerCase(),
      templateId: 2,
      name,
      params: {
        otp,
        name,
      },
    });

    return true;
  } catch (error) {
    console.error("EMAIL OTP ERROR:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { type, value } = body;

    if (!type || !value) {
      return NextResponse.json(
        {
          success: false,
          message: "Type and value are required",
        },
        { status: 400 }
      );
    }

    if (type !== "PHONE" && type !== "EMAIL") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid type",
        },
        { status: 400 }
      );
    }

    const normalizedValue =
      typeof value === "string"
        ? value.trim().toLowerCase()
        : value;

    // =========================================================
    // FIND MEMBER (BY PHONE OR EMAIL)
    // =========================================================

    let member = null;

    if (type === "PHONE") {
      const cleanPhone = String(normalizedValue).replace(/\D/g, "");

      if (!cleanPhone) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid phone number",
          },
          { status: 400 }
        );
      }

      const phone =
        cleanPhone.length > 10
          ? cleanPhone.slice(-10)
          : cleanPhone;

      member = await prisma.member.findUnique({
        where: {
          phone,
        },
      });
    } else {
      member = await prisma.member.findUnique({
        where: {
          email: normalizedValue,
        },
      });
    }

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: "Member not found",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // GENERATE + STORE OTP
    // =========================================================

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const otpExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await prisma.member.update({
      where: {
        id: member.id,
      },
      data: {
        otpCode: otp,
        otpExpiresAt,
      },
    });

    // =========================================================
    // SEND OTP ON BOTH CHANNELS
    // (regardless of whether the user entered phone or email)
    // =========================================================

    const memberPhone = member.phone
      ? String(member.phone).replace(/\D/g, "").slice(-10)
      : "";

    const [smsSent, emailSent] = await Promise.all([
      memberPhone.length === 10
        ? sendOtpSms(memberPhone, otp)
        : Promise.resolve(false),
      member.email
        ? sendOtpEmail(member.email, member.name, otp)
        : Promise.resolve(false),
    ]);

    // =========================================================
    // CHECK WHETHER AT LEAST ONE CHANNEL SUCCEEDED
    // =========================================================

    if (!smsSent && !emailSent) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send OTP",
          channels: {
            sms: false,
            email: false,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      channels: {
        sms: smsSent,
        email: emailSent,
      },
    });
  } catch (error) {
    console.error("SEND OTP ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}