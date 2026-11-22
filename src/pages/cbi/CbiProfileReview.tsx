import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Send,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  CalendarDays,
  MessageSquare,
  Mail,
  Database,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import toast from "react-hot-toast";
import logo from "../../assets/favicon.png";
import { generatePortfolioReviewPdf } from "../../utils/portfolioReviewPdfGenerator";
import { useCbiPermissions } from "../../hooks/useCbiPermissions";

export interface TimelineItem {
  _id?: string;
  type: "intimation" | "meeting" | "note" | "status_change" | "resolution";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  status: string;
}

export interface PortfolioReviewItem {
  _id: string;
  clientId?: string;
  onboardingId?: string;
  clientName: string;
  ucc?: string;
  clientCode?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  modeOfHolding?: string;
  jointApplicants?: string;
  nominee?: string;
  address?: string;
  occupation?: string;
  annualIncome?: string;
  onboardingStatus?: string;
  fiscalYear?: string;
  reviewDate?: string;
  reviewedBy?: string;
  portfolioObservation?: string;
  recommendedAction?: string;
  whatsappIntimation1?: string;
  whatsappIntimation2?: string;
  emailIntimation1?: string;
  emailIntimation2?: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  intimation: string;
  resolutionDate?: string;
  resolutionTime?: string;
  assignedPerson: string;
  status: "Pending" | "In Progress" | "Completed" | "Deferred";
  notes?: string;
  timeline: TimelineItem[];
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  "In Progress": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  Completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  Deferred: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
};

const INTIMATION_COLORS: Record<string, string> = {
  "1st Time": "bg-sky-50 text-sky-700 border-sky-200",
  "2nd Time": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "3rd Time": "bg-amber-50 text-amber-700 border-amber-200",
  "3rd Time (Final)": "bg-rose-50 text-rose-700 border-rose-200",
  None: "bg-slate-50 text-slate-500 border-slate-200",
};

export const formatIST = (isoString?: string): string => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST"
    );
  } catch {
    return isoString;
  }
};

