import { calculateBMI } from "@/app/utils/helper";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    
    try {
        const assessment = await prisma.fitnessAssessment.findUnique({
            where: { id },
            include: {
                member: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        if (!assessment) {
            return Response.json(
                { success: false, error: "Assessment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: assessment });
    } catch (e) {
        console.error("Get assessment error:", e);
        return Response.json(
            { success: false, error: "Failed to get assessment" },
            { status: 500 }
        );
    }
};

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const {
        height,
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
    
        // New fields
        hba1c,
        bloodPressure,
        t3,
        t4,
        tsh,
    } = await req.json();
    const { id } = await params;
    
    try {
        const updateData: any = {};

        if (hba1c !== undefined) {
            updateData.hba1c = parseFloat(hba1c);
        }

        if (neck !== undefined) {
            updateData.neck = parseFloat(neck);
        }

        if (calf !== undefined) {
            updateData.calf = parseFloat(calf);
        }
        if (bloodPressure !== undefined) {
            updateData.bloodPressure = bloodPressure;
        }
        
        if (t3 !== undefined) {
            updateData.t3 = parseFloat(t3);
        }
        
        if (t4 !== undefined) {
            updateData.t4 = parseFloat(t4);
        }
        
        if (tsh !== undefined) {
            updateData.tsh = parseFloat(tsh);
        }
        
        
        if (weight !== undefined) {
            updateData.weight = parseFloat(weight);
            
            // Auto-calculate BMI if height is provided or use default
            if ( height || weight) {
                updateData.bmi = calculateBMI(parseFloat(weight), height);
            }
        }

        if (height !== undefined) {
            updateData.height = parseFloat(height);
            
            // Auto-calculate BMI if height is provided or use default
            if ( height || weight) {
                updateData.bmi = calculateBMI(parseFloat(weight), height);
            }
        }

        if (bodyFatPercentage !== undefined) {
            updateData.bodyFatPercentage = parseFloat(bodyFatPercentage);
        }

        if (chest !== undefined) {
            updateData.chest = parseFloat(chest);
        }

        if (waist !== undefined) {
            updateData.waist = parseFloat(waist);
        }

        if (hips !== undefined) {
            updateData.hips = parseFloat(hips);
        }

        if (biceps !== undefined) {
            updateData.biceps = parseFloat(biceps);
        }

        if (thighs !== undefined) {
            updateData.thighs = parseFloat(thighs);
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        if (assessmentDate !== undefined) {
            updateData.assessmentDate = new Date(assessmentDate);
        }

        const updatedAssessment = await prisma.fitnessAssessment.update({
            where: { id },
            data: updateData,
            include: {
                member: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        return NextResponse.json({ success: true, data: updatedAssessment });
    } catch (e) {
        console.error("Update assessment error:", e);
        return Response.json(
            { success: false, error: "Failed to update assessment" },
            { status: 500 }
        );
    }
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    
    try {
        await prisma.fitnessAssessment.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Assessment deleted successfully" });
    } catch (e) {
        console.error("Delete assessment error:", e);
        return Response.json(
            { success: false, error: "Failed to delete assessment" },
            { status: 500 }
        );
    }
};