import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Save,
  RotateCcw,
  Users,
  Building2,
  UserPlus,
  UserCheck,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";
import { useDepartments } from "../../hooks/useDepartments";
import { useAuth } from "../../../context/AuthContext";
import { Navigate } from "react-router-dom";

interface EmployeeItem {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  position: string;
}

interface ModuleAuth {
  canEdit: boolean;
  canDelete: boolean;
}

interface EmployeeAuthItem {
  clientDb: ModuleAuth;
  clientOnboarding: ModuleAuth;
  portfolioReview: ModuleAuth;
}

const CbiAuthorization = () => {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return <Navigate to="/cbi/dashboard" replace />;
  }

  const { departmentNames } = useDepartments();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [authorizations, setAuthorizations] = useState<Record<string, EmployeeAuthItem>>({});
  const [initialAuthorizations, setInitialAuthorizations] = useState<Record<string, EmployeeAuthItem>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "AUTHORIZED" | "READ_ONLY">("ALL");

  const fetchAuthorizations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/authorizations");
      if (res.data?.success) {
        setEmployees(res.data.employees || []);
        const rawAuth = res.data.authorizations || {};
        const safeAuth: Record<string, EmployeeAuthItem> = {};

        (res.data.employees || []).forEach((emp: EmployeeItem) => {
          const existing = rawAuth[emp.id];
          safeAuth[emp.id] = {
            clientDb: {
              canEdit: Boolean(existing?.clientDb?.canEdit),
              canDelete: Boolean(existing?.clientDb?.canDelete),
            },
            clientOnboarding: {
              canEdit: Boolean(existing?.clientOnboarding?.canEdit),
              canDelete: Boolean(existing?.clientOnboarding?.canDelete),
            },
            portfolioReview: {
              canEdit: Boolean(existing?.portfolioReview?.canEdit),
              canDelete: Boolean(existing?.portfolioReview?.canDelete),
            },
          };
        });

        setAuthorizations(safeAuth);
        setInitialAuthorizations(JSON.parse(JSON.stringify(safeAuth)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load CBI authorization matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorizations();
  }, []);

  const handleToggle = (
    empId: string,
    moduleKey: "clientDb" | "clientOnboarding" | "portfolioReview",
    actionKey: "canEdit" | "canDelete"
  ) => {
    setAuthorizations((prev) => {
      const current = prev[empId] || {
        clientDb: { canEdit: false, canDelete: false },
        clientOnboarding: { canEdit: false, canDelete: false },
        portfolioReview: { canEdit: false, canDelete: false },
      };

      return {
        ...prev,
        [empId]: {
          ...current,
          [moduleKey]: {
            ...current[moduleKey],
            [actionKey]: !current[moduleKey][actionKey],
          },
        },
      };
    });
  };

  const handleRowGrantAll = (empId: string) => {
    setAuthorizations((prev) => ({
      ...prev,
      [empId]: {
        clientDb: { canEdit: true, canDelete: true },
        clientOnboarding: { canEdit: true, canDelete: true },
        portfolioReview: { canEdit: true, canDelete: true },
      },
    }));
  };

  const handleRowRevokeAll = (empId: string) => {
    setAuthorizations((prev) => ({
      ...prev,
      [empId]: {
        clientDb: { canEdit: false, canDelete: false },
        clientOnboarding: { canEdit: false, canDelete: false },
        portfolioReview: { canEdit: false, canDelete: false },
      },
    }));
  };

  const handleColumnToggleAll = (
    moduleKey: "clientDb" | "clientOnboarding" | "portfolioReview",
    actionKey: "canEdit" | "canDelete",
    targetValue: boolean
  ) => {
    setAuthorizations((prev) => {
      const next = { ...prev };
      filteredEmployees.forEach((emp) => {
        const current = next[emp.id] || {
          clientDb: { canEdit: false, canDelete: false },
          clientOnboarding: { canEdit: false, canDelete: false },
          portfolioReview: { canEdit: false, canDelete: false },
        };
        next[emp.id] = {
          ...current,
          [moduleKey]: {
            ...current[moduleKey],
            [actionKey]: targetValue,
          },
        };
      });
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(authorizations) !== JSON.stringify(initialAuthorizations);
  }, [authorizations, initialAuthorizations]);

  const handleReset = () => {
    setAuthorizations(JSON.parse(JSON.stringify(initialAuthorizations)));
    toast("Reverted all unsaved changes", { icon: "↩️" });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = Object.entries(authorizations).map(([empId, perms]) => ({
        employeeId: empId,
        clientDb: perms.clientDb,
        clientOnboarding: perms.clientOnboarding,
        portfolioReview: perms.portfolioReview,
      }));

      const res = await api.put("/cbi/authorizations", { authorizations: payload });
      if (res.data?.success) {
        toast.success("CBI Roles & Authorizations saved successfully!");
        setInitialAuthorizations(JSON.parse(JSON.stringify(authorizations)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save authorizations");
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        search === "" ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        emp.department.toLowerCase().includes(search.toLowerCase()) ||
        emp.position.toLowerCase().includes(search.toLowerCase());

      const matchesDept = selectedDept === "" || emp.department === selectedDept;

      const auth = authorizations[emp.id];
      const hasAnyAuth =
        auth &&
        (auth.clientDb.canEdit ||
          auth.clientDb.canDelete ||
          auth.clientOnboarding.canEdit ||
          auth.clientOnboarding.canDelete ||
          auth.portfolioReview.canEdit ||
          auth.portfolioReview.canDelete);

      if (filterType === "AUTHORIZED") return matchesSearch && matchesDept && hasAnyAuth;
      if (filterType === "READ_ONLY") return matchesSearch && matchesDept && !hasAnyAuth;

      return matchesSearch && matchesDept;
    });
  }, [employees, authorizations, search, selectedDept, filterType]);

  const stats = useMemo(() => {
    let clientDbStaff = 0;
    let clientOnboardingStaff = 0;
    let portfolioReviewStaff = 0;
    let fullAccessStaff = 0;

    Object.values(authorizations).forEach((auth) => {
      const hasClientDb = auth.clientDb.canEdit || auth.clientDb.canDelete;
      const hasOnboarding = auth.clientOnboarding.canEdit || auth.clientOnboarding.canDelete;
      const hasReview = auth.portfolioReview.canEdit || auth.portfolioReview.canDelete;

      if (hasClientDb) clientDbStaff++;
      if (hasOnboarding) clientOnboardingStaff++;
      if (hasReview) portfolioReviewStaff++;
      if (
        auth.clientDb.canEdit &&
        auth.clientDb.canDelete &&
        auth.clientOnboarding.canEdit &&
        auth.clientOnboarding.canDelete &&
        auth.portfolioReview.canEdit &&
        auth.portfolioReview.canDelete
      ) {
        fullAccessStaff++;
      }
    });

    return {
      totalEmployees: employees.length,
      clientDbStaff,
      clientOnboardingStaff,
      portfolioReviewStaff,
      fullAccessStaff,
    };
  }, [employees, authorizations]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
              CBI Access Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            CBI Roles & Authorization Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Empower employees with granular edit, update, and delete authority across Client Database, Client Onboarding, and Portfolio Review.
          </p>
        </div>

        {/* Global Save Controls */}
        <div className="flex items-center gap-2.5">
          {hasChanges && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Discard Changes</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer ${
              hasChanges
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/20 animate-pulse"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? "Saving Matrix..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Employees</span>
            <span className="p-2 rounded-xl bg-slate-50 text-slate-600">
              <Users className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{stats.totalEmployees}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Eligible for CBI Delegation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">1. Client Database</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.clientDbStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Staff with Edit / Delete Access</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">2. Client Onboard</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserPlus className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.clientOnboardingStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Staff with Edit / Delete Access</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">3. Portfolio Review</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <UserCheck className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">{stats.portfolioReviewStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Staff with Edit / Delete Access</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Employee Name, Code, Department, or Position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="">All Departments</option>
              {departmentNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Access Filter Pills */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === "ALL" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "hover:text-slate-900"
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setFilterType("AUTHORIZED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === "AUTHORIZED"
                  ? "bg-white text-emerald-600 shadow-2xs font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              Delegated
            </button>
            <button
              onClick={() => setFilterType("READ_ONLY")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === "READ_ONLY"
                  ? "bg-white text-slate-700 shadow-2xs font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              View Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[220px]">
                  <span>Employee / Staff Member</span>
                </th>

                {/* 1. Client Database Header */}
                <th className="py-3 px-3 text-center border-l border-slate-200 min-w-[190px] bg-blue-50/40">
                  <div className="flex items-center justify-center gap-1.5 text-blue-700 mb-1">
                    <Building2 className="size-3.5" />
                    <span>Client Database</span>
                  </div>
                  <div className="grid grid-cols-2 text-[10px] text-slate-500 font-semibold gap-1 pt-1 border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("clientDb", "canEdit", true)}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                      title="Grant Edit to All Filtered"
                    >
                      + Edit/Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("clientDb", "canDelete", true)}
                      className="hover:text-rose-600 hover:underline cursor-pointer"
                      title="Grant Delete to All Filtered"
                    >
                      + Delete
                    </button>
                  </div>
                </th>

                {/* 2. Client Onboarding Header */}
                <th className="py-3 px-3 text-center border-l border-slate-200 min-w-[190px] bg-emerald-50/40">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
                    <UserPlus className="size-3.5" />
                    <span>Client Onboard</span>
                  </div>
                  <div className="grid grid-cols-2 text-[10px] text-slate-500 font-semibold gap-1 pt-1 border-t border-emerald-100">
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("clientOnboarding", "canEdit", true)}
                      className="hover:text-emerald-600 hover:underline cursor-pointer"
                      title="Grant Edit to All Filtered"
                    >
                      + Edit/Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("clientOnboarding", "canDelete", true)}
                      className="hover:text-rose-600 hover:underline cursor-pointer"
                      title="Grant Delete to All Filtered"
                    >
                      + Delete
                    </button>
                  </div>
                </th>

                {/* 3. Portfolio Review Header */}
                <th className="py-3 px-3 text-center border-l border-slate-200 min-w-[190px] bg-purple-50/40">
                  <div className="flex items-center justify-center gap-1.5 text-purple-700 mb-1">
                    <UserCheck className="size-3.5" />
                    <span>Portfolio Review</span>
                  </div>
                  <div className="grid grid-cols-2 text-[10px] text-slate-500 font-semibold gap-1 pt-1 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("portfolioReview", "canEdit", true)}
                      className="hover:text-purple-600 hover:underline cursor-pointer"
                      title="Grant Edit to All Filtered"
                    >
                      + Edit/Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColumnToggleAll("portfolioReview", "canDelete", true)}
                      className="hover:text-rose-600 hover:underline cursor-pointer"
                      title="Grant Delete to All Filtered"
                    >
                      + Delete
                    </button>
                  </div>
                </th>

                {/* Row Quick Action */}
                <th className="py-3.5 px-4 text-center border-l border-slate-200 min-w-[140px]">
                  <span>Quick Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="size-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No employees found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your search or department filter to see employees.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const auth = authorizations[emp.id] || {
                    clientDb: { canEdit: false, canDelete: false },
                    clientOnboarding: { canEdit: false, canDelete: false },
                    portfolioReview: { canEdit: false, canDelete: false },
                  };

                  const isFull =
                    auth.clientDb.canEdit &&
                    auth.clientDb.canDelete &&
                    auth.clientOnboarding.canEdit &&
                    auth.clientOnboarding.canDelete &&
                    auth.portfolioReview.canEdit &&
                    auth.portfolioReview.canDelete;

                  const hasNone =
                    !auth.clientDb.canEdit &&
                    !auth.clientDb.canDelete &&
                    !auth.clientOnboarding.canEdit &&
                    !auth.clientOnboarding.canDelete &&
                    !auth.portfolioReview.canEdit &&
                    !auth.portfolioReview.canDelete;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 truncate">
                                {emp.name}
                              </span>
                              {emp.employeeCode && (
                                <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                                  #{emp.employeeCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-medium text-slate-600">{emp.department}</span>
                              <span>•</span>
                              <span>{emp.position}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 1. Client Database Permissions */}
                      <td className="py-3 px-3 border-l border-slate-100 bg-blue-50/15">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {/* Edit / Update Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "clientDb", "canEdit")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.clientDb.canEdit
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                            }`}
                            title="Toggle Edit & Update authority for Client Database"
                          >
                            <span className="text-[10px] font-bold tracking-tight">EDIT</span>
                            {auth.clientDb.canEdit ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>

                          {/* Delete Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "clientDb", "canDelete")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.clientDb.canDelete
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-rose-300 hover:text-rose-600"
                            }`}
                            title="Toggle Delete authority for Client Database"
                          >
                            <span className="text-[10px] font-bold tracking-tight">DELETE</span>
                            {auth.clientDb.canDelete ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>
                        </div>
                      </td>

                      {/* 2. Client Onboarding Permissions */}
                      <td className="py-3 px-3 border-l border-slate-100 bg-emerald-50/15">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {/* Edit / Update Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "clientOnboarding", "canEdit")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.clientOnboarding.canEdit
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                            }`}
                            title="Toggle Edit & Update authority for Client Onboard"
                          >
                            <span className="text-[10px] font-bold tracking-tight">EDIT</span>
                            {auth.clientOnboarding.canEdit ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>

                          {/* Delete Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "clientOnboarding", "canDelete")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.clientOnboarding.canDelete
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-rose-300 hover:text-rose-600"
                            }`}
                            title="Toggle Delete authority for Client Onboard"
                          >
                            <span className="text-[10px] font-bold tracking-tight">DELETE</span>
                            {auth.clientOnboarding.canDelete ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>
                        </div>
                      </td>

                      {/* 3. Portfolio Review Permissions */}
                      <td className="py-3 px-3 border-l border-slate-100 bg-purple-50/15">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {/* Edit / Update Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "portfolioReview", "canEdit")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.portfolioReview.canEdit
                                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-purple-300 hover:text-purple-600"
                            }`}
                            title="Toggle Edit & Update authority for Portfolio Review"
                          >
                            <span className="text-[10px] font-bold tracking-tight">EDIT</span>
                            {auth.portfolioReview.canEdit ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>

                          {/* Delete Toggle */}
                          <label
                            onClick={() => handleToggle(emp.id, "portfolioReview", "canDelete")}
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border transition-all cursor-pointer ${
                              auth.portfolioReview.canDelete
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white text-slate-400 border-slate-200 hover:border-rose-300 hover:text-rose-600"
                            }`}
                            title="Toggle Delete authority for Portfolio Review"
                          >
                            <span className="text-[10px] font-bold tracking-tight">DELETE</span>
                            {auth.portfolioReview.canDelete ? (
                              <Check className="size-3.5 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <span className="size-3.5 mt-0.5 rounded-full border border-slate-300" />
                            )}
                          </label>
                        </div>
                      </td>

                      {/* Row Quick Action */}
                      <td className="py-3 px-4 border-l border-slate-100 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRowGrantAll(emp.id)}
                            disabled={isFull}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Grant Full Edit & Delete on all 3 CBI Modules"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowRevokeAll(emp.id)}
                            disabled={hasNone}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Revoke all CBI Edit & Delete authorities"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-indigo-600 shrink-0" />
            <span>
              All system administrators always retain unrestricted master authority across all CBI modules.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            DS Nexus CBI Authorization Security
          </span>
        </div>
      </div>
    </div>
  );
};

export default CbiAuthorization;