const CbiProfileReview: React.FC = () => {
  const { isAdmin, portfolioReview } = useCbiPermissions();
  const canEdit = isAdmin || portfolioReview.canEdit;
  const canDelete = isAdmin || portfolioReview.canDelete;
  const [searchParams] = useSearchParams();

  const [reviews, setReviews] = useState<PortfolioReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    deferred: 0,
  });

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [intimationFilter, setIntimationFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Assigned Persons
  const [assignedPersons, setAssignedPersons] = useState<string[]>([
    "Soumyasri",
    "Ruchi",
    "Amit",
    "Sumi",
  ]);

  // Drawer state
  const [selectedReview, setSelectedReview] = useState<PortfolioReviewItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFormData, setDrawerFormData] = useState<Partial<PortfolioReviewItem>>({});
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [newTimelineText, setNewTimelineText] = useState("");

  // Fetch reviews from API (auto-synchronized directly with Client Database)
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/reviews");
      if (res.data?.success) {
        setReviews(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch reviews:", err);
      toast.error("Failed to load portfolio reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch assigned persons & load portfolio reviews
  useEffect(() => {
    fetchReviews();

    api.get("/cbi/reviews/assigned-persons")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setAssignedPersons(res.data.data);
        }
      })
      .catch(() => {});
  }, [fetchReviews]);

  // Open Drawer and initialize edit form
  const handleOpenDrawer = (review: PortfolioReviewItem) => {
    setSelectedReview(review);
    setDrawerFormData({
      clientId: review.clientId,
      onboardingId: review.onboardingId,
      clientName: review.clientName,
      ucc: review.ucc || review.clientCode || "",
      clientCode: review.clientCode || review.ucc || "",
      pan: review.pan || "",
      mobile: review.mobile || "",
      email: review.email || "",
      modeOfHolding: review.modeOfHolding || "SINGLE",
      jointApplicants: review.jointApplicants || "",
      nominee: review.nominee || "",
      address: review.address || "",
      occupation: review.occupation || "",
      annualIncome: review.annualIncome || "",
      onboardingStatus: review.onboardingStatus || "Onboarded",
      fiscalYear: review.fiscalYear || "FY 2026–27",
      reviewDate: review.reviewDate || "11th Sept, 2026",
      reviewedBy: review.reviewedBy || `${review.assignedPerson || "Soumyasri"} & Team`,
      portfolioObservation: review.portfolioObservation || "",
      recommendedAction: review.recommendedAction || "",
      whatsappIntimation1: review.whatsappIntimation1 || "16/09/2026",
      whatsappIntimation2: review.whatsappIntimation2 || "DD/MM/YYYY",
      emailIntimation1: review.emailIntimation1 || "16/09/2026",
      emailIntimation2: review.emailIntimation2 || "DD/MM/YYYY",
      lastReviewDate: review.lastReviewDate || "",
      nextReviewDate: review.nextReviewDate || "",
      intimation: review.intimation || "1st Time",
      resolutionDate: review.resolutionDate || "",
      resolutionTime: review.resolutionTime || "",
      assignedPerson: review.assignedPerson || "Soumyasri",
      status: review.status || "Pending",
      notes: review.notes || "",
    });
    setNewTimelineText("");
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedReview(null);
  };

  // Listen for ?clientId= or ?onboardId= in URL (Auto-open review drawer for requested client)
  useEffect(() => {
    const paramClientId = searchParams.get("clientId");
    const paramOnboardId = searchParams.get("onboardId");
    if (!paramClientId && !paramOnboardId) return;

    if (reviews.length > 0) {
      const match = reviews.find(
        (r) =>
          (paramClientId && (r.clientId === paramClientId || r._id === paramClientId)) ||
          (paramOnboardId && r.onboardingId === paramOnboardId)
      );
      if (match) {
        handleOpenDrawer(match);
      }
    }
  }, [searchParams, reviews]);

  // Save drawer edits (ADMIN or AUTHORIZED STAFF)
  const handleSaveDrawer = async () => {
    if (!canEdit || !selectedReview) return;
    try {
      setSavingDrawer(true);
      const res = await api.put(`/cbi/reviews/${selectedReview._id}`, drawerFormData);
      if (res.data?.success) {
        toast.success("Portfolio review updated successfully");
        const updated = res.data.data;
        setSelectedReview(updated);
        setReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        fetchReviews();
      }
    } catch (err: any) {
      console.error("Save review error:", err);
      toast.error(err.response?.data?.message || "Failed to update review");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Delete review action (ADMIN or AUTHORIZED STAFF)
  const handleDeleteReview = async () => {
    if (!canDelete || !selectedReview) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the portfolio review for "${selectedReview.clientName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setSavingDrawer(true);
      const res = await api.delete(`/cbi/reviews/${selectedReview._id}`);
      if (res.data?.success) {
        toast.success(`Portfolio review for "${selectedReview.clientName}" permanently deleted`);
        handleCloseDrawer();
        fetchReviews();
      }
    } catch (err: any) {
      console.error("Delete review error:", err);
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to delete review");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Intimate Client action (ADMIN or AUTHORIZED STAFF)
  const handleIntimateClient = async () => {
    if (!canEdit || !selectedReview) return;
    try {
      const res = await api.post(`/cbi/reviews/${selectedReview._id}/intimate`);
      if (res.data?.success) {
        const updated = res.data.data;
        toast.success(`Communication record updated (${updated.intimation})`);
        setSelectedReview(updated);
        setDrawerFormData((prev) => ({
          ...prev,
          intimation: updated.intimation,
          status: updated.status,
          whatsappIntimation1: updated.whatsappIntimation1,
          whatsappIntimation2: updated.whatsappIntimation2,
          emailIntimation1: updated.emailIntimation1,
          emailIntimation2: updated.emailIntimation2,
        }));
        setReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        fetchReviews();
      }
    } catch (err: any) {
      toast.error("Failed to send intimation");
    }
  };

  // Mark Resolved action (ADMIN or AUTHORIZED STAFF)
  const handleMarkResolved = async () => {
    if (!canEdit || !selectedReview) return;
    try {
      const res = await api.post(`/cbi/reviews/${selectedReview._id}/resolve`);
      if (res.data?.success) {
        const updated = res.data.data;
        toast.success("Portfolio review marked as Resolved & Completed");
        setSelectedReview(updated);
        setDrawerFormData((prev) => ({
          ...prev,
          status: "Completed",
          resolutionDate: updated.resolutionDate,
          resolutionTime: updated.resolutionTime,
        }));
        setReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        fetchReviews();
      }
    } catch (err: any) {
      toast.error("Failed to resolve review");
    }
  };

  // Add custom Timeline Note
  const handleAddTimelineNote = async () => {
    if (!selectedReview || !newTimelineText.trim()) return;
    try {
      const res = await api.post(`/cbi/reviews/${selectedReview._id}/timeline`, {
        title: "Advisor Note Added",
        description: newTimelineText.trim(),
        type: "note",
      });
      if (res.data?.success) {
        toast.success("Timeline entry added");
        const updated = res.data.data;
        setSelectedReview(updated);
        setReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        setNewTimelineText("");
      }
    } catch (err: any) {
      toast.error("Failed to add note");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredReviews.length === 0) {
      toast.error("No portfolio reviews available to export");
      return;
    }

    const exportRows = filteredReviews.map((r, idx) => ({
      SN: idx + 1,
      "Client Name": r.clientName,
      "UCC / C.Code": r.ucc || r.clientCode || "-",
      "PAN No.": r.pan || "-",
      "Mobile No.": r.mobile || "-",
      "Email Address": r.email || "-",
      "Fiscal Year": r.fiscalYear || "FY 2026–27",
      "Review Date": r.reviewDate || r.lastReviewDate || "-",
      "Reviewed By": r.reviewedBy || `${r.assignedPerson} & Team`,
      "Next Review Date": r.nextReviewDate || "-",
      "Client Intimation": r.intimation || "-",
      "WhatsApp 1st Intimation": r.whatsappIntimation1 || "-",
      "WhatsApp 2nd Intimation": r.whatsappIntimation2 || "-",
      "Email 1st Intimation": r.emailIntimation1 || "-",
      "Email 2nd Intimation": r.emailIntimation2 || "-",
      "Portfolio Observation": r.portfolioObservation || "-",
      "Recommended Action": r.recommendedAction || "-",
      "Resolution Date": r.resolutionDate || "-",
      "Resolution Time": r.resolutionTime || "-",
      "Assigned Person": r.assignedPerson || "-",
      "Review Status": r.status,
      "Internal Notes": r.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio Reviews");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `CBI_Portfolio_Reviews_${dateStr}.xlsx`);
    toast.success("Excel report downloaded successfully!");
  };

  // Directly generate and download PDF using vector jsPDF (only when review is Completed)
  const handleDownloadPdf = (review: any) => {
    if (!review || !review.clientName) {
      toast.error("Invalid client review details for PDF export.");
      return;
    }
    if (String(review?.status || "").toLowerCase() !== "completed") {
      toast.error("PDF download is only enabled once review status is Completed.");
      return;
    }
    try {
      generatePortfolioReviewPdf(review);
      toast.success(`Portfolio Review PDF for ${review.clientName} downloaded!`);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = r.clientName.toLowerCase().includes(q);
        const matchesCode = (r.clientCode || r.ucc || "").toLowerCase().includes(q);
        const matchesPan = (r.pan || "").toLowerCase().includes(q);
        const matchesMobile = (r.mobile || "").toLowerCase().includes(q);
        const matchesAssigned = (r.assignedPerson || "").toLowerCase().includes(q);
        const matchesReviewedBy = (r.reviewedBy || "").toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesCode &&
          !matchesPan &&
          !matchesMobile &&
          !matchesAssigned &&
          !matchesReviewedBy
        ) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }

      // Assigned
      if (assignedFilter !== "ALL" && r.assignedPerson !== assignedFilter) {
        return false;
      }

      // Intimation
      if (intimationFilter !== "ALL" && r.intimation !== intimationFilter) {
        return false;
      }

      // Next Review Date
      if (dateFilter !== "ALL" && r.nextReviewDate) {
        const due = new Date(r.nextReviewDate);
        const now = new Date();
        if (dateFilter === "overdue") {
          if (due >= now) return false;
        } else if (dateFilter === "30days") {
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (due < now || due > in30) return false;
        }
      }

      return true;
    });
  }, [reviews, search, statusFilter, assignedFilter, intimationFilter, dateFilter]);

  // Paginated reviews
  const totalPages = Math.ceil(filteredReviews.length / rowsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredReviews.slice(start, start + rowsPerPage);
  }, [filteredReviews, page, rowsPerPage]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header (DS-Nexus Light Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs p-6 sm:p-7">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-12 w-52 h-52 bg-slate-50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Portfolio Review
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed font-normal">
              Track, intimate, schedule, and resolve client portfolio reviews with unified data directly synchronized with your Client Database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => fetchReviews()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Refresh Records"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-300 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-all cursor-pointer shadow-xs"
              title="Export Table to Excel"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Cards Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100/70 text-indigo-600 shrink-0">
              <UserCheck className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Reviews</p>
              <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100/70 text-amber-600 shrink-0">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending</p>
              <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100/70 text-blue-600 shrink-0">
              <RefreshCw className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">In Progress</p>
              <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100/70 text-emerald-600 shrink-0">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Completed</p>
              <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100/70 text-purple-600 shrink-0">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deferred</p>
              <p className="text-lg font-bold text-purple-600">{stats.deferred}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Filter Controls Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Client Name, C.Code, PAN, Mobile..."
              className="w-full !pl-10 pr-9 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Deferred">Deferred</option>
              </select>
            </div>

            {/* Assigned Person Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned:</span>
              <select
                value={assignedFilter}
                onChange={(e) => {
                  setAssignedFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Persons</option>
                {assignedPersons.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Intimation Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Intimation:</span>
              <select
                value={intimationFilter}
                onChange={(e) => {
                  setIntimationFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Intimations</option>
                <option value="1st Time">1st Time</option>
                <option value="2nd Time">2nd Time</option>
                <option value="3rd Time">3rd Time</option>
                <option value="None">None</option>
              </select>
            </div>

            {/* Next Review Date Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <CalendarDays className="size-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Next Review Date</option>
                <option value="30days">Due in 30 Days</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-3.5">Client Name</th>
                <th className="py-3 px-3.5">UCC / C.Code</th>
                <th className="py-3 px-3.5">PAN No.</th>
                <th className="py-3 px-3.5">Mobile No.</th>
                <th className="py-3 px-3.5">Review Date</th>
                <th className="py-3 px-3.5">Next Review</th>
                <th className="py-3 px-3.5">Intimation</th>
                <th className="py-3 px-3.5">Resolution Date/Time</th>
                <th className="py-3 px-3.5">Reviewed By / RM</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading portfolio review records...</span>
                  </td>
                </tr>
              ) : paginatedReviews.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <UserCheck className="size-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No portfolio reviews found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clients added in Client Database will automatically reflect here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((r, idx) => {
                  const statusStyle = STATUS_COLORS[r.status] || STATUS_COLORS.Pending;
                  const intimationStyle =
                    INTIMATION_COLORS[r.intimation] || "bg-slate-50 text-slate-600 border-slate-200";

                  return (
                    <tr key={r._id} className="hover:bg-indigo-50/30 transition-colors group">
                      {/* # SN */}
                      <td className="py-3.5 px-3.5 text-center font-mono text-slate-400">
                        {(page - 1) * rowsPerPage + idx + 1}
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-3.5">
                        <div
                          onClick={() => handleOpenDrawer(r)}
                          className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{r.clientName}</span>
                          {r.clientId && (
                            <span
                              title="Linked to Client Master (Single Source of Truth)"
                              className="size-1.5 rounded-full bg-emerald-500 shrink-0"
                            />
                          )}
                        </div>
                        {r.email && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {r.email}
                          </div>
                        )}
                      </td>

                      {/* UCC / C.Code */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                          {r.ucc || r.clientCode || "-"}
                        </span>
                      </td>

                      {/* PAN No */}
                      <td className="py-3.5 px-3.5 font-mono text-slate-600 font-medium">
                        {r.pan || "-"}
                      </td>

                      {/* Mobile No */}
                      <td className="py-3.5 px-3.5 text-slate-600">
                        {r.mobile ? <span>{r.mobile}</span> : "-"}
                      </td>

                      {/* Review Date */}
                      <td className="py-3.5 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                        {r.reviewDate || r.lastReviewDate || "-"}
                      </td>

                      {/* Next Review Date */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-800">
                        {r.nextReviewDate || "-"}
                      </td>

                      {/* Client Intimation */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${intimationStyle}`}
                        >
                          {r.intimation || "1st Time"}
                        </span>
                      </td>

                      {/* Resolution Date / Time */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600">
                        {r.resolutionDate ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-800">{r.resolutionDate}</span>
                            {r.resolutionTime && (
                              <div className="text-[11px] text-slate-400">{r.resolutionTime}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Assigned Person / RM */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <span className="size-2 rounded-full bg-indigo-500" />
                          <span>{r.assignedPerson || "Soumyasri"}</span>
                        </span>
                      </td>

                      {/* Review Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{r.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Export to PDF button: Enabled only when status is Completed */}
                          {(() => {
                            const isCompleted = String(r.status || "").toLowerCase() === "completed";
                            return (
                              <button
                                onClick={() => handleDownloadPdf(r)}
                                disabled={!isCompleted}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                                  isCompleted
                                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/30 cursor-pointer"
                                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                                }`}
                                title={
                                  isCompleted
                                    ? `Download Portfolio Review PDF for ${r.clientName}`
                                    : "PDF download is disabled until review status is Completed"
                                }
                              >
                                <FileText className={`size-3.5 ${isCompleted ? "text-white" : "text-slate-400"}`} />
                                <span>PDF</span>
                              </button>
                            );
                          })()}

                          {/* View / Edit Button */}
                          <button
                            onClick={() => handleOpenDrawer(r)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                            title={canEdit ? "View / Edit Review Details" : "View Review Details"}
                          >
                            <UserCheck className="size-3.5" />
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredReviews.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(page * rowsPerPage, filteredReviews.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{filteredReviews.length}</span> entries
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="whitespace-nowrap text-xs text-slate-500 font-medium">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-Over Drawer: Review Details & Activity Timeline */}
      {drawerOpen && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">Review Details</h2>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        (STATUS_COLORS[drawerFormData.status || "Pending"] || STATUS_COLORS.Pending).bg
                      } ${
                        (STATUS_COLORS[drawerFormData.status || "Pending"] || STATUS_COLORS.Pending).text
                      } ${
                        (STATUS_COLORS[drawerFormData.status || "Pending"] || STATUS_COLORS.Pending).border
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
                    Managing portfolio review for{" "}
                    <span className="font-semibold text-slate-800">{drawerFormData.clientName}</span>
                  </p>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0 m-0">
                {/* 1. Client Information Box (Single Source of Truth) */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <User className="size-4 text-indigo-600" />
                      <span>Client Information (Client Database Synchronized)</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Database className="size-3 text-emerald-600" />
                      <span>Live Synced</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Name *</label>
                      <input
                        type="text"
                        value={drawerFormData.clientName || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, clientName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">UCC / C.Code</label>
                      <input
                        type="text"
                        value={drawerFormData.ucc || drawerFormData.clientCode || ""}
                        onChange={(e) =>
                          setDrawerFormData({
                            ...drawerFormData,
                            ucc: e.target.value,
                            clientCode: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">PAN No.</label>
                      <input
                        type="text"
                        value={drawerFormData.pan || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, pan: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mobile No.</label>
                      <input
                        type="text"
                        value={drawerFormData.mobile || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, mobile: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">E-mail Address</label>
                      <input
                        type="email"
                        value={drawerFormData.email || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.1 Onboarding & Holding Particulars (Stage 2 Synchronized - Zero Re-entry) */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <ShieldCheck className="size-4 text-indigo-600" />
                      <span>Onboarding & Compliance (Stage 2 Synchronized)</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                      {drawerFormData.modeOfHolding || "SINGLE"} HOLDING
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mode of Holding</label>
                      <select
                        value={drawerFormData.modeOfHolding || "SINGLE"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, modeOfHolding: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800"
                      >
                        <option value="SINGLE">SINGLE</option>
                        <option value="JOINT">JOINT</option>
                        <option value="ANYONE OR SURVIVOR">ANYONE OR SURVIVOR</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Onboarding Status</label>
                      <input
                        type="text"
                        value={drawerFormData.onboardingStatus || "Onboarded"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, onboardingStatus: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                      />
                    </div>

                    {(drawerFormData.modeOfHolding === "JOINT" || drawerFormData.jointApplicants) && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Joint Applicants (2nd / 3rd)</label>
                        <input
                          type="text"
                          value={drawerFormData.jointApplicants || ""}
                          onChange={(e) => setDrawerFormData({ ...drawerFormData, jointApplicants: e.target.value })}
                          placeholder="e.g. Spouse / Son / Co-investor"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nominee Particulars</label>
                      <input
                        type="text"
                        value={drawerFormData.nominee || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, nominee: e.target.value })}
                        placeholder="Nominee Name (Relationship)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Occupation & Income</label>
                      <input
                        type="text"
                        value={
                          drawerFormData.occupation || drawerFormData.annualIncome
                            ? `${drawerFormData.occupation || ""} ${drawerFormData.annualIncome ? `(${drawerFormData.annualIncome})` : ""}`.trim()
                            : ""
                        }
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, occupation: e.target.value })}
                        placeholder="e.g. PSU (10 - 25 lac)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Registered Address</label>
                      <input
                        type="text"
                        value={drawerFormData.address || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. PDF Document Particulars */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <FileText className="size-4 text-indigo-600" />
                    <span>Portfolio Review Report Specification</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Review Date</label>
                      <input
                        type="text"
                        value={drawerFormData.reviewDate || "11th Sept, 2026"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, reviewDate: e.target.value })}
                        placeholder="e.g. 11th Sept, 2026"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Reviewed By</label>
                      <input
                        type="text"
                        value={drawerFormData.reviewedBy || "Soumyasri & Team"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, reviewedBy: e.target.value })}
                        placeholder="e.g. Soumyasri & Team"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fiscal Year</label>
                      <input
                        type="text"
                        value={drawerFormData.fiscalYear || "FY 2026–27"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, fiscalYear: e.target.value })}
                        placeholder="FY 2026–27"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Portfolio Observation (Printed on PDF)
                      </label>
                      <textarea
                        rows={3}
                        value={drawerFormData.portfolioObservation || ""}
                        onChange={(e) =>
                          setDrawerFormData({ ...drawerFormData, portfolioObservation: e.target.value })
                        }
                        placeholder="Fund performance observations..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Recommended Action (Printed on PDF)
                      </label>
                      <textarea
                        rows={3}
                        value={drawerFormData.recommendedAction || ""}
                        onChange={(e) =>
                          setDrawerFormData({ ...drawerFormData, recommendedAction: e.target.value })
                        }
                        placeholder="Fund switch / rebalancing recommendations..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Communication Record Table */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <MessageSquare className="size-4 text-indigo-600" />
                    <span>Communication Record (Printed on PDF)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="size-3.5 text-emerald-600" />
                        <span>WhatsApp Intimations</span>
                      </span>
                      <div>
                        <label className="block text-[10px] text-slate-400">1st Intimation Date</label>
                        <input
                          type="text"
                          value={drawerFormData.whatsappIntimation1 || "16/09/2026"}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, whatsappIntimation1: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">2nd Intimation Date</label>
                        <input
                          type="text"
                          value={drawerFormData.whatsappIntimation2 || "DD/MM/YYYY"}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, whatsappIntimation2: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Mail className="size-3.5 text-indigo-600" />
                        <span>E-mail Intimations</span>
                      </span>
                      <div>
                        <label className="block text-[10px] text-slate-400">1st Intimation Date</label>
                        <input
                          type="text"
                          value={drawerFormData.emailIntimation1 || "16/09/2026"}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, emailIntimation1: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">2nd Intimation Date</label>
                        <input
                          type="text"
                          value={drawerFormData.emailIntimation2 || "DD/MM/YYYY"}
                          onChange={(e) =>
                            setDrawerFormData({ ...drawerFormData, emailIntimation2: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Review Schedule & Assignment */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Calendar className="size-4 text-indigo-600" />
                    <span>Review Schedule & Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Next Review Date *</label>
                      <input
                        type="date"
                        value={drawerFormData.nextReviewDate || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, nextReviewDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assigned Person *</label>
                      <select
                        value={drawerFormData.assignedPerson || "Soumyasri"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, assignedPerson: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {assignedPersons.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Portfolio Review Status *</label>
                      <select
                        value={drawerFormData.status || "Pending"}
                        onChange={(e) =>
                          setDrawerFormData({
                            ...drawerFormData,
                            status: e.target.value as PortfolioReviewItem["status"],
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Deferred">Deferred</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Intimation Stage *</label>
                      <select
                        value={drawerFormData.intimation || "1st Time"}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, intimation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="1st Time">1st Time</option>
                        <option value="2nd Time">2nd Time</option>
                        <option value="3rd Time">3rd Time</option>
                        <option value="3rd Time (Final)">3rd Time (Final)</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Internal Notes</label>
                      <textarea
                        rows={2}
                        value={drawerFormData.notes || ""}
                        onChange={(e) => setDrawerFormData({ ...drawerFormData, notes: e.target.value })}
                        placeholder="Internal advisor observations or follow-up notes..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
                </fieldset>

                {/* Quick Action Buttons (ADMIN or AUTHORIZED STAFF) */}
                {canEdit && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleIntimateClient}
                      type="button"
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>Intimate Client</span>
                    </button>

                    <button
                      onClick={handleMarkResolved}
                      type="button"
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                )}

                {/* 5. Activity Timeline */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Clock className="size-4 text-indigo-600" />
                      <span>Activity Timeline</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(selectedReview.timeline || []).length} Events
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add milestone note (e.g. 'Discussed fund switch with client')..."
                      value={newTimelineText}
                      onChange={(e) => setNewTimelineText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTimelineNote()}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimelineNote}
                      disabled={!newTimelineText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Add Note
                    </button>
                  </div>

                  <div className="relative pl-6 space-y-4 border-l-2 border-slate-100 ml-3 py-1">
                    {(selectedReview.timeline || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No timeline entries recorded yet.</p>
                    ) : (
                      [...(selectedReview.timeline || [])]
                        .reverse()
                        .map((t, idx) => {
                          const isIntimate = t.type === "intimation";
                          const isResolution = t.type === "resolution";

                          return (
                            <div key={idx} className="relative group">
                              <div
                                className={`absolute -left-[31px] top-0.5 size-6 rounded-full flex items-center justify-center text-white text-xs ${
                                  isResolution
                                    ? "bg-emerald-500 ring-4 ring-emerald-50"
                                    : isIntimate
                                    ? "bg-blue-500 ring-4 ring-blue-50"
                                    : "bg-indigo-500 ring-4 ring-indigo-50"
                                }`}
                              >
                                {isResolution ? (
                                  <Check className="size-3 stroke-[3]" />
                                ) : isIntimate ? (
                                  <Send className="size-2.5" />
                                ) : (
                                  <Clock className="size-2.5" />
                                )}
                              </div>

                              <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/60">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-bold text-slate-900 text-xs">{t.title}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatIST(t.timestamp)}
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                    {t.description}
                                  </p>
                                )}
                                {t.actor && (
                                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                    <span>By:</span>
                                    <span className="text-slate-600 font-semibold">{t.actor}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    All times shown are in IST.
                  </p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const isDrawerCompleted = String(drawerFormData?.status || "").toLowerCase() === "completed";
                    return (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(drawerFormData)}
                        disabled={!isDrawerCompleted}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                          isDrawerCompleted
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/30 cursor-pointer"
                            : "bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed shadow-none"
                        }`}
                        title={
                          isDrawerCompleted
                            ? "Download Portfolio Review PDF"
                            : "PDF download is disabled until review status is Completed"
                        }
                      >
                        <FileText className={`size-3.5 ${isDrawerCompleted ? "text-white" : "text-slate-400"}`} />
                        <span>Download PDF</span>
                      </button>
                    );
                  })()}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      disabled={savingDrawer}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Permanently Delete Review"
                    >
                      <Trash2 className="size-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleSaveDrawer}
                      disabled={savingDrawer}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {savingDrawer ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden preloaded company logo for PDF generator */}
      <img
        id="portfolio-review-company-logo"
        src={logo}
        alt="Company Logo"
        className="hidden"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default CbiProfileReview;
