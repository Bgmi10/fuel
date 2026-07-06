import { prisma } from "@/prisma";
import { Branch } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ success: false, message: 'id is required' });
    }

    try {
        await prisma.branch.delete({ where: { id }})
    return NextResponse.json({ success: true });

    }   catch (e) {
        return NextResponse.json({ success: false })
      } 
}

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;
    const { name, phone, address, supportEmail, supportPhone, gstNumber, terms } = await req.json();
    

    
    if (!id) {
        return NextResponse.json({ success: false, message: 'id is required' });
    }


    const updateData: Partial<Branch>= {};

    if (name !== undefined) {
        updateData.name = name;
    }

    if (phone !== undefined) {
        updateData.phone = phone;
    }

    if (address !==undefined) {
      updateData.address = address
    }

    if (supportEmail !== undefined) {
        updateData.supportEmail = supportEmail;
    }

    if (supportPhone !== undefined) {
        updateData.supportPhone = supportPhone;
    }

    if (gstNumber !== undefined) {
        updateData.gstNumber = gstNumber;
    }

    if (terms !== undefined) {
        updateData.terms = terms;
    }

    if (!id) {
        return NextResponse.json({ success: false, message: 'id is required' });
    }

    try {
        await prisma.branch.update({
            where: { id },
            data: updateData
        })
    return NextResponse.json({ success: true });
}   catch (e) {
    return NextResponse.json({ success: false })
  } 

}

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ success: false, message: 'id is required' });
    }

    try {
        const branch = await prisma.branch.findUnique({ where: { id }});

        return NextResponse.json({ success: true, branch })
    } catch (e) {
        return NextResponse.json({ success: false })
      } 
    
}