import axios from "axios";
import { sendEmail } from "@/src/lib/services/email";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

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

    const normalizedValue =
      typeof value === "string"
        ? value.trim().toLowerCase()
        : value;

    // =========================================================
    // PHONE
    // =========================================================

    if (type === "PHONE") {
      const cleanPhone = normalizedValue.replace(/\D/g, "");

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

      const member = await prisma.member.findUnique({
        where: {
          phone,
        },
      });

      if (!member) {
        return NextResponse.json(
          {
            success: false,
            message: "Member not found",
          },
          { status: 404 }
        );
      }

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

      // =======================================================
      // SEND OTP VIA SMS
      // =======================================================

      let smsSent = false;

      try {
        const apiKey = process.env.APITXT_API_KEY;

        if (!apiKey) {
          throw new Error("APITXT_API_KEY is not configured");
        }

        await axios.get("https://apitxt.com/api/sendOTP", {
          params: {
            authkey: apiKey,
            mobile: `91${phone}`,
            otp,
          },
        });

        smsSent = true;
      } catch (error: any) {
        console.error(
          "SMS OTP ERROR:",
          error.response?.data || error.message
        );
      }

      // =======================================================
      // SEND OTP VIA EMAIL
      // =======================================================

      let emailSent = false;

      if (member.email) {
        try {
          await sendEmail({
            to: member.email.trim().toLowerCase(),
            templateId: 2,
            name: member.name,
            params: {
              otp,
              name: member.name,
            },
          });

          emailSent = true;
        } catch (error) {
          console.error("EMAIL OTP ERROR:", error);
        }
      }

      // =======================================================
      // CHECK WHETHER AT LEAST ONE CHANNEL SUCCEEDED
      // =======================================================

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
    }

    // =========================================================
    // EMAIL
    // =========================================================

    if (type === "EMAIL") {
      const member = await prisma.member.findUnique({
        where: {
          email: normalizedValue,
        },
      });

      if (!member) {
        return NextResponse.json(
          {
            success: false,
            message: "Member not found",
          },
          { status: 404 }
        );
      }

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

      try {
        await sendEmail({
          to: member.email.trim().toLowerCase(),
          templateId: 2,
          name: member.name,
          params: {
            otp,
            name: member.name,
          },
        });
      } catch (error) {
        console.error("EMAIL OTP ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: "Failed to send OTP email",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully to email",
        channels: {
          sms: false,
          email: true,
        },
      });
    }

    // =========================================================
    // INVALID TYPE
    // =========================================================

    return NextResponse.json(
      {
        success: false,
        message: "Invalid type",
      },
      { status: 400 }
    );
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