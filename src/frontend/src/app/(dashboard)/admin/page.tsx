"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { adminUsers, type AdminUser } from "@/lib/api";
import { isDemoMode } from "@/lib/demo-data";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();
  const { user: currentUser } = useAuth();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      if (isDemoMode()) {
        return Promise.resolve([
          {
            id: "demo-1",
            email: "admin@justloveforest.com",
            name: "Demo Admin",
            role: "admin",
            created_at: new Date().toISOString(),
          },
        ] as AdminUser[]);
      }
      return adminUsers.list();
    },
  });

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  const createMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: "admin" | "operator"; password: string }) =>
      adminUsers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created");
      setCreateOpen(false);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to create user";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: "admin" | "operator"; password?: string } }) =>
      adminUsers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
      setEditOpen(false);
      setEditing(null);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to update user";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUsers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to delete user";
      toast.error(msg);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const name = String(form.get("name") || "").trim();
    const role = (String(form.get("role") || "operator") as "admin" | "operator");
    const password = String(form.get("password") || "");
    if (!email || !name || !password) return;
    createMutation.mutate({ email, name, role, password });
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const role = (String(form.get("role") || editing.role) as "admin" | "operator");
    const password = String(form.get("password") || "");

    updateMutation.mutate({
      id: editing.id,
      data: {
        name: name || undefined,
        role,
        password: password ? password : undefined,
      },
    });
  };

  const handleDelete = (u: AdminUser) => {
    if (currentUser?.id && u.id === currentUser.id) {
      toast.error("You can’t delete your own account");
      return;
    }
    const ok = window.confirm(`Delete ${u.email}?`);
    if (!ok) return;
    deleteMutation.mutate(u.id);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Admin Users
          </h2>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>
            Create operator accounts so Brian can manage access without DB access
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="text-white font-semibold rounded-xl" style={{ background: colors.canopy }}>
              <Plus size={15} />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl rounded-2xl" style={isDark ? { background: darkColors.surfaceElevated, borderColor } : {}}>
            <DialogHeader>
              <DialogTitle style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
                Add User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Email
                  </Label>
                  <Input name="email" type="email" required className="mt-1 rounded-xl" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Name
                  </Label>
                  <Input name="name" required className="mt-1 rounded-xl" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Role
                  </Label>
                  <select
                    name="role"
                    defaultValue="operator"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border text-sm"
                    style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : { background: "white", borderColor }}
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Password
                  </Label>
                  <Input name="password" type="password" required className="mt-1 rounded-xl" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" style={isDark ? { borderColor, color: textSub } : {}} onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl text-white font-semibold" style={{ background: colors.canopy }} disabled={createMutation.isPending}>
                  <Shield size={15} />
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: cardBg, borderColor }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider" style={{ borderColor }}>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Email</th>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Name</th>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Role</th>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center" style={{ color: textMuted }}>
                    Loading...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center" style={{ color: textMuted }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                sorted.map((u) => {
                  const isSelf = currentUser?.id && u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="border-b" style={{ borderColor }}>
                      <td className="px-5 py-3.5" style={{ color: textMain }}>{u.email}</td>
                      <td className="px-5 py-3.5" style={{ color: textMain }}>{u.name}</td>
                      <td className="px-5 py-3.5" style={{ color: textMain }}>{u.role}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            style={isDark ? { borderColor, color: textSub } : {}}
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={14} />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            style={isDark ? { borderColor, color: textSub } : {}}
                            onClick={() => handleDelete(u)}
                            disabled={isSelf || deleteMutation.isPending}
                            title={isSelf ? "You can’t delete your own account" : "Delete user"}
                          >
                            <Trash2 size={14} />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-xl rounded-2xl" style={isDark ? { background: darkColors.surfaceElevated, borderColor } : {}}>
          <DialogHeader>
            <DialogTitle style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
              Edit User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Email
                </Label>
                <Input value={editing?.email || ""} readOnly className="mt-1 rounded-xl opacity-80" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Name
                </Label>
                <Input name="name" defaultValue={editing?.name || ""} className="mt-1 rounded-xl" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Role
                </Label>
                <select
                  name="role"
                  defaultValue={(editing?.role as "admin" | "operator") || "operator"}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border text-sm"
                  style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : { background: "white", borderColor }}
                >
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  New Password (optional)
                </Label>
                <Input name="password" type="password" className="mt-1 rounded-xl" style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" style={isDark ? { borderColor, color: textSub } : {}} onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl text-white font-semibold" style={{ background: colors.canopy }} disabled={updateMutation.isPending}>
                <Shield size={15} />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
