import { calculateDifference } from "@/app/utils/helper";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    
    if (!memberId) {
        return Response.json(
            { success: false, error: "Member ID is required" },
            { status: 400 }
        );
    }
    
    try {
        const assessments = await prisma.fitnessAssessment.findMany({
            where: { memberId },
            orderBy: {
                assessmentDate: "desc"
            },
            take: 2,
            include: {
                member: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        if (assessments.length < 2) {
            return NextResponse.json({
                success: true,
                data: {
                    current: assessments[0] || null,
                    previous: null,
                    comparison: null,
                    message: "Need at least 2 assessments for comparison"
                }
            });
        }

        const [current, previous] = assessments;
        
        const comparison = {
            weight: current.weight && previous.weight ? 
                calculateDifference(current.weight, previous.weight) : null,
            bmi: current.bmi && previous.bmi ? 
                calculateDifference(current.bmi, previous.bmi) : null,
            neck: current.neck && previous.neck ? 
                calculateDifference(current.neck, previous.neck) : null,
            calf: current.calf && previous.calf ? 
                calculateDifference(current.calf, previous.calf) : null,
            bodyFat: current.bodyFatPercentage && previous.bodyFatPercentage ? 
                calculateDifference(current.bodyFatPercentage, previous.bodyFatPercentage) : null,
            chest: current.chest && previous.chest ? 
                calculateDifference(current.chest, previous.chest) : null,
            waist: current.waist && previous.waist ? 
                calculateDifference(current.waist, previous.waist) : null,
            hips: current.hips && previous.hips ? 
                calculateDifference(current.hips, previous.hips) : null,
            biceps: current.biceps && previous.biceps ? 
                calculateDifference(current.biceps, previous.biceps) : null,
            thighs: current.thighs && previous.thighs ? 
                calculateDifference(current.thighs, previous.thighs) : null,
        };

        return NextResponse.json({
            success: true,
            data: {
                current,
                previous,
                comparison,
                member: current.member
            }
        });
    } catch (e) {
        console.error("Assessment comparison error:", e);
        return Response.json(
            { success: false, error: "Failed to get assessment comparison" },
            { status: 500 }
        );
    }
};