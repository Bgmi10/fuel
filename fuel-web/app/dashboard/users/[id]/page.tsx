'use client';
import { Attendance, Employee, Payroll, User } from "@prisma/client";
import { ArrowLeft, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";


type UserType = User & {
    employee: Employee & {
        payrolls: Payroll[];
        attendances: Attendance[];
    }
}
const page = () => {
    const { id } = useParams();
    const [user, setUser] = useState<UserType | null>(null)
    const [openBankDetail, setOpenBankDetail] = useState(false);
    const [editProfile, setEditProfile] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "ADMIN",
      });
      const router = useRouter();


      const [payForm, setPayForm] = useState({
        basicSalary: "",
        salaryType: "MONTHLY",
        bankName: "",
        accountNo: "",
        ifscCode: "",
      });

    const [editPayDetailForm, setEditPayDetailForm] = useState(false);
  

    const fetchUser = async () => {
        try {
            const res = await fetch(`/api/users/${id}`)
            const data = await res.json();
            setUser(data.user);
            
        setForm({
            name: data.user?.name ?? "",
            email: data.user?.email ?? "",
            password: "",
            role: data.user?.role ?? ""
        })

        setPayForm({
  basicSalary: data.user?.employee?.basicSalary
    ? (data.user.employee.basicSalary / 100).toString()
    : "",
  salaryType: data.user?.employee?.salaryType || "MONTHLY",
  bankName: data.user?.employee?.bankName || "",
  accountNo: data.user?.employee?.accountNo || "",
  ifscCode: data.user?.employee?.ifscCode || "",
});


        } catch (e) {
            console.log(e);
        }
    }
    useEffect(() => {
        fetchUser()
    }, []);


    const handlePayDetailsUpdate = async () => {
        try {
          const res = await fetch(
            `/api/users/${id}/edit-pay-detail`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                basicSalary: Number(payForm.basicSalary),
                salaryType: payForm.salaryType,
                bankName: payForm.bankName,
                accountNo: payForm.accountNo,
                ifscCode: payForm.ifscCode,
              }),
            }
          );
      
          const data = await res.json();
      
          if (!data.success) {
            alert(data.message);
            return;
          }
      
          alert("Pay details updated");
      
          setEditPayDetailForm(false);
      
          fetchUser();
        } catch (e) {
          console.log(e);
        }
      };

    const handleUpdate = async () => {
    
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              password: form.password || undefined,
              role: form.role,
            }),
          });
    
          const data = await res.json();
    
          if (!data.success) {
            alert(data.message || "Failed");
            return;
          }
    
          alert("User updated");
    
          setEditProfile(false);
    
          fetchUser();
        } catch (e) {
          console.log(e);
        }
      };

    return (
        <div>
        <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
  <button
    onClick={() => router.back()}
    className="h-10 w-10 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition"
  >
    <ArrowLeft size={18} />
  </button>

  <h1 className="text-2xl font-bold text-white">
    Staff Profile
  </h1>
</div>

<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

  <h1 className="text-2xl font-bold text-white">
    {user?.name}
  </h1>

  <p className="text-neutral-400 mt-1">
    {user?.email}
  </p>

  <div className="mt-4">
    <span className="px-3 py-1 rounded-lg bg-lime-400/20 text-lime-400 text-xs">
      {user?.role}
    </span>
  </div>

  <p className="text-sm text-neutral-500 mt-4">
    Joined{" "}
    {user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "-"}
  </p>

</div>

<div className="flex flex-wrap gap-4">

  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
    <p className="text-neutral-500 text-sm">
      Salary
    </p>

    <h3 className="text-white text-2xl font-bold mt-2">
      ₹{((user?.employee?.basicSalary ?? 0) / 100 )|| 0}
    </h3>
  </div>

  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
    <p className="text-neutral-500 text-sm">
      Payrolls
    </p>

    <h3 className="text-white text-2xl font-bold mt-2">
      {user?.employee?.payrolls?.length || 0}
    </h3>
  </div>


  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
    <p className="text-neutral-500 text-sm">
      Salary Type
    </p>

    <h3 className="text-white text-lg font-semibold mt-2">
      {user?.employee?.salaryType ?? "-"}
    </h3>
  </div>

</div>

</div>
<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mt-6">

<h2 className="text-white font-semibold mb-4">
  Actions
</h2>

<div className="flex flex-wrap gap-3">

  <button
    onClick={() => setEditProfile(true)}
    className="px-4 py-2 bg-neutral-800 text-white rounded-xl"
  >
    Edit Profile
  </button>

  <button
    onClick={() => setEditPayDetailForm(true)}
    className="px-4 py-2 bg-neutral-800 text-white rounded-xl"
  >
    Edit Pay Details
  </button>

  <button
    onClick={() => setOpenBankDetail(true)}
    className="px-4 py-2 bg-neutral-800 text-white rounded-xl"
  >
    Bank Details
  </button>

  {user?.employee && <button
    onClick={() =>
      router.push(
        `/dashboard/users/${id}/attendance`
      )
    }
    className="px-4 py-2 bg-lime-400 text-black rounded-xl"
  >
    Attendance
  </button>}

  <button
    onClick={() =>
      router.push(
        `/dashboard/users/${id}/payroll`
      )
    }
    className="px-4 py-2 bg-lime-400 text-black rounded-xl"
  >
    Payroll
  </button>

</div>

</div>

{
  openBankDetail && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Bank Details
          </h2>

          <button
            onClick={() => setOpenBankDetail(false)}
            className="text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">


          <div className="bg-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 mb-1">
              Bank Name
            </p>

            <p className="text-white">
              {user?.employee?.bankName || "-"}
            </p>
          </div>

          <div className="bg-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 mb-1">
              Account Number
            </p>

            <p className="text-white">
              {user?.employee?.accountNo || "-"}
            </p>
          </div>

          <div className="bg-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 mb-1">
              IFSC Code
            </p>

            <p className="text-white">
              {user?.employee?.ifscCode || "-"}
            </p>
          </div>

        </div>

        <button
          onClick={() => setOpenBankDetail(false)}
          className="w-full mt-6 py-3 bg-lime-400 text-black rounded-xl font-semibold"
        >
          Close
        </button>

      </div>

    </div>
  )
}

