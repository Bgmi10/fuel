"use client";

import { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


const Page = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<User | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
  });

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      setUsers(data.users || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "ADMIN",
    });
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("name, email and password required");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed");
        return;
      }

      alert("User created");

      setOpen(false);
      resetForm();
      fetchUsers();
    } catch (e) {
      console.log(e);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;

    try {
      const res = await fetch(`/api/users/${selected.id}`, {
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

      setOpen(false);
      resetForm();
      setSelected(null);

      fetchUsers();
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed");
        return;
      }

      fetchUsers();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Staffs
          </h1>

          <p className="text-sm text-neutral-500 mt-1">
            Manage Staffs
          </p>
        </div>

        <button
          onClick={() => {
            setSelected(null);
            resetForm();
            setOpen(true);
          }}
          className="px-4 py-2 bg-lime-400 text-black rounded-xl font-semibold"
        >
          + Add User
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-neutral-800 hover:bg-neutral-800/40"
                onClick={() => {
                  router.push(`/dashboard/users/${u.id}`)
                }}
              >
                <td className="p-4 text-white">{u.name}</td>

                <td className="text-neutral-300">
                  {u.email}
                </td>

                <td>
                  <span className="text-xs px-2 py-1 rounded bg-lime-400/20 text-lime-400">
                    {u.role}
                  </span>
                </td>

                <td className="text-neutral-500 text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>

                <td>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={(e) => {
                       e.stopPropagation();
                        setSelected(u);

                        setForm({
                          name: u.name,
                          email: u.email,
                          password: "",
                          role: u.role,
                        });

                        setOpen(true);
                      }}
                      className="text-lime-400 text-xs"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-400 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="p-6 text-sm text-neutral-500">
            No users found
          </div>
        )}

        {loading && (
          <div className="p-6 text-sm text-neutral-500">
            Loading users...
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">

            <h2 className="text-xl font-bold text-white mb-5">
              {selected ? "Edit User" : "Add User"}
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
                placeholder={
                  selected
                    ? "New Password (optional)"
                    : "Password"
                }
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
                  setOpen(false);
                  resetForm();
                  setSelected(null);
                }}
                className="flex-1 py-3 bg-neutral-800 text-white rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={
                  selected ? handleUpdate : handleCreate
                }
                className="flex-1 py-3 bg-lime-400 text-black rounded-xl font-semibold"
              >
                {selected ? "Update User" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;