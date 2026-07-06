"use client";

import { Attendance } from "@prisma/client";
import { ArrowLeft, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const page = () => {
  const { id } = useParams();
  const router = useRouter();

  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [attendanceForm, setAttendanceForm] =
  useState({
    date: "",
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
  });
  const [openEdit, setOpenEdit] = useState(false);
  const [employeeId, setEmployeeId] = useState('');

  const [selected, setSelected] =
    useState<Attendance | null>(null);

  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();

      setAttendance(
        data.user.employee?.attendances || []
      );
      setEmployeeId(data.user?.employee.id);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((item) => {
      const itemMonth = new Date(item.date)
        .toISOString()
        .slice(0, 7);

      return itemMonth === month;
    });
  }, [attendance, month]);

  const presentCount = filteredAttendance.filter(
    (a) => a.status === "PRESENT"
  ).length;

  const absentCount = filteredAttendance.filter(
    (a) => a.status === "ABSENT"
  ).length;

  const leaveCount = filteredAttendance.filter(
    (a) => a.status === "LEAVE"
  ).length;

  const halfDayCount = filteredAttendance.filter(
    (a) => a.status === "HALFDAY"
  ).length;

  const attendanceStatusMap = {
    PRESENT: {
      code: "P",
      label: "Present",
      className:
        "bg-green-500/20 text-green-400",
    },
    ABSENT: {
      code: "A",
      label: "Absent",
      className:
        "bg-red-500/20 text-red-400",
    },
    LEAVE: {
      code: "L",
      label: "Leave",
      className:
        "bg-yellow-500/20 text-yellow-400",
    },
    HALFDAY: {
      code: "HD",
      label: "Half Day",
      className:
        "bg-blue-500/20 text-blue-400",
    },
  };


  const needsTimeFields =
  attendanceForm.status === "PRESENT" ||
  attendanceForm.status === "HALFDAY";

  
  const handleUpdateAttendance = async () => {
    if (!selected) return;
  
    const needsTime =
      attendanceForm.status === "PRESENT" ||
      attendanceForm.status === "HALFDAY";
  
    const payload = {
      date: new Date(attendanceForm.date),
      status: attendanceForm.status,
  
      checkIn: needsTime
        ? new Date(
            `${attendanceForm.date}T${attendanceForm.checkIn}`
          )
        : null,
  
      checkOut: needsTime
        ? new Date(
            `${attendanceForm.date}T${attendanceForm.checkOut}`
          )
        : null,
    };
  
    try {
      const res = await fetch(
        `/api/users/${id}/attendance/${selected.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      const data = await res.json();
  
      if (!data.success) {
        alert(data.message);
        return;
      }
  
      alert("Attendance updated");
  
      setOpenEdit(false);
      setSelected(null);
  
      fetchAttendance();
    } catch (error) {
      console.log(error);
    }
  };


const handleCreateAttendance = async () => {

    if (
        (attendanceForm.status === "PRESENT" ||
          attendanceForm.status === "HALFDAY") &&
        (!attendanceForm.checkIn ||
          !attendanceForm.checkOut)
      ) {
        alert("Please select in and out time");
        return;
      }

      const payload = {
        date: new Date(attendanceForm.date),
        status: attendanceForm.status,
        employeeId,
        checkIn: needsTimeFields
          ? new Date(
              `${attendanceForm.date}T${attendanceForm.checkIn}`
            )
          : undefined,
        checkOut: needsTimeFields
          ? new Date(
              `${attendanceForm.date}T${attendanceForm.checkOut}`
            )
          : undefined,
      };
      
    try {
      const res = await fetch(
        `/api/users/${id}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        }
      );
  
      const data = await res.json();
  
      if (!data.success) {
        alert(data.message);
        return;
      }
  
      alert("Attendance created");
  
      setAttendanceForm({
        date: "",
        checkIn: "",
        checkOut: "",
        status: "PRESENT",
      });
  
      setOpenCreate(false);
  
      fetchAttendance();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              router.push(`/dashboard/users/${id}`)
            }
            className="h-10 w-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-2xl font-bold text-white">
            Attendance
          </h1>

        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="px-4 py-2 bg-lime-400 text-black rounded-xl flex items-center gap-2"
        >
          <Plus size={16} />
          Add Attendance
        </button>

      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">

        <label className="block text-sm text-neutral-400 mb-2">
          Filter Month
        </label>

        <input
          type="month"
          value={month}
          onChange={(e) =>
            setMonth(e.target.value)
          }
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
        />

      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-500">
            Present
          </p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            {presentCount}
          </h3>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-500">
            Absent
          </p>

          <h3 className="text-3xl font-bold text-red-400 mt-2">
            {absentCount}
          </h3>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-500">
            Leave
          </p>

          <h3 className="text-3xl font-bold text-yellow-400 mt-2">
            {leaveCount}
          </h3>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <p className="text-neutral-500">
            Half Day
          </p>

          <h3 className="text-3xl font-bold text-blue-400 mt-2">
            {halfDayCount}
          </h3>
        </div>

      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

        <table className="w-full">

          <thead>
            <tr className="border-b border-neutral-800">

              <th className="p-4 text-left text-neutral-400">
                Date
              </th>

              <th className="p-4 text-left text-neutral-400">
                In Time
              </th>

              <th className="p-4 text-left text-neutral-400">
                Out Time
              </th>

              <th className="p-4 text-left text-neutral-400">
                Status
              </th>

              <th className="p-4 text-left text-neutral-400">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {filteredAttendance.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-neutral-500 p-8"
                >
                  No attendance records
                </td>
              </tr>
            )}

            {filteredAttendance.map((item) => (
              <tr
                key={item.id}
                className="border-b border-neutral-800"
              >
                <td className="p-4 text-white">
                  {new Date(
                    item.date
                  ).toLocaleDateString()}
                </td>

                <td className="p-4 text-white">
  {item.checkIn
    ? new Date(item.checkIn).toLocaleTimeString()
    : "-"}
</td>

<td className="p-4 text-white">
  {item.checkOut
    ? new Date(item.checkOut).toLocaleTimeString()
    : "-"}
</td>

                <td className="p-4">
  <span
    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
      attendanceStatusMap[item.status].className
    }`}
  >
    {attendanceStatusMap[item.status].code}
  </span>
</td>

                <td className="p-4">
                  <button
                   onClick={() => {
                    setSelected(item);
                  
                    setAttendanceForm({
                      date: new Date(item.date)
                        .toISOString()
                        .split("T")[0],
                  
                      checkIn: item.checkIn
                        ? new Date(item.checkIn)
                            .toTimeString()
                            .slice(0, 5)
                        : "",
                  
                      checkOut: item.checkOut
                        ? new Date(item.checkOut)
                            .toTimeString()
                            .slice(0, 5)
                        : "",
                  
                      status: item.status,
                    });
                  
                    setOpenEdit(true);
                  }}
                    className="px-3 py-1 bg-neutral-800 text-white rounded-lg"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {openCreate && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl">

      <h2 className="text-xl font-bold text-white mb-6">
        Add Attendance
      </h2>

      <div className="overflow-hidden rounded-xl border border-neutral-800">

        <table className="w-full">
          <tbody>

          <tr className="border-b border-neutral-800">
  <td className="p-4 bg-neutral-800/50 text-neutral-400">
    Date
  </td>

  <td className="p-4">
    <input
      type="date"
      value={attendanceForm.date}
      onChange={(e) =>
        setAttendanceForm({
          ...attendanceForm,
          date: e.target.value,
        })
      }
      className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
    />
  </td>
</tr>

<tr>
              <td className="p-4 bg-neutral-800/50 text-neutral-400">
                Status
              </td>

              <td className="p-4">
              <select
  value={attendanceForm.status}
  onChange={(e) =>
    setAttendanceForm({
      ...attendanceForm,
      status: e.target.value,
      checkIn: "",
      checkOut: "",
    })
  }
  className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
>
  <option value="PRESENT">
    P - Present
  </option>

  <option value="ABSENT">
    A - Absent
  </option>

  <option value="LEAVE">
    L - Leave
  </option>

  <option value="HALFDAY">
    HD - Half Day
  </option>
</select>
              </td>
            </tr>

{needsTimeFields && (
  <>
    <tr className="border-b border-neutral-800">
      <td className="p-4 bg-neutral-800/50 text-neutral-400">
        In Time

      </td>

      <td className="p-4">
        <input
          type="time"
          value={attendanceForm.checkIn}
          onChange={(e) =>
            setAttendanceForm({
              ...attendanceForm,
              checkIn: e.target.value,
            })
          }
          className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
        />
      </td>
    </tr>

    <tr className="border-b border-neutral-800">
      <td className="p-4 bg-neutral-800/50 text-neutral-400">
        Out Time
      </td>

      <td className="p-4">
        <input
          type="time"
          value={attendanceForm.checkOut}
          onChange={(e) =>
            setAttendanceForm({
              ...attendanceForm,
              checkOut: e.target.value,
            })
          }
          className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
        />
      </td>
    </tr>
  </>
)}



          </tbody>
        </table>

      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setOpenCreate(false)}
          className="px-6 py-3 bg-neutral-800 text-white rounded-xl"
        >
          Cancel
        </button>

        <button
          onClick={handleCreateAttendance}
          className="px-6 py-3 bg-lime-400 text-black rounded-xl font-semibold"
        >
          Create Attendance
        </button>
      </div>

    </div>
  </div>
)}


{openEdit && selected && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl">

      <h2 className="text-xl font-bold text-white mb-6">
        Edit Attendance
      </h2>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full">
          <tbody>

            <tr className="border-b border-neutral-800">
              <td className="p-4 bg-neutral-800/50 text-neutral-400">
                Date
              </td>

              <td className="p-4">
                <input
                  type="date"
                  value={attendanceForm.date}
                  onChange={(e) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      date: e.target.value,
                    })
                  }
                  className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
                />
              </td>
            </tr>

            <tr className="border-b border-neutral-800">
              <td className="p-4 bg-neutral-800/50 text-neutral-400">
                Status
              </td>

              <td className="p-4">
                <select
                  value={attendanceForm.status}
                  onChange={(e) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
                >
                  <option value="PRESENT">
                    P - Present
                  </option>

                  <option value="ABSENT">
                    A - Absent
                  </option>

                  <option value="LEAVE">
                    L - Leave
                  </option>

                  <option value="HALFDAY">
                    HD - Half Day
                  </option>
                </select>
              </td>
            </tr>

            {(attendanceForm.status === "PRESENT" ||
              attendanceForm.status === "HALFDAY") && (
              <>
                <tr className="border-b border-neutral-800">
                  <td className="p-4 bg-neutral-800/50 text-neutral-400">
                    In Time
                  </td>

                  <td className="p-4">
                    <input
                      type="time"
                      value={attendanceForm.checkIn}
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          checkIn: e.target.value,
                        })
                      }
                      className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="p-4 bg-neutral-800/50 text-neutral-400">
                    Out Time
                  </td>

                  <td className="p-4">
                    <input
                      type="time"
                      value={attendanceForm.checkOut}
                      onChange={(e) =>
                        setAttendanceForm({
                          ...attendanceForm,
                          checkOut: e.target.value,
                        })
                      }
                      className="w-full bg-neutral-800 rounded-xl px-4 py-3 text-white"
                    />
                  </td>
                </tr>
              </>
            )}

          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => {
            setOpenEdit(false);
            setSelected(null);
          }}
          className="px-6 py-3 bg-neutral-800 text-white rounded-xl"
        >
          Cancel
        </button>

        <button
          onClick={handleUpdateAttendance}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold"
        >
          Update Attendance
        </button>
      </div>

    </div>
  </div>
)}


    </div>
  );
};

export default page;