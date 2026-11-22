import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Edit,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { formatINR } from "./CbiDashboard";
import { useAuth } from "../../../context/AuthContext";

export interface DealData {
  _id: string;
  dealCode: string;
  title: string;
  clientId: {
    _id: string;
    companyName: string;
    clientCode: string;
    industry?: string;
    tier?: string;
  };
  value: number;
  stage: "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
  probability: number;
  expectedCloseDate?: string;
  leadSource?: string;
  assignedEmployeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    position?: string;
  };
  notes?: string;
  wonLostReason?: string;
  closedAt?: string;
  createdAt?: string;
}

const STAGES = [
  { id: "LEAD", label: "Lead", color: "border-slate-300 bg-slate-50 text-slate-800" },
  { id: "QUALIFIED", label: "Qualified", color: "border-blue-300 bg-blue-50 text-blue-800" },
  { id: "PROPOSAL", label: "Proposal", color: "border-amber-300 bg-amber-50 text-amber-800" },
  { id: "NEGOTIATION", label: "Negotiation", color: "border-purple-300 bg-purple-50 text-purple-800" },
  { id: "WON", label: "Closed Won", color: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  { id: "LOST", label: "Closed Lost", color: "border-rose-300 bg-rose-50 text-rose-800" },
];

const STAGE_ORDER = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const CbiDeals: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [deals, setDeals] = useState<DealData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    value: "",
    stage: "QUALIFIED",
    probability: "60",
    expectedCloseDate: "",
    leadSource: "REFERRAL",
    assignedEmployeeId: "",
    notes: "",
  });

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/deals");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDeals(res.data.data);
      }
    } catch (err: any) {
      console.error("fetchDeals error:", err);
      toast.error("Failed to load business deals");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDependencies = useCallback(async () => {
    try {
      const [clientRes, empRes] = await Promise.all([
        api.get("/cbi/clients", { params: { all: "true" } }),
        api.get("/employees"),
      ]);

      if (clientRes.data?.data) {
        setClients(clientRes.data.data);
      }
      if (empRes.data) {
        const raw = empRes.data.employees || empRes.data;
        setEmployees(raw);
      }
    } catch (err) {
      console.warn("Error fetching deal dependencies:", err);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchDependencies();
  }, [fetchDeals, fetchDependencies]);

  const handleOpenAddModal = () => {
    setSelectedDeal(null);
    setFormData({
      title: "",
      clientId: clients[0]?._id || "",
      value: "1000000",
      stage: "QUALIFIED",
      probability: "50",
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      leadSource: "REFERRAL",
      assignedEmployeeId: employees[0]?._id || "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deal: DealData) => {
    setSelectedDeal(deal);
    setFormData({
      title: deal.title,
      clientId: deal.clientId?._id || "",
      value: String(deal.value || 0),
      stage: deal.stage,
      probability: String(deal.probability ?? 50),
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : "",
      leadSource: deal.leadSource || "REFERRAL",
      assignedEmployeeId: deal.assignedEmployeeId?._id || "",
      notes: deal.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmitDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Deal title is required");
      return;
    }
    if (!formData.clientId) {
      toast.error("Please select a client account");
      return;
    }
    if (!formData.value || Number(formData.value) <= 0) {
      toast.error("Please provide a valid deal value");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        clientId: formData.clientId,
        value: Number(formData.value),
        stage: formData.stage,
        probability: Number(formData.probability) || 50,
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
        leadSource: formData.leadSource,
        assignedEmployeeId: formData.assignedEmployeeId || null,
        notes: formData.notes.trim(),
      };

      if (selectedDeal?._id) {
        await api.put(`/cbi/deals/${selectedDeal._id}`, payload);
        toast.success(`Deal ${payload.title} updated`);
      } else {
        await api.post("/cbi/deals", payload);
        toast.success(`Deal ${payload.title} created`);
      }

      setIsModalOpen(false);
      fetchDeals();
    } catch (err: any) {
      console.error("Save deal error:", err);
      toast.error(err.response?.data?.error || "Failed to save deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdvanceStage = async (deal: DealData, targetStage: string) => {
    try {
      await api.put(`/cbi/deals/${deal._id}`, { stage: targetStage });
      toast.success(`Deal advanced to ${targetStage}`);
      fetchDeals();
    } catch {
      toast.error("Failed to update deal stage");
    }
  };

  const handleDeleteDeal = async (id: string, title: string) => {
    if (!window.confirm(`Delete deal "${title}"?`)) return;
    try {
      await api.delete(`/cbi/deals/${id}`);
      toast.success(`Deal ${title} deleted`);
      fetchDeals();
    } catch {
      toast.error("Failed to delete deal");
    }
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.dealCode.toLowerCase().includes(q) ||
        (d.clientId?.companyName && d.clientId.companyName.toLowerCase().includes(q));

      const matchesStage = selectedStage === "ALL" || d.stage === selectedStage;
      return matchesSearch && matchesStage;
    });
  }, [deals, searchTerm, selectedStage]);

  const totalPipeline = useMemo(() => {
    return deals
      .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
      .reduce((sum, d) => sum + (d.value || 0), 0);
  }, [deals]);

  const weightedPipeline = useMemo(() => {
    return deals
      .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
      .reduce((sum, d) => sum + (d.value * (d.probability || 0)) / 100, 0);
  }, [deals]);

  const wonTotal = useMemo(() => {
    return deals
      .filter((d) => d.stage === "WON")
      .reduce((sum, d) => sum + (d.value || 0), 0);
  }, [deals]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Briefcase className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Business Opportunities & Deals Pipeline
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track stage progression, win probabilities, and contract negotiations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={() => fetchDeals()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Opportunity</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Pipeline
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatINR(totalPipeline)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Excludes won/lost deals
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Weighted Value
          </p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {formatINR(Math.round(weightedPipeline))}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Probability-adjusted
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Closed Won Revenue
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(wonTotal)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Finalized agreements
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Deals Count
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {deals.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {deals.filter((d) => d.stage === "WON").length} Won
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search deals by title, code, client company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full !pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          >
            <option value="ALL">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STAGES.map((col) => {
            const colDeals = filteredDeals.filter((d) => d.stage === col.id);
            const colValue = colDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            return (
              <div
                key={col.id}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                <div className="pb-3 border-b border-slate-200 mb-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{col.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white font-bold text-slate-700 shadow-2xs">
                        {colDeals.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {formatINR(colValue)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colDeals.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                      Empty stage
                    </div>
                  ) : (
                    colDeals.map((deal) => {
                      const curIndex = STAGE_ORDER.indexOf(deal.stage);
                      const nextStage = curIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[curIndex + 1] : null;
                      const prevStage = curIndex > 0 ? STAGE_ORDER[curIndex - 1] : null;

                      return (
                        <div
                          key={deal._id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-purple-700 px-1.5 py-0.5 bg-purple-50 rounded border border-purple-200">
                              {deal.dealCode}
                            </span>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(deal)}
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                                  title="Edit"
                                >
                                  <Edit className="size-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDeal(deal._id, deal.title)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                                  title="Delete"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <h3 className="font-bold text-xs text-slate-900 line-clamp-2">
                            {deal.title}
                          </h3>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Building2 className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate font-medium">
                              {deal.clientId?.companyName || "Client"}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900">
                              {formatINR(deal.value)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {deal.probability}% Prob
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-600 h-full rounded-full"
                              style={{ width: `${deal.probability}%` }}
                            />
                          </div>

                          <div className="pt-1 flex items-center justify-between">
                            {prevStage ? (
                              <button
                                onClick={() => handleQuickAdvanceStage(deal, prevStage)}
                                className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                                title={`Move back to ${prevStage}`}
                              >
                                <ChevronLeft className="size-3" />
                                <span>Prev</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            {nextStage && (
                              <button
                                onClick={() => handleQuickAdvanceStage(deal, nextStage)}
                                className="text-[10px] text-purple-600 hover:text-purple-800 font-bold flex items-center gap-0.5 ml-auto"
                                title={`Advance to ${nextStage}`}
                              >
                                <span>Advance</span>
                                <ChevronRight className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Deal / Code</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4 text-center">Stage</th>
                  <th className="py-3 px-4 text-center">Probability</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => (
                  <tr key={deal._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{deal.title}</p>
                      <span className="text-[10px] font-mono text-purple-600 font-bold">
                        {deal.dealCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {deal.clientId?.companyName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatINR(deal.value)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                      {deal.probability}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {deal.assignedEmployeeId
                        ? `${deal.assignedEmployeeId.firstName} ${deal.assignedEmployeeId.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isAdmin ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(deal)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeal(deal._id, deal.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DEAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Briefcase className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedDeal ? "Edit Business Opportunity" : "Create Business Opportunity"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Opportunity Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Financial Restructuring"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Client Account *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deal Value (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1000000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Win Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Sales Representative (DS Nexus Staff)
                </label>
                <select
                  value={formData.assignedEmployeeId}
                  onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.department || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{selectedDeal ? "Update Deal" : "Create Deal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbiDeals;

