"use client";

import { FileSpreadsheet, Apple } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function CreateDietPlanPage() {
  const router = useRouter();
  const { id } = useParams();
  

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
        <button
            onClick={() => router.back()}
            className="text-neutral-400 hover:text-white mb-3"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold">
            Create Diet Plan
          </h1>

          <p className="text-neutral-400 mt-2">
            Choose how you'd like to build the diet plan.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Excel */}
          <button
            onClick={() =>
              router.push(
                `/dashboard/members/${id}/diet-plans/create/excel`
              )
            }
            className="
              group
              bg-neutral-900
              border
              border-neutral-800
              rounded-3xl
              p-8
              text-left
              transition-all
              hover:border-lime-400
              hover:-translate-y-1
            "
          >
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 flex items-center justify-center mb-5">
              <FileSpreadsheet
                className="text-lime-400"
                size={30}
              />
            </div>

            <h2 className="text-xl font-semibold mb-2">
              Upload Excel Template
            </h2>

            <p className="text-neutral-400">
              Import a pre-built diet plan using the
              trainer spreadsheet format. Meals and
              foods will be automatically populated.
            </p>

            <div className="mt-5 text-lime-400 text-sm">
              Recommended for trainers →
            </div>
          </button>

          {/* Manual */}
          <button
            onClick={() =>
              router.push(
                `/dashboard/members/${id}/diet-plans/create/manual`
              )
            }
            className="
              group
              bg-neutral-900
              border
              border-neutral-800
              rounded-3xl
              p-8
              text-left
              transition-all
              hover:border-lime-400
              hover:-translate-y-1
            "
          >
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 flex items-center justify-center mb-5">
              <Apple
                className="text-lime-400"
                size={30}
              />
            </div>

            <h2 className="text-xl font-semibold mb-2">
              Build Manually
            </h2>

            <p className="text-neutral-400">
              Search foods from the nutrition database
              and create meals manually with calorie
              and macro tracking.
            </p>

            <div className="mt-5 text-lime-400 text-sm">
              Manual creation →
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}