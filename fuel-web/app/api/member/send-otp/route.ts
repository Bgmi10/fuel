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
      // EMAIL ONLY
      // =======================================================

      if (!member.email) {
        return NextResponse.json(
          {
            success: false,
            message: "Member does not have an email address",
          },
          { status: 400 }
        );
      }

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