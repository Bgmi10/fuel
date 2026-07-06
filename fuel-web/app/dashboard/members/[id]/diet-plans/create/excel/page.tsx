"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import DietPlanForm from "../manual/page";
import { useRouter } from "next/navigation";

export default function ExcelDietPlanPage() {
  const [plan, setPlan] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const router = useRouter();


  const parseExcelDate = (value: any) => {
    if (!value) return "";
  
    // Excel serial date
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
  
      return `${date.y}-${String(
        date.m
      ).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }
  
    const str = String(value).trim();
  
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
  
    // dd/mm/yyyy OR dd/mm/yy
    if (str.includes("/")) {
      const parts = str.split("/");
  
      if (parts.length === 3) {
        let [a, b, c] = parts;
  
        // handle 6/20/26 (US format)
        if (Number(a) <= 12 && Number(b) > 12) {
          const year =
            c.length === 2
              ? `20${c}`
              : c;
  
          return `${year}-${String(
            a
          ).padStart(2, "0")}-${String(
            b
          ).padStart(2, "0")}`;
        }
  
        // handle 20/06/2026
        const year =
          c.length === 2
            ? `20${c}`
            : c;
  
        return `${year}-${String(
          b
        ).padStart(2, "0")}-${String(
          a
        ).padStart(2, "0")}`;
      }
    }
  
    // fallback
    const date = new Date(str);
  
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  
    return "";
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const buffer =
      await file.arrayBuffer();

    const workbook = XLSX.read(
      buffer,
      {
        type: "array",
      }
    );

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];

    const rows: string[] =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          header: 1,
          raw: false,
        }
      );


      
    const parsedPlan = {
  title: rows[0]?.[1] || "",
  instructions: "",

  targetCalories:
    Number(rows[1]?.[1]) || 0,

  targetProtein:
    Number(rows[2]?.[1]) || 0,

  targetCarbs:
    Number(rows[3]?.[1]) || 0,

  targetFat:
    Number(rows[4]?.[1]) || 0,

  startDate: parseExcelDate(
    rows[5]?.[1]
  ),

  endDate: parseExcelDate(
    rows[6]?.[1]
  ),
};

    const mealMap = new Map();

    const foodTableStartIndex = rows.findIndex(
        (row: any) =>
          String(row?.[0] || "")
            .trim()
            .toLowerCase() === "meal"
      );
      
      if (foodTableStartIndex === -1) {
        throw new Error(
          "Could not find food table header"
        );
      }
      
      rows
        .slice(foodTableStartIndex + 1)
        .filter(
          (row: any) =>
            row.some(
              (cell: any) =>
                cell !== undefined &&
                cell !== null &&
                cell !== ""
            )
        )
        .forEach((row: any) => {
            const mealName = row[0];
    
            if (
              !mealMap.has(mealName)
            ) {
              mealMap.set(
                mealName,
                {
                  id:
                    crypto.randomUUID(),
                  name: mealName,
                  foods: [],
                }
              );
            }
    
            mealMap
              .get(mealName)
              .foods.push({
                id:
                  crypto.randomUUID(),
    
                foodId: null,
    
                foodName: row[1],
    
                quantity:
                  Number(row[2]),
    
                servingUnit:
                  row[3],
    
                servingValue:
                  Number(row[2]),
    
                calories:
                  Number(row[4]),
    
                protein:
                  Number(row[5]),
    
                carbs:
                  Number(row[6]),
    
                fat:
                  Number(row[7]),
              });
          });


    setPlan(parsedPlan);

    setMeals(
      Array.from(
        mealMap.values()
      )
    );
  };

  if (plan) {
    return (
      <DietPlanForm
        mode="create"
        initialPlan={plan}
        initialMeals={meals}
      />
    );
  }

  return (
    <div className="p-6 text-white">
      <div className="max-w-2xl mx-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">

        <button
            onClick={() => router.back()}
            className="text-neutral-400 hover:text-white mb-3"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-2">
            Upload Diet Plan Excel
          </h1>

          <p className="text-neutral-400 mb-6">
            Upload trainer diet plan
            template and we'll populate
            the form automatically.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpload}
            className="w-fit bg-lime-400 px-4  p-2 rounded-xl text-black cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}