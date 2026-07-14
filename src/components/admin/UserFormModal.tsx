"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import api from "@/lib/axios";

interface UserFormData {
  _id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: UserFormData | null;
}

export const UserFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  editUser,
}: UserFormModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editUser;

  useEffect(() => {
    if (editUser) {
      setName(editUser.name || "");
      setEmail(editUser.email || "");
      setRole(editUser.role || "staff");
      setIsActive(editUser.isActive !== false);
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setIsActive(true);
    }
    setError(null);
  }, [editUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!isEdit && !password.trim()) {
      setError("Password is required for new users.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && editUser?._id) {
        await api.patch(`/users/${editUser._id}`, {
          name: name.trim(),
          email: email.trim(),
          role,
          isActive,
        });
        toast.success("User updated successfully.");
      } else {
        await api.post("/users", {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
        toast.success("User created successfully.");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "An error occurred. Please try again.";
      setError(typeof msg === "string" ? msg : msg[0] || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-card w-full max-w-xl rounded-[24px] sm:rounded-[32px] border border-border shadow-xl overflow-hidden animate-scale-in">
        <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tighter">
                {isEdit ? "Edit" : "Add"}{" "}
                <span className="text-primary">User</span>
              </h2>
              <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                {isEdit
                  ? "Update staff member details"
                  : "Create a new platform user"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold uppercase tracking-wider animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.G. JOHN SMITH..."
                className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-foreground placeholder:text-muted-foreground tracking-widest focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E.G. USER@COMPANY.COM..."
                className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-foreground placeholder:text-muted-foreground tracking-widest focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* Password (only for new users) */}
            {!isEdit && (
              <div className="space-y-2">
                <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="MIN 6 CHARACTERS..."
                    className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-foreground placeholder:text-muted-foreground tracking-widest focus:outline-none focus:border-primary/50 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Role & Status Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Role */}
              <div className="space-y-2">
                <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                  Platform Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Active Status (only for edit) */}
              {isEdit && (
                <div className="space-y-2">
                  <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                    Account Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border ${
                      isActive
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${isActive ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : "bg-slate-400"}`}
                      />
                      {isActive ? "Active" : "Deactivated"}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl gap-2 sm:gap-3 text-sm sm:text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {isEdit ? (
              <>
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                Update User
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                Create User
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
