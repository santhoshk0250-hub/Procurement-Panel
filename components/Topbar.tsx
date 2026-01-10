"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, X, Image as ImageIcon } from "lucide-react";
import axios from "axios";

type AdminProfile = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [profile, setProfile] = useState<AdminProfile | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

 useEffect(() => {
  const data = safeParseJSON<any>(localStorage.getItem("admindata"));
  const a: AdminProfile | null = data?.admin ?? data?.user ?? data ?? null;
  setAdmin(a);
}, []);

  // close modal on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    if (profileOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profileOpen]);



  const getAdminIdFromStorage = () => {
    const data = safeParseJSON<any>(localStorage.getItem("admindata"));
    if (!data) return null;

    const raw =
      data.id ??
      data._id ??
      data?.admin?.id ??
      data?.admin?._id ??
      data?.user?.id ??
      data?.user?._id;

    if (!raw) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && raw.$oid) return raw.$oid;
    return null;
  };

  const fetchProfile = async () => {
    const adminId = getAdminIdFromStorage();
    if (!adminId) {
      setProfileError("Admin id not found in localStorage.admindata");
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}auth/admin/${adminId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to fetch profile");
      }

      const json = await res.json();
      const admin: AdminProfile = json?.data ?? json;

      setProfile(admin);
      setName(admin?.name ?? "");
      setEmail(admin?.email ?? "");

      setProfileOpen(true);
    } catch (e: any) {
      setProfileError(e?.message ?? "Something went wrong");
    } finally {
      setProfileLoading(false);
    }
  };

 const handleUpdateProfile = async () => {
  const adminId = getAdminIdFromStorage();
  if (!adminId) {
    setProfileError("Admin id not found in localStorage.admindata");
    return;
  }

  setProfileSaving(true);
  setProfileError(null);

  try {
    const token = localStorage.getItem("token");

    const res = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_BASE}auth/admin/${adminId}`,
      {
        name,
        email,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      }
    );

    const updated = res.data?.data ?? res.data;

    setProfile(updated);
    setProfileOpen(false);
  } catch (e: any) {
    const msg =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      "Update failed";
    setProfileError(msg);
  } finally {
    setProfileSaving(false);
  }
};


  const handleLogout = () => {
    setSigningOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("admindata");
    setOpen(false);
    router.push("/login");
  };

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="flex h-14 sm:h-16 items-center justify-between pl-14 sm:pl-4 md:pl-6 pr-3 sm:pr-4 md:pr-6">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Overview</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Welcome back, Aarah</p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                className="flex items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-50 active:bg-gray-100 transition-all hover:shadow-md touch-manipulation"
                disabled={signingOut}
                aria-label="User menu"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src="https://avatars.githubusercontent.com/u/9919?s=200&v=4"
                    alt="Profile"
                    width={28}
                    height={28}
                    className="sm:w-8 sm:h-8 rounded-lg ring-2 ring-gray-100 object-cover"
                  />
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">Aarah</div>
                  <div className="text-xs text-gray-500">Admin</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 sm:w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User info */}
                  <div className="border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3">
                    <div className="text-xs font-medium text-gray-600">Signed in as</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1 truncate">{admin?.name ?? "—"}</div>

                  </div>

                  {/* Actions */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setOpen(false);
                        fetchProfile();
                      }}
                      disabled={profileLoading || signingOut}
                      className="flex w-full items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-60"
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>{profileLoading ? "Loading profile..." : "Profile"}</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={signingOut}
                      className={`flex w-full items-center gap-3 px-4 py-3 sm:py-2.5 text-sm transition-colors touch-manipulation ${
                        signingOut
                          ? "text-red-500/60 cursor-not-allowed"
                          : "text-red-600 hover:bg-red-50 active:bg-red-100"
                      }`}
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold text-gray-900">Profile</div>
                <div className="text-xs text-gray-500">Update your account details</div>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100 active:bg-gray-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {profileError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {profileError}
                </div>
              )}


              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Your name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Your email"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setProfileOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={profileSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60"
              >
                {profileSaving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen loader overlay */}
      {signingOut && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-gray-700">Signing you out…</p>
        </div>
      )}
    </>
  );
}
