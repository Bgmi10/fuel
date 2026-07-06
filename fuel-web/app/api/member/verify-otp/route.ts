import { createMemberToken, setMemberAuthCookie } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const { otp, email, phone } = await req.json();

  try {
    // 🔥 find member
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          {
            email: email || undefined,
          },
          {
            phone: phone || undefined,
          },
        ],
      },
    });

    if (!member) {
      return NextResponse.json({
        success: false,
        message: "Member not found",
      });
    }

    // 🔥 invalid otp
    if (otp !== member.otpCode) {
      return NextResponse.json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // 🔥 otp expiry check
    if (
      !member.otpExpiresAt ||
      new Date(member.otpExpiresAt) < new Date()
    ) {
      return NextResponse.json({
        success: false,
        message: "OTP expired",
      });
    }

    // 🔥 create token
    const token = await createMemberToken({
      id: member.id,
      email: member.email,
      phone: member.phone,
      name: member.name,
    });

    // 🔥 set cookie
    await setMemberAuthCookie(token);

    // 🔥 clear otp after success
    await prisma.member.update({
      where: {
        id: member.id,
      },
      data: {
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    const profileFilled = Boolean(
      member.dob &&
      member.gender &&
      member.emergencyContact &&
      member.profileImage &&
      member.address
    );

    
    return NextResponse.json({
      success: true,
      message: "Login successful",
      member,
      token,
      profileFilled
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Something went wrong",
    });
  }
};