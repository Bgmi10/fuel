import { prisma } from "@/prisma"
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
  try {
    const branches = await prisma.branch.findMany({});

    return NextResponse.json({ success: true, branches });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ success: false })
  }
}

export const POST = async (req: NextRequest) => {
  const { name, phone, address, terms, gstNumber, supportEmail, supportPhone } = await req.json();

  if (!name || !phone || !address || !terms || !gstNumber) {
    return NextResponse.json({ success: false, message: "name, phone, address, terms, gstnumber is required fields"});
  }

  try {
    await prisma.branch.create({
      data: {
         name,
         phone,
         address,
         terms,
         gstNumber,
         supportEmail,
         supportPhone: supportPhone ?? phone,
      } 
    })

    return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ success: false })
    }
}
