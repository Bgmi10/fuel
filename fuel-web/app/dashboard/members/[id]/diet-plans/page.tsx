"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Apple,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Flame,
  CheckCircle2,
  Book,
} from "lucide-react";

type DietPlan = {
  id: string;
  title: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count: {
    meals: number;
  };
};

export default function MemberDietPlansPage() {
  const { id: memberId } = useParams();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<DietPlan[]>([]);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/diet-plans?memberId=${memberId}`
      );

      const data = await res.json();

      setPlans(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchPlans();
    }
  }, [memberId]);

  const handleDelete = async (planId: string) => {
    const confirmDelete = confirm(
      "Delete this diet plan?"
    );

    if (!confirmDelete) return;

    await fetch(`/api/diet-plans/${planId}`, {
      method: "DELETE",
    });

    fetchPlans();
  };

  const handleActivate = async (planId: string) => {
    await fetch(
      `/api/diet-plans/${planId}/activate`,
      {
        method: "POST",
      }
    );

    fetchPlans();
  };

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Apple className="text-lime-400" />
            Diet Plans
          </h1>

          <p className="text-neutral-400 mt-1">
            Manage diet plans for this member
          </p>
        </div>

        <div className="flex gap-2 items-center">
        <Link
          href={`/dashboard/members/${memberId}/diet-plans/create`}
          className="h-11 px-5 rounded-xl bg-lime-400 text-black font-semibold flex items-center gap-2"
        >
          <Plus size={16} />
          Create Plan
        </Link>
        
        <Link
          href={`/dashboard/members/${memberId}/diet-plans/memberlogs`}
          className="h-11 px-5 rounded-xl bg-lime-400 text-black font-semibold flex items-center gap-2"
        >
          <Book size={16} />
          View Member Logs  
        </Link>  
        </div>

        
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-neutral-400">
          Loading diet plans...
        </div>
      )}

      {/* Empty */}
      {!loading && plans.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
          <Apple
            size={50}
            className="mx-auto mb-4 text-neutral-600"
          />

          <h3 className="text-xl font-semibold">
            No Diet Plans
          </h3>

          <p className="text-neutral-500 mt-2">
            Create the first diet plan for this member.
          </p>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">
                    {plan.title}
                  </h2>

                  {plan.isActive && (
                    <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  )}
                </div>

                {/* Macros */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-neutral-800 rounded-xl px-3 py-2">
                    <span className="text-lime-400 font-semibold">
                      {plan.targetCalories.toFixed(1)}
                    </span>{" "}
                    Cal
                  </div>

                  <div className="bg-neutral-800 rounded-xl px-3 py-2">
                    P {plan.targetProtein.toFixed(1)}g
                  </div>

                  <div className="bg-neutral-800 rounded-xl px-3 py-2">
                    C {plan.targetCarbs.toFixed(1)}g
                  </div>

                  <div className="bg-neutral-800 rounded-xl px-3 py-2">
                    F {plan.targetFat.toFixed(1)}g
                  </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-5 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(
                      plan.startDate
                    ).toLocaleDateString()}
                    {" - "}
                    {new Date(
                      plan.endDate
                    ).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    <Flame size={14} />
                    {plan._count.meals} Meals
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!plan.isActive && (
                  <button
                    onClick={() =>
                      handleActivate(plan.id)
                    }
                    className="h-10 px-4 rounded-xl border border-green-500/40 text-green-400 hover:bg-green-500/10"
                  >
                    Set Active
                  </button>
                )}

                <Link
                  href={`/dashboard/members/${memberId}/diet-plans/${plan.id}/edit`}
                  className="h-10 px-3 rounded-xl border border-neutral-700 flex items-center justify-center"
                >
                  <Pencil size={15} />
                </Link>

                <button
                  onClick={() =>
                    handleDelete(plan.id)
                  }
                  className="h-10 px-3 rounded-xl border border-red-500/40 text-red-400"
                >
                  <Trash2 size={15} />
                </button>


                <Link
                  href={`/dashboard/members/${memberId}/diet-plans/${plan.id}/detail`}
                  className="h-10 px-3 rounded-xl border border-neutral-700 flex items-center justify-center"
                >
                  View Detail
                </Link>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}