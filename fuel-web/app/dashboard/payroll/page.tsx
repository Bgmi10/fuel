"use client";

import { useState } from "react";

const PayrollPage = () => {
  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const [year, setYear] = useState(
    new Date().getFullYear()
  );

  const [loading, setLoading] =
    useState(false);

  const handleGeneratePayroll =
    async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/payroll",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              month,
              year,
            }),
          }
        );

        const data = await res.json();

        if (!data.success) {
          alert(data.message);
          return;
        }

        alert(
          `${data.count} payrolls generated`
        );
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">
          Payroll Generation
        </h1>

        <p className="text-neutral-400">
          Generate payroll from
          attendance.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

        <div className="grid md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm text-neutral-400 mb-2">
              Month
            </label>

            <select
              value={month}
              onChange={(e) =>
                setMonth(
                  Number(e.target.value)
                )
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
            >
              {Array.from(
                { length: 12 },
                (_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                  >
                    {i + 1}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">
              Year
            </label>

            <input
              type="number"
              value={year}
              onChange={(e) =>
                setYear(
                  Number(e.target.value)
                )
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
            />
          </div>

        </div>

        <button
          onClick={handleGeneratePayroll}
          disabled={loading}
          className="mt-6 px-6 py-3 bg-lime-400 rounded-xl text-black font-semibold"
        >
          {loading
            ? "Generating..."
            : "Generate Payroll"}
        </button>

      </div>

    </div>
  );
};

export default PayrollPage;