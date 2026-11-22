import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Search,
  Download,
  Eye,
  Trash2,
  X,
  Check,
  AlertCircle,
  FileCheck2,
  UserCheck,
  Users,
  RefreshCw,
  Loader2,
  Database,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useCbiPermissions } from "../../hooks/useCbiPermissions";

export interface ClientOnboardData {
  _id: string;
  clientId?: string;
  clientCode?: string;
  firstApplicantName: string;
  secondApplicantName?: string;
  thirdApplicantName?: string;
  placeOfBirth?: string;
  occupation?: string;
  annualIncome?: string;
  email?: string;
  mobile?: string;
  motherName?: string;
  permanentAddress?: string;
  correspondenceAddress?: string;
  nominee?: string;
  maritalStatus?: string;
  modeOfHolding: "SINGLE" | "JOINT" | "ANYONE OR SURVIVOR";
  panCardSubmitted: boolean;
  aadharCardSubmitted: boolean;
  passportPhotoSubmitted: boolean;
  cancelledChequeSubmitted: boolean;
  onboardingDate: string;
  status: "Onboarded" | "Under Review" | "Pending" | "Completed";
  notes?: string;
  createdAt?: string;
}

interface ClientOption {
  _id: string;
  clientCode?: string;
  clientName: string;
  pan?: string;
  aadhar?: string;
  mobile?: string;
  email?: string;
  occupation?: string;
  income?: string;
  motherName?: string;
  address?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nominees?: Array<{ name: string; relation: string }>;
  rm?: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  Onboarded: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Completed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Under Review": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Pending: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const formatIncome = (val?: string) => {
  if (!val) return "—";
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "10 - 25 lac";
  if (trimmed.startsWith("₹") || trimmed.toLowerCase().includes("lac") || trimmed.toLowerCase().includes("lakh")) {
    return trimmed;
  }
  return `₹ ${trimmed}`;
};

