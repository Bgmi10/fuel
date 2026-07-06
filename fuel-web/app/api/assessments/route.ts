import { calculateBMI } from "@/app/utils/helper";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    
    try {
        const where = memberId ? { memberId } : {};
        
        const assessments = await prisma.fitnessAssessment.findMany({
            where,
            include: {
                member: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            },
            orderBy: {
                assessmentDate: "desc"
            }
        });

        return NextResponse.json({ success: true, data: assessments });
    } catch (e) {
        return Response.json(
            {
                success: false,
            },
            {
                status: 500,
            }
        );
    }
};

export const POST = async (req: NextRequest) => {
    const {
        height,
        memberId,
        weight,
        bodyFatPercentage,
        chest,
        waist,
        hips,
        neck,
        calf,
        biceps,
        thighs,
        notes,
        assessmentDate,
        memberNotes,
    
        // New Assessment Fields
        hba1c,
        bloodPressure,
        t3,
        t4,
        tsh,
    } = await req.json();
    try {
        // Get member's height from profile to calculate BMI
        const member = await prisma.member.findUnique({
            where: { id: memberId }
        });

        let bmi = null;
        if (weight && height) {
            bmi = calculateBMI(weight, height);
        }

        const assessment = await prisma.fitnessAssessment.create({
            data: {
                memberId,
                weight: weight ? parseFloat(weight) : null,
                bodyFatPercentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : null,
                chest: chest ? parseFloat(chest) : null,
                waist: waist ? parseFloat(waist) : null,
                hips: hips ? parseFloat(hips) : null,
                neck: neck ? parseFloat(neck) : null,
                calf: calf ? parseFloat(calf) : null,
                biceps: biceps ? parseFloat(biceps) : null,
                thighs: thighs ? parseFloat(thighs) : null,
                bmi,
                notes,
                height,
        
                // New Assessment Fields
                hba1c: hba1c ? parseFloat(hba1c) : null,
                bloodPressure: bloodPressure || null,
                t3: t3 ? parseFloat(t3) : null,
                t4: t4 ? parseFloat(t4) : null,
                tsh: tsh ? parseFloat(tsh) : null,
        
                assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
                memberNotes,
            },
            include: {
                member: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        return NextResponse.json({ success: true, data: assessment });
    } catch (e) {
        console.error("Assessment creation error:", e);
        return Response.json(
            {
                success: false,
                error: "Failed to create assessment"
            },
            {
                status: 500,
            }
        );
    }
}; 