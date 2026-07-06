"use client";
import { Payroll } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const page = () => {

    const { id } = useParams();

    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    
    const [employeeId, setEmployeeId] = useState("");
    
    const [selected, setSelected] =
      useState<Payroll | null>(null);
    
    const [openCreate, setOpenCreate] =
      useState(false);
    
    const [openEdit, setOpenEdit] =
      useState(false);
    
      const [filterMonth, setFilterMonth] = useState("");
      const [filterYear, setFilterYear] = useState("");
    
      const [payrollForm, setPayrollForm] = useState({
        month: "",
        year: "",
        basicSalary: "",
        incentive: "",
        deduction: "",
        advanceDeduction: "",
        paidMethod: "CASH",
      });

      const fetchPayrolls = async () => {
        try {
          const res = await fetch(`/api/users/${id}`);
      
          const data = await res.json();
      
          setPayrolls(
            data.user.employee?.payrolls || []
          );
      
          setEmployeeId(
            data.user.employee?.id || ""
          );
        } catch (error) {
          console.log(error);
        }
      };
      
      useEffect(() => {
        fetchPayrolls();
      }, []);

      const filteredPayrolls = useMemo(() => {
        return payrolls.filter((payroll) => {
          const monthMatch =
            !filterMonth ||
            payroll.month === Number(filterMonth);
      
          const yearMatch =
            !filterYear ||
            payroll.year === Number(filterYear);
      
          return monthMatch && yearMatch;
        });
      }, [payrolls, filterMonth, filterYear]);


      const calculateNetSalary = () => {
        return (
          Number(payrollForm.basicSalary) +
          Number(payrollForm.incentive || 0) -
          Number(payrollForm.deduction || 0) -
          Number(
            payrollForm.advanceDeduction || 0
          )
        );
      };


      const handleCreatePayroll = async () => {
        try {
          const payload = {
            employeeId,
            month: Number(payrollForm.month),
            year: Number(payrollForm.year),
            basicSalary: Number(payrollForm.basicSalary),
            incentive: Number(payrollForm.incentive || 0),
            deduction: Number(payrollForm.deduction || 0),
            advanceDeduction: Number(
              payrollForm.advanceDeduction || 0
            ),
            netSalary: calculateNetSalary(),
            paidMethod: payrollForm.paidMethod,
          };
          const res = await fetch(
            `/api/users/${id}/payroll`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
      
          const data = await res.json();
      
          if (!data.success) {
            alert(data.message);
            return;
          }
      
          alert("Payroll created");
      
          setOpenCreate(false);
      
          fetchPayrolls();
        } catch (error) {
          console.log(error);
        }
      };


      const handleUpdatePayroll = async () => {
        if (!selected) return;
      
        try {
          const payload = {
            employeeId,
            month: Number(payrollForm.month),
            year: Number(payrollForm.year),
            basicSalary: Number(payrollForm.basicSalary),
            incentive: Number(payrollForm.incentive || 0),
            deduction: Number(payrollForm.deduction || 0),
            advanceDeduction: Number(
              payrollForm.advanceDeduction || 0
            ),
            netSalary: calculateNetSalary(),
            paidMethod: payrollForm.paidMethod,
          };
      
          const res = await fetch(
            `/api/users/${id}/payroll/${selected.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
      
          const data = await res.json();
      
          if (!data.success) {
            alert(data.message);
            return;
          }
      
          alert("Payroll updated");
      
          setOpenEdit(false);
      
          fetchPayrolls();
        } catch (error) {
          console.log(error);
        }
      };

      
    return (
      <div className="space-y-6">
    
        <div className="flex items-center justify-between">
    
          <h1 className="text-2xl font-bold text-white">
            Payroll
          </h1>
    
          <button
            onClick={() => setOpenCreate(true)}
            className="px-4 py-2 bg-lime-400 text-black rounded-xl font-medium"
          >
            Create Payroll
          </button>
    
        </div>
    
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
    
          <div className="flex gap-4">
    
           <select
  value={filterMonth}
  onChange={(e) =>
    setFilterMonth(e.target.value)
  }
  className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
>
  <option value="">
    All Months
  </option>

  {Array.from({ length: 12 }, (_, i) => (
    <option
      key={i + 1}
      value={i + 1}
    >
      {i + 1}
    </option>
  ))}
</select>
    
<input
  type="number"
  placeholder="All Years"
  value={filterYear}
  onChange={(e) =>
    setFilterYear(e.target.value)
  }
  className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
/>

<button
  onClick={() => {
    setFilterMonth("");
    setFilterYear("");
  }}
  className="px-4 py-3 rounded-xl text-white bg-red-500"
>
  Clear Filters
</button>

          </div>
    
        </div>
    
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-neutral-500">
              Payroll Records
            </p>
    
            <h3 className="text-3xl font-bold text-white mt-2">
              {filteredPayrolls.length}
            </h3>
          </div>
    
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-neutral-500">
              Total Salary
            </p>
    
            <h3 className="text-3xl font-bold text-green-400 mt-2">
              ₹
              {filteredPayrolls.reduce(
                (sum, payroll) =>
                  sum + payroll.netSalary,
                0
              )}
            </h3>
          </div>
    
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-neutral-500">
              Average Salary
            </p>
    
            <h3 className="text-3xl font-bold text-blue-400 mt-2">
              ₹
              {filteredPayrolls.length
                ? Math.round(
                    filteredPayrolls.reduce(
                      (sum, payroll) =>
                        sum +
                        payroll.netSalary,
                      0
                    ) /
                      filteredPayrolls.length
                  )
                : 0}
            </h3>
          </div>
    
        </div>
    
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
    
          <table className="w-full">
    
            <thead>
    
              <tr className="border-b border-neutral-800">
    
                <th className="p-4 text-left text-neutral-400">
                  Month
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Year
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Basic
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Incentive
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Deduction
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Advance
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Net Salary
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Payment
                </th>
    
                <th className="p-4 text-left text-neutral-400">
                  Action
                </th>
    
              </tr>
    
            </thead>
    
            <tbody>
    
              {filteredPayrolls.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-neutral-500 p-8"
                  >
                    No payroll records found
                  </td>
                </tr>
              )}
    
              {filteredPayrolls.map(
                (payroll) => (
                  <tr
                    key={payroll.id}
                    className="border-b border-neutral-800"
                  >
    
                    <td className="p-4 text-white">
                      {payroll.month}
                    </td>
    
                    <td className="p-4 text-white">
                      {payroll.year}
                    </td>
    
                    <td className="p-4 text-white">
                      ₹{payroll.basicSalary}
                    </td>
    
                    <td className="p-4 text-green-400">
                      ₹
                      {payroll.incentive ||
                        0}
                    </td>
    
                    <td className="p-4 text-red-400">
                      ₹
                      {payroll.deduction ||
                        0}
                    </td>
    
                    <td className="p-4 text-orange-400">
                      ₹
                      {payroll.advanceDeduction ||
                        0}
                    </td>
    
                    <td className="p-4 font-semibold text-lime-400">
                      ₹
                      {payroll.netSalary}
                    </td>
    
                    <td className="p-4 text-white">
                      {payroll.paidMethod}
                    </td>
    
                    <td className="p-4">
    
                      <button
                        onClick={() => {
                          setSelected(
                            payroll
                          );
    
                          setPayrollForm({
                            month: payroll.month.toString(),
                            year: payroll.year.toString(),
                            basicSalary: payroll.basicSalary.toString(),
                            incentive: payroll.incentive?.toString() || "",
                            deduction: payroll.deduction?.toString() || "",
                            advanceDeduction:
                              payroll.advanceDeduction?.toString() || "",
                            paidMethod: payroll.paidMethod,
                          });
    
                          setOpenEdit(true);
                        }}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
                      >
                        Edit
                      </button>
    
                    </td>
    
                  </tr>
                )
              )}
    
            </tbody>
    
          </table>
    
        </div>
        {openCreate && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

      <h2 className="text-xl font-bold text-white mb-6">
        Create Payroll
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Month
  </label>

  <input
    type="number"
    value={payrollForm.month}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        month: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Year
  </label>

  <input
    type="number"
    value={payrollForm.year}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        year: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Basic Salary
  </label>

  <input
    type="number"
    value={payrollForm.basicSalary}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        basicSalary: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Incentive
  </label>

  <input
    type="number"
    value={payrollForm.incentive}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        incentive: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Deduction
  </label>

  <input
    type="number"
    value={payrollForm.deduction}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        deduction: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div>
  <label className="block text-sm text-neutral-400 mb-2">
    Advance Deduction
  </label>

  <input
    type="number"
    value={payrollForm.advanceDeduction}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        advanceDeduction: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  />
</div>

<div className="md:col-span-2">
  <label className="block text-sm text-neutral-400 mb-2">
    Payment Method
  </label>

  <select
    value={payrollForm.paidMethod}
    onChange={(e) =>
      setPayrollForm({
        ...payrollForm,
        paidMethod: e.target.value,
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
  >
    <option value="CASH">
      Cash
    </option>

    <option value="BANK_TRANSFER">
      Bank Transfer
    </option>

    <option value="UPI">
      UPI
    </option>
  </select>
</div>

</div>

<div className="mt-6 bg-neutral-800 border border-neutral-700 rounded-xl p-5">
<p className="text-neutral-400 text-sm">
  Net Salary
</p>

<h3 className="text-3xl font-bold text-lime-400 mt-1">
  ₹{calculateNetSalary()}
</h3>
</div>

<div className="flex justify-end gap-3 mt-6">
  <button
    onClick={() => setOpenCreate(false)}
    className="px-5 py-3 bg-neutral-800 rounded-xl text-white"
  >
    Cancel
  </button>

  <button
    onClick={handleCreatePayroll}
    className="px-5 py-3 bg-lime-400 rounded-xl text-black font-semibold"
  >
    Create Payroll
  </button>
</div>

    </div>
  </div>
)}

        {openEdit && selected && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

      <h2 className="text-xl font-bold text-white mb-6">
        Update Payroll
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Month
    </label>

    <input
      type="number"
      value={payrollForm.month}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          month: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Year
    </label>

    <input
      type="number"
      value={payrollForm.year}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          year: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Basic Salary
    </label>

    <input
      type="number"
      value={payrollForm.basicSalary}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          basicSalary: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Incentive
    </label>

    <input
      type="number"
      value={payrollForm.incentive}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          incentive: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Deduction
    </label>

    <input
      type="number"
      value={payrollForm.deduction}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          deduction: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-400 mb-2">
      Advance Deduction
    </label>

    <input
      type="number"
      value={payrollForm.advanceDeduction}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          advanceDeduction: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    />
  </div>

  <div className="md:col-span-2">
    <label className="block text-sm text-neutral-400 mb-2">
      Payment Method
    </label>

    <select
      value={payrollForm.paidMethod}
      onChange={(e) =>
        setPayrollForm({
          ...payrollForm,
          paidMethod: e.target.value,
        })
      }
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
    >
      <option value="CASH">
        Cash
      </option>

      <option value="BANK_TRANSFER">
        Bank Transfer
      </option>

      <option value="UPI">
        UPI
      </option>
    </select>
  </div>

</div>

<div className="mt-6 bg-neutral-800 border border-neutral-700 rounded-xl p-5">
  <p className="text-neutral-400 text-sm">
    Net Salary
  </p>

  <h3 className="text-3xl font-bold text-lime-400 mt-1">
    ₹{calculateNetSalary()}
  </h3>
</div>

<div className="flex justify-end gap-3 mt-6">
  <button
    onClick={() => {
      setOpenEdit(false);
      setSelected(null);
    }}
    className="px-5 py-3 bg-neutral-800 rounded-xl text-white"
  >
    Cancel
  </button>

  <button
    onClick={handleUpdatePayroll}
    className="px-5 py-3 bg-blue-500 rounded-xl text-white font-semibold"
  >
    Update Payroll
  </button>
</div>

    </div>
  </div>
)}
    
      </div>
    );
}

export default page;