const CbiClientOnboard: React.FC = () => {
  const { isAdmin, clientOnboarding } = useCbiPermissions();
  const canEdit = isAdmin || clientOnboarding.canEdit;
  const canDelete = isAdmin || clientOnboarding.canDelete;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [records, setRecords] = useState<ClientOnboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    singleHolding: 0,
    jointHolding: 0,
    docsComplete: 0,
  });

  // Search & Filter
  const [search, setSearch] = useState("");
  const [holdingFilter, setHoldingFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [docsFilter, setDocsFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Client Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete search against Client Database (Single source of truth)
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<ClientOption[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
  const [selectedClientMaster, setSelectedClientMaster] = useState<ClientOption | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Form State (matching official Client Form in uploaded PDF)
  const [formData, setFormData] = useState({
    clientId: "",
    clientCode: "",
    firstApplicantName: "",
    secondApplicantName: "",
    thirdApplicantName: "",
    placeOfBirth: "",
    occupation: "",
    annualIncome: "",
    email: "",
    mobile: "",
    motherName: "",
    permanentAddress: "",
    correspondenceAddress: "",
    sameAsPermanent: true,
    nominee: "",
    maritalStatus: "Unmarried",
    modeOfHolding: "SINGLE" as "SINGLE" | "JOINT" | "ANYONE OR SURVIVOR",
    panCardSubmitted: true,
    aadharCardSubmitted: true,
    passportPhotoSubmitted: true,
    cancelledChequeSubmitted: true,
    onboardingDate: new Date().toISOString().slice(0, 10),
    status: "Onboarded" as "Onboarded" | "Under Review" | "Pending" | "Completed",
    notes: "",
  });

  // Drawer / View Details
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClientOnboardData | null>(null);
  const [drawerFormData, setDrawerFormData] = useState<Partial<ClientOnboardData>>({});
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Fetch Onboarded Clients
  const fetchOnboardedClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/onboarding");
      if (res.data?.success) {
        setRecords(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch onboarded clients:", err);
      toast.error("Failed to load onboarded clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboardedClients();
  }, [fetchOnboardedClients]);

  // Handle outside click for client search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsClientSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for clients from Client Database
  useEffect(() => {
    if (!clientSearchQuery.trim()) {
      setClientSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingClient(true);
        const res = await api.get("/cbi/onboarding/search-clients", {
          params: { q: clientSearchQuery.trim() },
        });
        if (res.data?.success) {
          setClientSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error("Client search error:", err);
      } finally {
        setIsSearchingClient(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [clientSearchQuery]);

  // Auto-populate when existing client is chosen (Zero manual re-entry!)
  const handleSelectExistingClient = (c: ClientOption) => {
    setSelectedClientMaster(c);
    setClientSearchQuery(c.clientName);
    setIsClientSearchFocused(false);

    setFormData((prev) => ({
      ...prev,
      clientId: c._id,
      clientCode: c.clientCode || "",
      firstApplicantName: c.clientName || prev.firstApplicantName,
      mobile: c.mobile || prev.mobile,
      email: c.email || prev.email,
      occupation: c.occupation || prev.occupation,
      annualIncome: c.income || prev.annualIncome,
      motherName: c.motherName || prev.motherName,
      permanentAddress: c.address || prev.permanentAddress,
      correspondenceAddress: c.address || prev.correspondenceAddress,
      nominee: Array.isArray(c.nominees) && c.nominees.length > 0
        ? c.nominees.map((n: any) => `${n.name}${n.relation ? ` (${n.relation})` : ""}`).join(", ")
        : c.nomineeName
        ? `${c.nomineeName}${c.nomineeRelation ? ` (${c.nomineeRelation})` : ""}`
        : prev.nominee,
      panCardSubmitted: !!c.pan,
      aadharCardSubmitted: !!c.aadhar,
    }));

    toast.success(`Populated master details for ${c.clientName}`);
  };

  const handleClearSelectedClient = () => {
    setSelectedClientMaster(null);
    setClientSearchQuery("");
    setIsClientSearchFocused(false);
    setFormData((prev) => ({
      ...prev,
      clientId: "",
      clientCode: "",
      firstApplicantName: "",
      mobile: "",
      email: "",
      occupation: "",
      annualIncome: "",
      motherName: "",
      permanentAddress: "",
      correspondenceAddress: "",
      nominee: "",
    }));
  };

  // Listen for ?clientId= in URL (Smooth handoff from Stage 1: Client Database -> Stage 2: Client Onboarding)
  useEffect(() => {
    const paramClientId = searchParams.get("clientId");
    if (!paramClientId) return;

    api
      .get(`/cbi/clients/${paramClientId}`)
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const c = res.data.data;
          handleSelectExistingClient({
            _id: c._id,
            clientName: c.clientName,
            clientCode: c.clientCode,
            pan: c.pan,
            aadhar: c.aadhar,
            mobile: c.mobile || c.phone,
            email: c.email,
            occupation: c.occupation,
            income: c.income,
            motherName: c.motherName,
            address: c.address,
            nomineeName: c.nomineeName,
            nomineeRelation: c.nomineeRelation,
            rm: c.rm,
          });
          setIsAddModalOpen(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching client master:", err);
      });
  }, [searchParams]);

  // Submit Add Client Form
  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstApplicantName.trim()) {
      toast.error("1st Applicant Name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        correspondenceAddress: formData.sameAsPermanent
          ? formData.permanentAddress
          : formData.correspondenceAddress,
      };

      const res = await api.post("/cbi/onboarding", payload);
      if (res.data?.success) {
        toast.success(res.data.message || "Client onboarded successfully!");
        setIsAddModalOpen(false);
        // Reset form
        setFormData({
          clientId: "",
          clientCode: "",
          firstApplicantName: "",
          secondApplicantName: "",
          thirdApplicantName: "",
          placeOfBirth: "",
          occupation: "",
          annualIncome: "",
          email: "",
          mobile: "",
          motherName: "",
          permanentAddress: "",
          correspondenceAddress: "",
          sameAsPermanent: true,
          nominee: "",
          maritalStatus: "Unmarried",
          modeOfHolding: "SINGLE",
          panCardSubmitted: true,
          aadharCardSubmitted: true,
          passportPhotoSubmitted: true,
          cancelledChequeSubmitted: true,
          onboardingDate: new Date().toISOString().slice(0, 10),
          status: "Onboarded",
          notes: "",
        });
        setSelectedClientMaster(null);
        setClientSearchQuery("");
        fetchOnboardedClients();
      }
    } catch (err: any) {
      console.error("Failed to onboard client:", err);
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to onboard client");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Drawer (View/Edit)
  const handleOpenDrawer = (record: ClientOnboardData) => {
    setSelectedRecord(record);
    setDrawerFormData({ ...record });
    setIsDrawerOpen(true);
  };

  // Save changes from Drawer (ADMIN or AUTHORIZED STAFF)
  const handleSaveDrawer = async () => {
    if (!canEdit || !selectedRecord) return;
    try {
      setIsSavingDrawer(true);
      const res = await api.put(`/cbi/onboarding/${selectedRecord._id}`, drawerFormData);
      if (res.data?.success) {
        toast.success("Onboarded client details updated successfully");
        setRecords((prev) =>
          prev.map((r) => (r._id === selectedRecord._id ? { ...r, ...drawerFormData } : r))
        );
        setIsDrawerOpen(false);
        fetchOnboardedClients();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to update client");
    } finally {
      setIsSavingDrawer(false);
    }
  };

  // Delete Onboarded Client (PERMANENT HARD DELETE - ADMIN or AUTHORIZED STAFF)
  const handleDeleteRecord = async (id: string, name: string) => {
    if (!canDelete) {
      toast.error("Authority required to delete client onboarding records");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete the onboarding record for "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/cbi/onboarding/${id}`);
      toast.success(`Onboarding record for "${name}" permanently deleted`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      if (selectedRecord?._id === id) {
        setIsDrawerOpen(false);
      }
      fetchOnboardedClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to delete record");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (records.length === 0) {
      toast.error("No onboarding records to export");
      return;
    }

    const exportRows = filteredRecords.map((r, i) => ({
      "SL No.": i + 1,
      "Client Code": r.clientCode || "-",
      "1st Applicant Name": r.firstApplicantName,
      "2nd Applicant Name": r.secondApplicantName || "-",
      "3rd Applicant Name": r.thirdApplicantName || "-",
      "Place of Birth": r.placeOfBirth || "-",
      Occupation: r.occupation || "-",
      "Annual Income (INR)": r.annualIncome || "-",
      "Email ID": r.email || "-",
      "Mobile No.": r.mobile || "-",
      "Mother's Name": r.motherName || "-",
      "Permanent Address": r.permanentAddress || "-",
      "Correspondence Address": r.correspondenceAddress || "-",
      Nominee: r.nominee || "-",
      "Marital Status": r.maritalStatus || "-",
      "Mode of Holding": r.modeOfHolding,
      "PAN Card Attached": r.panCardSubmitted ? "Yes" : "No",
      "Aadhar Attached": r.aadharCardSubmitted ? "Yes" : "No",
      "Photo Attached": r.passportPhotoSubmitted ? "Yes" : "No",
      "Cheque Attached": r.cancelledChequeSubmitted ? "Yes" : "No",
      "Onboarding Date": r.onboardingDate || "-",
      Status: r.status,
      Notes: r.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Client Onboard");
    XLSX.writeFile(
      workbook,
      `Client_Onboard_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Client onboarding directory exported to Excel");
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = r.firstApplicantName?.toLowerCase().includes(q);
        const matchesName2 = r.secondApplicantName?.toLowerCase().includes(q);
        const matchesCode = (r.clientCode || "").toLowerCase().includes(q);
        const matchesMobile = (r.mobile || "").toLowerCase().includes(q);
        const matchesEmail = (r.email || "").toLowerCase().includes(q);
        const matchesPlace = (r.placeOfBirth || "").toLowerCase().includes(q);
        const matchesNominee = (r.nominee || "").toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesName2 &&
          !matchesCode &&
          !matchesMobile &&
          !matchesEmail &&
          !matchesPlace &&
          !matchesNominee
        ) {
          return false;
        }
      }

      if (holdingFilter !== "ALL" && r.modeOfHolding !== holdingFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }

      if (docsFilter === "COMPLETE") {
        if (
          !r.panCardSubmitted ||
          !r.aadharCardSubmitted ||
          !r.passportPhotoSubmitted ||
          !r.cancelledChequeSubmitted
        ) {
          return false;
        }
      } else if (docsFilter === "PENDING") {
        if (
          r.panCardSubmitted &&
          r.aadharCardSubmitted &&
          r.passportPhotoSubmitted &&
          r.cancelledChequeSubmitted
        ) {
          return false;
        }
      }

      return true;
    });
  }, [records, search, holdingFilter, statusFilter, docsFilter]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20">
            <UserPlus className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Client Onboarding
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Official applicant records, document compliance, and account opening directory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchOnboardedClients}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Refresh Registry"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="size-3.5 text-emerald-600" />
            <span>Export to Excel</span>
          </button>

          {/* Add Client Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>+ Add Client</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Onboarded
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Single Holding
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.singleHolding}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Joint / Multi-Holder
            </p>
            <p className="text-2xl font-black text-purple-700 mt-1">{stats.jointHolding}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Users className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              100% Docs Complete
            </p>
            <p className="text-2xl font-black text-blue-700 mt-1">{stats.docsComplete}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <FileCheck2 className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Filters and Search Bar - All in 1 Line */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2.5 overflow-x-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search applicant name, code, mobile, email, place..."
              className="w-full !pl-10 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode of Holding Filter */}
            <select
              value={holdingFilter}
              onChange={(e) => {
                setHoldingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="shrink-0 !w-auto min-w-[155px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Holding Modes</option>
              <option value="SINGLE">Single</option>
              <option value="JOINT">Joint</option>
              <option value="ANYONE OR SURVIVOR">Anyone or Survivor</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="shrink-0 !w-auto min-w-[130px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Onboarded">Onboarded</option>
              <option value="Completed">Completed</option>
              <option value="Under Review">Under Review</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Document Filter */}
            <select
              value={docsFilter}
              onChange={(e) => {
                setDocsFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="shrink-0 !w-auto min-w-[155px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">All Documents</option>
              <option value="COMPLETE">All 4 Docs Submitted</option>
              <option value="PENDING">Pending Documents</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 text-left min-w-[210px]">Group Head</th>
                <th className="py-3 px-3 text-left w-36">Place of Birth</th>
                <th className="py-3 px-3 text-left w-44">Occupation & Income</th>
                <th className="py-3 px-3 text-left min-w-[190px]">Contact Details</th>
                <th className="py-3 px-3 text-left w-40">Mother's Name</th>
                <th className="py-3 px-3 text-center w-36">Mode of Holding</th>
                <th className="py-3 px-3 text-left min-w-[200px]">Nominee Details</th>
                <th className="py-3 px-3 text-center w-40">Attached Docs</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span className="font-medium">Loading onboarding directory...</span>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <AlertCircle className="size-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No client onboarding records found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Client" above to onboard a new applicant
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const hasJoint = !!r.secondApplicantName || !!r.thirdApplicantName;
                  const docsCount = [
                    r.panCardSubmitted,
                    r.aadharCardSubmitted,
                    r.passportPhotoSubmitted,
                    r.cancelledChequeSubmitted,
                  ].filter(Boolean).length;

                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer border-b border-slate-100"
                      onClick={() => handleOpenDrawer(r)}
                    >
                      {/* 1st Applicant */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {r.firstApplicantName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {r.clientCode ? (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {r.clientCode}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No code</span>
                            )}
                            {hasJoint && (
                              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 font-bold px-1.5 py-0.5 rounded">
                                Joint Holding
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Place of Birth */}
                      <td className="py-3.5 px-3 align-middle text-slate-700">
                        {r.placeOfBirth ? (
                          <span className="font-medium text-slate-800">{r.placeOfBirth}</span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Occupation & Income */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="font-semibold text-slate-800">
                          {r.occupation || "Service"}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium font-mono mt-0.5">
                          {formatIncome(r.annualIncome)}
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="font-mono font-medium text-slate-800 text-[11px]">
                          {r.mobile ? r.mobile : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5" title={r.email}>
                          {r.email || "—"}
                        </div>
                      </td>

                      {/* Mother's Name */}
                      <td className="py-3.5 px-3 align-middle text-slate-700">
                        {r.motherName ? (
                          <span className="font-medium text-slate-800">{r.motherName}</span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Mode of Holding */}
                      <td className="py-3.5 px-3 align-middle text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${r.modeOfHolding === "SINGLE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.modeOfHolding === "JOINT"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                          {r.modeOfHolding}
                        </span>
                        {r.maritalStatus && (
                          <div className="text-[10px] font-medium text-slate-400 mt-1">
                            {r.maritalStatus}
                          </div>
                        )}
                      </td>

                      {/* Nominee */}
                      <td className="py-3.5 px-3 align-middle">
                        {r.nominee ? (
                          <div className="max-w-[200px]">
                            <div className="font-medium text-slate-900 leading-tight">
                              {r.nominee.replace(/\s*\([^)]*\)$/, "")}
                            </div>
                            {r.nominee.includes("(") && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {r.nominee.match(/\(([^)]+)\)/)?.[1] || ""}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Document Checklist Badges */}
                      <td className="py-3.5 px-3 align-middle text-center">
                        <div className="inline-flex items-center gap-1">
                          <span
                            title={`PAN Card: ${r.panCardSubmitted ? "Submitted & Verified" : "Pending"}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.panCardSubmitted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                          >
                            PAN
                          </span>
                          <span
                            title={`Aadhar Card: ${r.aadharCardSubmitted ? "Submitted & Verified" : "Pending"}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.aadharCardSubmitted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                          >
                            AAD
                          </span>
                          <span
                            title={`Passport Photo: ${r.passportPhotoSubmitted ? "Submitted & Verified" : "Pending"}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.passportPhotoSubmitted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                          >
                            PHT
                          </span>
                          <span
                            title={`Cancelled Cheque: ${r.cancelledChequeSubmitted ? "Submitted & Verified" : "Pending"}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.cancelledChequeSubmitted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                          >
                            CHQ
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 font-medium">
                          {docsCount}/4 verified
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${(STATUS_BADGES[r.status] || STATUS_BADGES.Onboarded).bg
                            } ${(STATUS_BADGES[r.status] || STATUS_BADGES.Onboarded).text
                            } ${(STATUS_BADGES[r.status] || STATUS_BADGES.Onboarded).border
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="py-3.5 px-3 align-middle text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDrawer(r)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer border border-slate-200"
                            title={canEdit ? "View / Edit Onboarding Dossier" : "View Onboarding Dossier"}
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {/* Proceed to Stage 3: Portfolio Review */}
                          <button
                            onClick={() =>
                              navigate(
                                `/cbi/portfolio-review?clientId=${r.clientId || ""}&onboardId=${r._id}`
                              )
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer border border-slate-200"
                            title="Stage 3: Portfolio Review (Auto-fetches Master & Onboarding Data)"
                          >
                            <UserCheck className="size-3.5" />
                          </button>

                          {/* Delete (ADMIN or AUTHORIZED STAFF) */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteRecord(r._id, r.firstApplicantName)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
                              title="Permanently Delete Onboarding Record"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-900">
              {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{filteredRecords.length}</span> entries
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 whitespace-nowrap">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ADD CLIENT MODAL (Matches Client Form in uploaded PDF) */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/80 text-white">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Client Onboarding Form</h3>
                  <p className="text-xs text-indigo-200">
                    Mudra Asset Services Investment & Compliance Requisites
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddClientSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* 0. AUTO-FETCH FROM CLIENT DATABASE (SINGLE SOURCE OF TRUTH) */}
              <div
                ref={searchContainerRef}
                className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/90 relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Database className="size-3.5 text-indigo-600" />
                    <span>Prefill from Client Database / Portfolio Review (Single Source of Truth)</span>
                  </label>
                  {selectedClientMaster && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Check className="size-3" /> Auto-populated
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientSearchFocused(true);
                    }}
                    onFocus={() => {
                      if (clientSearchQuery.trim()) setIsClientSearchFocused(true);
                    }}
                    placeholder="Type client name, C.Code, PAN, or mobile to auto-populate existing records..."
                    className="w-full !pl-10 pr-9 py-2.5 rounded-lg bg-white border border-indigo-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  {clientSearchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSelectedClient}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown (Only appears when typing starts) */}
                {isClientSearchFocused && clientSearchQuery.trim().length > 0 && (
                  <div className="absolute left-4 right-4 top-full mt-1.5 z-40 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {isSearchingClient ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        <Loader2 className="size-4 animate-spin inline mr-1" /> Searching master database...
                      </div>
                    ) : clientSearchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No client found matching "{clientSearchQuery}". You can enter new details below.
                      </div>
                    ) : (
                      clientSearchResults.map((c) => (
                        <div
                          key={c._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectExistingClient(c);
                          }}
                          className="p-2.5 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{c.clientName}</span>
                            <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border">
                              {c.clientCode || "No Code"}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {c.pan && <span className="mr-3">PAN: {c.pan}</span>}
                              {c.mobile && <span className="mr-3">Mob: {c.mobile}</span>}
                              {c.occupation && <span>Occ: {c.occupation}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            Select
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 1. APPLICANT DETAILS (PDF: Group Head Name / 1st Applicant, 2nd, 3rd) */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Users className="size-4 text-indigo-600" />
                  <span>Applicant Names (As per Client Form)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Group Head / 1st Applicant *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstApplicantName}
                      onChange={(e) => setFormData({ ...formData, firstApplicantName: e.target.value })}
                      placeholder="e.g. SURAJ NIHAL"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      2nd Applicant Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.secondApplicantName}
                      onChange={(e) => setFormData({ ...formData, secondApplicantName: e.target.value })}
                      placeholder="For joint account..."
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      3rd Applicant Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.thirdApplicantName}
                      onChange={(e) => setFormData({ ...formData, thirdApplicantName: e.target.value })}
                      placeholder="For 3rd joint holder..."
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 2. REQUISITE PARTICULARS (From PDF Rows) */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Briefcase className="size-4 text-indigo-600" />
                  <span>Personal, Contact & Socio-Economic Particulars</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Place of Birth</label>
                    <input
                      type="text"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                      placeholder="e.g. BHILAI (C.G.)"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      placeholder="e.g. STUDENT / Business / Service"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Annual Income</label>
                    <input
                      type="text"
                      value={formData.annualIncome}
                      onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                      placeholder="e.g. 190570/-"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email ID *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. ADVSURAJNIHAL@GMAIL.COM"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mobile No. *</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. 9131469351"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      placeholder="e.g. Mrs. DEVKI NIHAL"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Marital Status</label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                      <option value="Single">Single</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mode of Holding</label>
                    <select
                      value={formData.modeOfHolding}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          modeOfHolding: e.target.value as "SINGLE" | "JOINT" | "ANYONE OR SURVIVOR",
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="SINGLE">SINGLE</option>
                      <option value="JOINT">JOINT</option>
                      <option value="ANYONE OR SURVIVOR">ANYONE OR SURVIVOR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nominee & Relation</label>
                    <input
                      type="text"
                      value={formData.nominee}
                      onChange={(e) => setFormData({ ...formData, nominee: e.target.value })}
                      placeholder="e.g. Mr. NIRAKAR NIHAL (FATHER)"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 3. ADDRESSES (PDF: Permanent Address & Correspondence Address) */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <MapPin className="size-4 text-indigo-600" />
                    <span>Address Details (As per Aadhar Card)</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sameAsPermanent}
                      onChange={(e) => setFormData({ ...formData, sameAsPermanent: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Correspondence is same as Permanent</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Permanent Address ** (or as per aadhar card)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.permanentAddress}
                      onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                      placeholder="e.g. 255, Shankar Para, Station Maroda, Bhilai, Durg Chhattisgarh - 491107"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {!formData.sameAsPermanent && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Correspondence Address ** (if different)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.correspondenceAddress}
                        onChange={(e) => setFormData({ ...formData, correspondenceAddress: e.target.value })}
                        placeholder="Current correspondence address..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. DOCUMENT CHECKLIST (From PDF: List of documents to be attached) */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <FileCheck2 className="size-4 text-indigo-600" />
                  <span>List of Documents to be Attached with this Form</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.panCardSubmitted
                        ? "bg-indigo-50/70 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.panCardSubmitted}
                      onChange={(e) => setFormData({ ...formData, panCardSubmitted: e.target.checked })}
                      className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 select-none">
                      Pan-card Copy (self attested)
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.aadharCardSubmitted
                        ? "bg-indigo-50/70 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.aadharCardSubmitted}
                      onChange={(e) => setFormData({ ...formData, aadharCardSubmitted: e.target.checked })}
                      className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 select-none">
                      Aadhar Card copy (self attested)
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.passportPhotoSubmitted
                        ? "bg-indigo-50/70 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.passportPhotoSubmitted}
                      onChange={(e) => setFormData({ ...formData, passportPhotoSubmitted: e.target.checked })}
                      className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 select-none">
                      Passport photo with cross signature
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.cancelledChequeSubmitted
                        ? "bg-indigo-50/70 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.cancelledChequeSubmitted}
                      onChange={(e) => setFormData({ ...formData, cancelledChequeSubmitted: e.target.checked })}
                      className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 select-none">
                      Cancelled Cheque (registered bank account)
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  <span>Submit Client Onboarding</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW / EDIT DOSSIER DRAWER                                */}
      {/* ======================================================== */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)} />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">Client Onboarding</h2>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${(STATUS_BADGES[drawerFormData.status || "Onboarded"] || STATUS_BADGES.Onboarded).bg
                        } ${(STATUS_BADGES[drawerFormData.status || "Onboarded"] || STATUS_BADGES.Onboarded).text
                        } ${(STATUS_BADGES[drawerFormData.status || "Onboarded"] || STATUS_BADGES.Onboarded).border
                        }`}
                    >
                      {drawerFormData.status}
                    </span>
                    {!canEdit && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        View Only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official Client Record for{" "}
                    <span className="font-semibold text-slate-800">{drawerFormData.firstApplicantName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0 m-0">
                  {/* Applicant Details */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="size-4 text-indigo-600" />
                      <span>Applicant Particulars</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          1st Applicant / Group Head Name *
                        </label>
                        <input
                          type="text"
                          value={drawerFormData.firstApplicantName || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, firstApplicantName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          2nd Applicant Name
                        </label>
                        <input
                          type="text"
                          value={drawerFormData.secondApplicantName || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, secondApplicantName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          3rd Applicant Name
                        </label>
                        <input
                          type="text"
                          value={drawerFormData.thirdApplicantName || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, thirdApplicantName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal & Contact Particulars */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="size-4 text-indigo-600" />
                      <span>Socio-Economic & Contact Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Place of Birth</label>
                        <input
                          type="text"
                          value={drawerFormData.placeOfBirth || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, placeOfBirth: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Occupation</label>
                        <input
                          type="text"
                          value={drawerFormData.occupation || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, occupation: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Annual Income</label>
                        <input
                          type="text"
                          value={drawerFormData.annualIncome || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, annualIncome: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mother's Name</label>
                        <input
                          type="text"
                          value={drawerFormData.motherName || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, motherName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mobile No.</label>
                        <input
                          type="text"
                          value={drawerFormData.mobile || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, mobile: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email ID</label>
                        <input
                          type="email"
                          value={drawerFormData.email || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, email: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Marital Status</label>
                        <select
                          value={drawerFormData.maritalStatus || "Unmarried"}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, maritalStatus: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        >
                          <option value="Unmarried">Unmarried</option>
                          <option value="Married">Married</option>
                          <option value="Single">Single</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mode of Holding</label>
                        <select
                          value={drawerFormData.modeOfHolding || "SINGLE"}
                          onChange={(e) =>
                            setDrawerFormData({
                              ...drawerFormData,
                              modeOfHolding: e.target.value as "SINGLE" | "JOINT" | "ANYONE OR SURVIVOR",
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="SINGLE">SINGLE</option>
                          <option value="JOINT">JOINT</option>
                          <option value="ANYONE OR SURVIVOR">ANYONE OR SURVIVOR</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nominee</label>
                        <input
                          type="text"
                          value={drawerFormData.nominee || ""}
                          onChange={(e) => setDrawerFormData({ ...drawerFormData, nominee: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="size-4 text-indigo-600" />
                      <span>Address Details</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Permanent Address (as per aadhar card)
                        </label>
                        <textarea
                          rows={2}
                          value={drawerFormData.permanentAddress || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, permanentAddress: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Correspondence Address
                        </label>
                        <textarea
                          rows={2}
                          value={drawerFormData.correspondenceAddress || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, correspondenceAddress: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Compliance Checklist */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck2 className="size-4 text-indigo-600" />
                      <span>Attached Form Documents</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${drawerFormData.panCardSubmitted
                            ? "bg-indigo-50/70 border-indigo-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!drawerFormData.panCardSubmitted}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, panCardSubmitted: e.target.checked })
                          }
                          className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 select-none">
                          Pan-card Copy (self attested)
                        </span>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${drawerFormData.aadharCardSubmitted
                            ? "bg-indigo-50/70 border-indigo-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!drawerFormData.aadharCardSubmitted}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, aadharCardSubmitted: e.target.checked })
                          }
                          className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 select-none">
                          Aadhar Card copy (self attested)
                        </span>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${drawerFormData.passportPhotoSubmitted
                            ? "bg-indigo-50/70 border-indigo-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!drawerFormData.passportPhotoSubmitted}
                          onChange={(e) =>
                            setDrawerFormData({
                              ...drawerFormData,
                              passportPhotoSubmitted: e.target.checked,
                            })
                          }
                          className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 select-none">
                          Passport photo with cross signature
                        </span>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${drawerFormData.cancelledChequeSubmitted
                            ? "bg-indigo-50/70 border-indigo-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!drawerFormData.cancelledChequeSubmitted}
                          onChange={(e) =>
                            setDrawerFormData({
                              ...drawerFormData,
                              cancelledChequeSubmitted: e.target.checked,
                            })
                          }
                          className="!w-4 !h-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 select-none">
                          Cancelled Cheque (registered bank account)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Status & Review Notes */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <span>Status & Internal Notes</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Onboarding Status
                        </label>
                        <select
                          value={drawerFormData.status || "Onboarded"}
                          onChange={(e) =>
                            setDrawerFormData({
                              ...drawerFormData,
                              status: e.target.value as ClientOnboardData["status"],
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800"
                        >
                          <option value="Onboarded">Onboarded</option>
                          <option value="Completed">Completed</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Onboarding Date
                        </label>
                        <input
                          type="date"
                          value={drawerFormData.onboardingDate || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, onboardingDate: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Internal Notes
                        </label>
                        <textarea
                          rows={2}
                          value={drawerFormData.notes || ""}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, notes: e.target.value })
                          }
                          placeholder="Verification or onboarding remarks..."
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate(
                        `/cbi/portfolio-review?clientId=${selectedRecord?.clientId || ""}&onboardId=${selectedRecord?._id || ""}`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all cursor-pointer shadow-xs"
                    title="Proceed to Stage 3: Portfolio Review"
                  >
                    <UserCheck className="size-3.5" />
                    <span>Portfolio Review</span>
                  </button>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSaveDrawer}
                    disabled={isSavingDrawer}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingDrawer ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbiClientOnboard;
