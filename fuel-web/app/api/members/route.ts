import { generateReferralCode } from "@/app/utils/helper";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {

  const {
    name,
    phone,
    email,
    branchId,
    dob,
    profileImage,
    emergencyContact,
    gender,
    address,
    age,
    height,
    weight,
  } = await req.json();

  // 🔥 normalize email
  const normalizedEmail =
    typeof email === "string"
      ? email.trim().toLowerCase()
      : "";

  // 🔥 normalize phone
  const normalizedPhone =
    typeof phone === "string"
      ? phone.replace(/\D/g, "").slice(-10)
      : null;

  // 🔥 normalize emergency contact
  const normalizedEmergencyContact =
    typeof emergencyContact === "string"
      ? emergencyContact.replace(/\D/g, "").slice(-10)
      : null;

  if (!name || !normalizedPhone || !branchId) {
    return NextResponse.json({
      success: false,
      message: "name, phone, branchId is required",
    });
  }

  try {

    // 🔥 check existing phone
    const existingPhone = await prisma.member.findUnique({
      where: {
        phone: normalizedPhone,
      },
    });

    if (existingPhone) {
      return NextResponse.json({
        success: false,
        message: "Phone number already exists",
      });
    }

    // 🔥 check existing email
    if (normalizedEmail) {

      const existingEmail =
        await prisma.member.findUnique({
          where: {
            email: normalizedEmail,
          },
        });

      if (existingEmail) {
        return NextResponse.json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // 🔥 create member
    await prisma.member.create({
      data: {
        name: name.trim(),

        dob: dob || null,
        referralCode: generateReferralCode(name),
        profileImage:
          profileImage || null,

        emergencyContact:
          normalizedEmergencyContact,

        gender: gender || null,

        address:
          typeof address === "string"
            ? address.trim()
            : null,

        email: normalizedEmail,
        age: age ? parseInt(age) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,

        phone: normalizedPhone,

        branchId,
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (e) {

    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const GET = async () => {

  try {

    const members = await prisma.member.findMany({
      include: {
        subscriptions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const enriched = members.map((m) => {

      const sub = m.subscriptions[0];

      let status = "NONE";

      if (sub) {

        const now = new Date();

        const isExpired =
          new Date(sub.endDate) <= now;

        if (sub.status === "FROZEN") {
          status = "FROZEN";
        }

        else if (sub.status === "CANCELLED") {
          status = "CANCELLED";
        }

        else if (!isExpired) {
          status = "ACTIVE";
        }

        else {
          status = "EXPIRED";
        }
      }

      return {
        ...m,
        currentStatus: status,
        currentPlan: sub?.packageId || null,
        endDate: sub?.endDate || null,
      };
    });

    return NextResponse.json({
      success: true,
      members: enriched,
    });

  } catch (e) {

    console.log(e);

    return NextResponse.json({
      success: false,
    });
  }
};