{editProfile && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
      <h2 className="text-xl font-bold text-white mb-5">
        Edit User
      </h2>

      <div className="space-y-4">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
        />

        <input
          type="password"
          placeholder="New Password (optional)"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({
              ...form,
              role: e.target.value,
            })
          }
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
          <option value="MANAGER">MANAGER</option>
          <option value="COACH">COACH</option>
        </select>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => {
            setEditProfile(false);
          }}
          className="flex-1 py-3 bg-neutral-800 text-white rounded-xl"
        >
          Cancel
        </button>

        <button
          onClick={handleUpdate}
          className="flex-1 py-3 bg-lime-400 text-black rounded-xl font-semibold"
        >
          Update User
        </button>
      </div>
    </div>
  </div>
)}

{
  editPayDetailForm && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">

        <h2 className="text-xl font-bold text-white mb-5">
          Edit Pay Details
        </h2>

        <div className="space-y-4">

          <input
            placeholder="Basic Salary"
            value={payForm.basicSalary}
            onChange={(e) =>
              setPayForm({
                ...payForm,
                basicSalary: e.target.value,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
          />

          <select
            value={payForm.salaryType}
            onChange={(e) =>
              setPayForm({
                ...payForm,
                salaryType: e.target.value,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
          >
            <option value="MONTHLY">
              MONTHLY
            </option>

            <option value="YEARLY">
              YEARLY
            </option>

            <option value="HOURLY">
              HOURLY
            </option>
          </select>

          <input
            placeholder="Bank Name"
            value={payForm.bankName}
            onChange={(e) =>
              setPayForm({
                ...payForm,
                bankName: e.target.value,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
          />

          <input
            placeholder="Account Number"
            value={payForm.accountNo}
            onChange={(e) =>
              setPayForm({
                ...payForm,
                accountNo: e.target.value,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
          />

          <input
            placeholder="IFSC Code"
            value={payForm.ifscCode}
            onChange={(e) =>
              setPayForm({
                ...payForm,
                ifscCode: e.target.value,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
          />

        </div>

        <div className="flex gap-3 mt-6">

          <button
            onClick={() =>
              setEditPayDetailForm(false)
            }
            className="flex-1 py-3 bg-neutral-800 text-white rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={handlePayDetailsUpdate}
            className="flex-1 py-3 bg-lime-400 text-black rounded-xl font-semibold"
          >
            Update
          </button>

        </div>

      </div>

    </div>
  )
}
        </div>
    )
}

export default page;