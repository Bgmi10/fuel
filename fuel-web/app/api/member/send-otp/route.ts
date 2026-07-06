import { sendEmail } from "@/app/services/email";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const POST = async (req: NextRequest) => {
  const { type, value } = await req.json();

  try {

    // 🔥 normalize input
    const normalizedValue =
      typeof value === "string"
        ? value.trim().toLowerCase()
        : value;

    // =========================================================
    // 🔥 PHONE FLOW
    // =========================================================
    if (type === "PHONE") {

      const cleanPhone = normalizedValue.replace(/\D/g, "");

      const phone =
        cleanPhone.length > 10
          ? cleanPhone.slice(cleanPhone.length - 10)
          : cleanPhone;

      if (!cleanPhone) {
        return NextResponse.json({
          success: false,
          message: "Invalid phone number",
        });
      }

      // 🔥 find member using phone
      const member = await prisma.member.findUnique({
        where: {
          phone,
        },
      });

      if (!member) {
        return NextResponse.json({
          success: false,
          message: "Member not found",
        });
      }

      // 🔥 generate otp
      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // 🔥 expiry
      const otpExpiresAt = new Date(
        Date.now() + 5 * 60 * 1000
      );

      // 🔥 store otp
      await prisma.member.update({
        where: {
          id: member.id,
        },
        data: {
          otpCode: otp,
          otpExpiresAt,
        },
      });

      // 🔥 send SMS
      await client.messages.create({
        body: `${otp} is your Fuel Gym verification code.
@fuelgym1.com #${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: `+${cleanPhone}`,
        messagingServiceSid:
          "MG0c83fe3312b32300c2ef4ad2075e5ad7",
      });

      // 🔥 send Email ALSO
      if (member.email) {
        await sendEmail({
          to: member.email.trim().toLowerCase(),
          templateId: 2,
          name: member.name,
          params: {
            otp,
            name: member.name,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message:
          "OTP sent to phone and email successfully",
      });
    }

    // =========================================================
    // 🔥 EMAIL FLOW
    // =========================================================
    if (type === "EMAIL") {

      // 🔥 find member using normalized email
      const member = await prisma.member.findUnique({
        where: {
          email: normalizedValue,
        },
      });

      if (!member) {
        return NextResponse.json({
          success: false,
          message: "Member not found",
        });
      }

      // 🔥 generate otp
      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // 🔥 expiry
      const otpExpiresAt = new Date(
        Date.now() + 5 * 60 * 1000
      );

      // 🔥 store otp
      await prisma.member.update({
        where: {
          id: member.id,
        },
        data: {
          otpCode: otp,
          otpExpiresAt,
        },
      });

      // 🔥 send Email
      await sendEmail({
        to: member.email.trim().toLowerCase(),
        templateId: 2,
        name: member.name,
        params: {
          otp,
          name: member.name,
        },
      });

      // 🔥 send SMS ALSO
      if (member.phone) {
        await client.messages.create({
          body: `${otp} is your Fuel Gym verification code.

@fuelgym1.com #${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: `+91${member.phone}`,
          messagingServiceSid:
            "MG0c83fe3312b32300c2ef4ad2075e5ad7",
        });
      }

      return NextResponse.json({
        success: true,
        message:
          "OTP sent to email and phone successfully",
      });
    }

    // =========================================================
    // 🔥 INVALID TYPE
    // =========================================================
    return NextResponse.json({
      success: false,
      message: "Invalid type",
    });

  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: true,
      message: "Something went wrong",
    });
  }
};