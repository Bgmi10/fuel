"use client"
import { useEffect, useState } from "react";

const page = () => {

    const [employees, setEmployees] = useState<any[]>([]);
const [attendance, setAttendance] = useState<
  Record<string, string>
>({});
const [loading, setLoading] = useState(true);


useEffect(() => {
    fetchAttendance();
  }, []);

  const updateStatus = (
    employeeId: string,
    status: string
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };


  const saveAttendance = async () => {
    try {
      const payload = employees.map((employee) => ({
        employeeId: employee.id,
        status: attendance[employee.id],
      }));
  
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        alert(data.message);
        return;
      }
  
      alert("Attendance saved");
  
      fetchAttendance();
    } catch (error) {
      console.log(error);
    }
  };

  
  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance");
  
      const data = await res.json();
  
      setEmployees(data.users || []);
  
      const defaults: Record<string, string> = {};
  
      data.users?.forEach((user: any) => {
        defaults[user.id] = "PRESENT";
      });
  
      setAttendance(defaults);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

   return (
  <div className="space-y-6">

    <div className="flex items-center justify-between">

      <div>
        <h1 className="text-2xl font-bold text-white">
          Staff Attendance
        </h1>

        <p className="text-neutral-400">
          Mark today's attendance
        </p>
      </div>

      {employees.length > 0 && (
        <button
          onClick={saveAttendance}
          className="px-5 py-3 bg-lime-400 rounded-xl text-black font-semibold"
        >
          Save Attendance
        </button>
      )}

    </div>

    {loading && (
      <div className="bg-neutral-900 p-8 rounded-2xl text-center text-neutral-400">
        Loading...
      </div>
    )}

    {!loading &&
      employees.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <h3 className="text-white font-semibold">
            Attendance already completed today
          </h3>
        </div>
      )}

    {employees.map((employee) => (
      <div
        key={employee.id}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"
      >

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h3 className="text-white font-semibold">
              {employee.user?.name}
            </h3>
          </div>

          <div className="flex gap-3 flex-wrap">

            <label className="flex items-center gap-2 text-green-400">
              <input
                type="radio"
                checked={
                  attendance[employee.id] ===
                  "PRESENT"
                }
                onChange={() =>
                  updateStatus(
                    employee.id,
                    "PRESENT"
                  )
                }
              />
              P
            </label>

            <label className="flex items-center gap-2 text-red-400">
              <input
                type="radio"
                checked={
                  attendance[employee.id] ===
                  "ABSENT"
                }
                onChange={() =>
                  updateStatus(
                    employee.id,
                    "ABSENT"
                  )
                }
              />
              A
            </label>

            <label className="flex items-center gap-2 text-yellow-400">
              <input
                type="radio"
                checked={
                  attendance[employee.id] ===
                  "LEAVE"
                }
                onChange={() =>
                  updateStatus(
                    employee.id,
                    "LEAVE"
                  )
                }
              />
              L
            </label>

            <label className="flex items-center gap-2 text-blue-400">
              <input
                type="radio"
                checked={
                  attendance[employee.id] ===
                  "HALFDAY"
                }
                onChange={() =>
                  updateStatus(
                    employee.id,
                    "HALFDAY"
                  )
                }
              />
              HD
            </label>

          </div>

        </div>

      </div>
    ))}

  </div>
);
}

export default page;