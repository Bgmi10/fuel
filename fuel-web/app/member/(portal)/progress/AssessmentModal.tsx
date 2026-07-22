"use client";

import { useState, useEffect } from "react";
import { calculateBMI } from "@/app/utils/helper";
import { X, Calculator } from "lucide-react";
import { FitnessAssessment } from "@prisma/client";

interface AssessmentModalProps {
  memberId: string;
  assessment?: FitnessAssessment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssessmentModal({
  memberId,
  assessment,
  onClose,
  onSuccess,
}: AssessmentModalProps) {
  const [formData, setFormData] = useState({
    weight: assessment?.weight?.toString() || "",
    height: assessment?.height?.toString() || "",
    bmi: assessment?.bmi?.toString() || "",
    bodyFatPercentage: assessment?.bodyFatPercentage?.toString() || "",
    chest: assessment?.chest?.toString() || "",
    waist: assessment?.waist?.toString() || "",
    hips: assessment?.hips?.toString() || "",
    biceps: assessment?.biceps?.toString() || "",
    thighs: assessment?.thighs?.toString() || "",
  
    neck: assessment?.neck?.toString() || "",
    calf: assessment?.calf?.toString() || "",
    // New fields
    hba1c: assessment?.hba1c?.toString() || "",
    bloodPressure: assessment?.bloodPressure || "",
    t3: assessment?.t3?.toString() || "",
    t4: assessment?.t4?.toString() || "",
    tsh: assessment?.tsh?.toString() || "",
  
    memberNotes: assessment?.memberNotes || "",
  
    assessmentDate: assessment?.assessmentDate
      ? new Date(assessment.assessmentDate).toISOString().split("T")[0]
      : "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate BMI when weight or height changes
  useEffect(() => {
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height);
      
      if (!isNaN(weight) && !isNaN(height) && weight > 0 && height > 0) {
        const calculatedBMI = calculateBMI(weight, height);
        setFormData(prev => ({ ...prev, bmi: calculatedBMI.toString() }));
      }
    }
  }, [formData.weight, formData.height]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const payload = {
        memberId,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        bodyFatPercentage: formData.bodyFatPercentage
          ? parseFloat(formData.bodyFatPercentage)
          : undefined,
        neck: formData.neck ? parseFloat(formData.neck) : undefined,
        calf: formData.calf ? parseFloat(formData.calf) : undefined,
        chest: formData.chest ? parseFloat(formData.chest) : undefined,
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        biceps: formData.biceps ? parseFloat(formData.biceps) : undefined,
        thighs: formData.thighs ? parseFloat(formData.thighs) : undefined,
      
        // New fields
        hba1c: formData.hba1c
          ? parseFloat(formData.hba1c)
          : undefined,
      
        bloodPressure: formData.bloodPressure || undefined,
      
        t3: formData.t3
          ? parseFloat(formData.t3)
          : undefined,
      
        t4: formData.t4
          ? parseFloat(formData.t4)
          : undefined,
      
        tsh: formData.tsh
          ? parseFloat(formData.tsh)
          : undefined,
      
        assessmentDate: formData.assessmentDate || undefined,
        memberNotes: formData.memberNotes ?? "",
      };


      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save assessment');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-6 rounded-2xl w-[500px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {assessment ? "Edit" : "Add"} Assessment
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Measurements */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                placeholder="e.g., 70"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                placeholder="e.g., 170"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
              />
            </div>
          </div>

          {/* BMI Display */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              BMI (Auto-calculated)
            </label>
            <div className="flex items-center space-x-2">
              <Calculator className="text-lime-400" size={16} />
              <input
                type="text"
                value={formData.bmi}
                readOnly
                className="flex-1 p-3 bg-neutral-700 text-lime-400 rounded-lg border border-neutral-600 font-semibold"
                placeholder="Will auto-calculate"
              />
            </div>
          </div>

          {/* Body Fat */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Body Fat Percentage (%)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g., 15.5"
              value={formData.bodyFatPercentage}
              onChange={(e) => handleInputChange('bodyFatPercentage', e.target.value)}
              className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
            />
          </div>


{/* Health Assessment */}
<div>


  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        HbA1c
      </label>
      <input
        type="number"
        step="0.1"
        value={formData.hba1c}
        onChange={(e) => handleInputChange("hba1c", e.target.value)}
        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        Blood Pressure
      </label>
      <input
        type="text"
        placeholder="120/80"
        value={formData.bloodPressure}
        onChange={(e) =>
          handleInputChange("bloodPressure", e.target.value)
        }
        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        T3
      </label>
      <input
        type="number"
        step="0.1"
        value={formData.t3}
        onChange={(e) => handleInputChange("t3", e.target.value)}
        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        T4
      </label>
      <input
        type="number"
        step="0.1"
        value={formData.t4}
        onChange={(e) => handleInputChange("t4", e.target.value)}
        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
      />
    </div>

    <div className="col-span-2">
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        TSH
      </label>
      <input
        type="number"
        step="0.1"
        value={formData.tsh}
        onChange={(e) => handleInputChange("tsh", e.target.value)}
        className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
      />
    </div>
  </div>
</div>

          {/* Body Measurements */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Body Measurements (cm)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Chest
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 95"
                  value={formData.chest}
                  onChange={(e) => handleInputChange('chest', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Waist
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 80"
                  value={formData.waist}
                  onChange={(e) => handleInputChange('waist', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Hips
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 90"
                  value={formData.hips}
                  onChange={(e) => handleInputChange('hips', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Biceps
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 30"
                  value={formData.biceps}
                  onChange={(e) => handleInputChange('biceps', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Thighs
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 55"
                  value={formData.thighs}
                  onChange={(e) => handleInputChange('thighs', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Neck
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 30"
                  value={formData.neck}
                  onChange={(e) => handleInputChange('neck', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Calf
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 30"
                  value={formData.calf}
                  onChange={(e) => handleInputChange('calf', e.target.value)}
                  className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
                />
              </div>
            
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Personal Notes
            </label>
            <textarea
              placeholder="Additional notes about the assessment..."
              value={formData.memberNotes}
              onChange={(e) => handleInputChange('memberNotes', e.target.value)}
              rows={3}
              className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none resize-none"
            />
          </div>
          <div>
  <label className="block text-sm font-medium text-neutral-300 mb-1">
    Assessment Date
  </label>
  <input
    type="date"
    value={formData.assessmentDate}
    onChange={(e) => handleInputChange("assessmentDate", e.target.value)}
    className="w-full p-3 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-lime-400 focus:outline-none"
  />
</div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-neutral-400 hover:text-white border border-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Assessment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}