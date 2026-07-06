import { prisma } from "@/prisma";
import { Setting } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;
    const { cgstPercentage, sgstPercentage, referralRewardAmount, referralRewardPercentage, referralMembershipDays, referralRewardType } = await req.json();
    
    const updateData: Partial<Setting> = {};

    if (cgstPercentage !== undefined) {
        updateData.cgstPercentage = cgstPercentage;
    }
    

    if (referralRewardAmount !== undefined) {
        updateData.referralRewardAmount = referralRewardAmount * 100;
    }
    if (referralRewardPercentage !== undefined) {
        updateData.referralRewardPercentage = referralRewardPercentage;
    }
    if (referralMembershipDays !== undefined) {
        updateData.referralMembershipDays = referralMembershipDays;
    }
    if (referralRewardType !== undefined) {
        updateData.referralRewardType = referralRewardType;
    }
    if (sgstPercentage !== undefined) {
        updateData.sgstPercentage = sgstPercentage;
    }

    if (!id) {
        return NextResponse.json({ success: false, message: "id is required" });
    }


    try {
        await prisma.setting.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
} 