import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  CheckCircle2,
  CreditCard,
  Trash2,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { formatINR } from "./CbiDashboard";
import { useAuth } from "../../../context/AuthContext";

export interface InvoiceData {
  _id: string;
  invoiceNumber: string;
  clientId: {
    _id: string;
    companyName: string;
    clientCode: string;
    email?: string;
    phone?: string;
  };
  dealId?: {
    _id: string;
    title: string;
    dealCode: string;
  };
  title: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentDate?: string;
  paymentReference?: string;
  notes?: string;
  createdAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PAID: { label: "PAID", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "PENDING", color: "bg-blue-50 text-blue-700 border-blue-200" },
  OVERDUE: { label: "OVERDUE", color: "bg-rose-50 text-rose-700 border-rose-200" },
  DRAFT: { label: "DRAFT", color: "bg-slate-100 text-slate-700 border-slate-200" },
  CANCELLED: { label: "CANCELLED", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const CbiInvoices: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    title: "Strategic Consulting Retainer",
    subtotal: "300000",
    taxRatePercent: "18",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: "NEFT-HDFC-",
  });

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/invoices");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      }
    } catch (err: any) {
      console.error("fetchInvoices error:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get("/cbi/clients", { params: { all: "true" } });
      if (res.data?.data) {
        setClients(res.data.data);
      }
    } catch (err) {
      console.warn("Error fetching clients for invoice:", err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices, fetchClients]);

  const handleOpenCreateModal = () => {
    setFormData({
      clientId: clients[0]?._id || "",
      title: "Strategic Consulting & Advisory Retainer",
      subtotal: "300000",
      taxRatePercent: "18",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast.error("Please select a client account");
      return;
    }
    if (!formData.subtotal || Number(formData.subtotal) <= 0) {
      toast.error("Please provide a valid subtotal amount");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/cbi/invoices", {
        clientId: formData.clientId,
        title: formData.title.trim(),
        subtotal: Number(formData.subtotal),
        taxRatePercent: Number(formData.taxRatePercent) || 0,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        notes: formData.notes.trim(),
      });
      toast.success("Invoice generated successfully");
      setIsCreateModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error("Create invoice error:", err);
      toast.error(err.response?.data?.error || "Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setIsSubmitting(true);
      await api.put(`/cbi/invoices/${selectedInvoice._id}/status`, {
        status: "PAID",
        paymentDate: paymentData.paymentDate,
        paymentReference: paymentData.paymentReference.trim(),
      });
      toast.success(`Invoice ${selectedInvoice.invoiceNumber} marked as PAID`);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      console.error("Record payment error:", err);
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (inv: InvoiceData) => {
    if (!window.confirm(`Delete invoice "${inv.invoiceNumber}"?`)) return;
    try {
      await api.delete(`/cbi/invoices/${inv._id}`);
      toast.success(`Invoice ${inv.invoiceNumber} deleted`);
      fetchInvoices();
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) return;
    const exportData = filteredInvoices.map((inv) => ({
      "Invoice #": inv.invoiceNumber,
      "Client": inv.clientId?.companyName || "",
      "Client Code": inv.clientId?.clientCode || "",
      "Title": inv.title,
      "Issue Date": inv.issueDate ? inv.issueDate.slice(0, 10) : "",
      "Due Date": inv.dueDate ? inv.dueDate.slice(0, 10) : "",
      "Subtotal (INR)": inv.subtotal,
      "Tax Rate %": inv.taxRatePercent,
      "Tax Amount": inv.taxAmount,
      "Total Amount": inv.totalAmount,
      "Status": inv.status,
      "Payment Date": inv.paymentDate ? inv.paymentDate.slice(0, 10) : "",
      "Payment Reference": inv.paymentReference || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `DS_Nexus_CBI_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Invoices exported to Excel");
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q) ||
        (inv.clientId?.companyName && inv.clientId.companyName.toLowerCase().includes(q));

      const matchesStatus = selectedStatus === "ALL" || inv.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, selectedStatus]);

  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalCollected = filteredInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const pendingReceivables = filteredInvoices
    .filter((inv) => inv.status === "PENDING" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const overdueCount = filteredInvoices.filter((inv) => inv.status === "OVERDUE").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Invoices & Billing Receivables
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track client invoicing, collections, statutory GST, and pending receivables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchInvoices()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          >
            <Download className="size-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Billed
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatINR(totalBilled)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {filteredInvoices.length} total invoices
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Collected
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(totalCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Realized cash collections
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Pending Receivables
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatINR(pendingReceivables)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Awaiting clearance
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Overdue Invoices
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {overdueCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Immediate follow-up needed
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice number, title, client company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full !pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice / Client</th>
                <th className="py-3 px-4">Title / Description</th>
                <th className="py-3 px-4">Issue & Due Date</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">GST (18%)</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;

                return (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                        {inv.clientId?.companyName || "Client"}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">
                        {inv.title}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="text-[11px]">Issued: {inv.issueDate ? inv.issueDate.slice(0, 10) : ""}</p>
                      <p className="text-[11px] font-semibold text-slate-800">
                        Due: {inv.dueDate ? inv.dueDate.slice(0, 10) : ""}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatINR(inv.subtotal)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                      {formatINR(inv.taxAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatINR(inv.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isAdmin && inv.status !== "PAID" && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 transition-colors"
                            title="Record Payment"
                          >
                            Mark Paid
                          </button>
                        )}
                        {isAdmin ? (
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Invoice"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Record Payment Clearance</h2>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Invoice: {selectedInvoice.invoiceNumber}</p>
                <p className="text-slate-600">Client: {selectedInvoice.clientId?.companyName}</p>
                <p className="font-bold text-emerald-700 text-sm">Amount: {formatINR(selectedInvoice.totalAmount)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transaction / NEFT / UTR Reference
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEFT-HDFC-009182394"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition-all"
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Generate Client Invoice</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client Account *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Memo / Line Item *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtotal (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.taxRatePercent}
                    onChange={(e) => setFormData({ ...formData, taxRatePercent: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Calculated Invoice Total (incl. GST):</span>
                <span className="text-sm">
                  {formatINR(
                    Number(formData.subtotal || 0) +
                      Math.round((Number(formData.subtotal || 0) * (Number(formData.taxRatePercent) || 0)) / 100)
                  )}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition-all"
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>Generate Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbiInvoices;

