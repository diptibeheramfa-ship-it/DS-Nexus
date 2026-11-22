import React, { useState, useEffect, useRef } from "react";
import { X, CalendarDays, FileText, Loader2, Edit2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { MARKET_HOLIDAYS_MAP } from "../../constants/marketHolidays";
import { useHolidays } from "../../hooks/useHolidays";

interface LeaveItem {
  _id?: string;
  id?: string;
  type: string;
  startDate: string | Date;
  endDate: string | Date;
  reason: string;
  status: string;
  days?: number;
}

interface EditLeaveModalProps {
  open: boolean;
  leave: LeaveItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper: Convert YYYY-MM-DD -> DD/MM/YYYY
const toDMY = (isoDate: string) => {
  if (!isoDate) return "";
  const clean = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return clean;
};

// Helper: Convert DD/MM/YYYY -> YYYY-MM-DD
const fromDMY = (dmyStr: string) => {
  const clean = dmyStr.replace(/[-.]/g, "/").trim();
  const parts = clean.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && y.length === 4) {
      const day = d.padStart(2, "0");
      const month = m.padStart(2, "0");
      return `${y}-${month}-${day}`;
    }
  }
  return null;
};

const EditLeaveModal: React.FC<EditLeaveModalProps> = ({
  open,
  leave,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"SICK" | "CASUAL">("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [startDateDisplay, setStartDateDisplay] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endDateDisplay, setEndDateDisplay] = useState("");
  const [reason, setReason] = useState("");

  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && leave) {
      const s = leave.startDate ? new Date(leave.startDate).toISOString().split("T")[0] : "";
      const e = leave.endDate ? new Date(leave.endDate).toISOString().split("T")[0] : "";
      setType((leave.type === "SICK" || leave.type === "CASUAL") ? leave.type : "CASUAL");
      setStartDate(s);
      setStartDateDisplay(toDMY(s));
      setEndDate(e);
      setEndDateDisplay(toDMY(e));
      setReason(leave.reason || "");
    }
  }, [open, leave]);

  const { holidayMap, getHoliday } = useHolidays();

  if (!open || !leave) return null;

  // Calculate duration in days inclusive, strictly skipping Sundays and official market holidays
  const calculateDaysBreakdown = () => {
    if (!startDate || !endDate) {
      return { totalCalendarDays: 0, requestedDays: 0, skippedSundays: 0, skippedHolidays: [] };
    }
    const startStr = startDate.includes("T") ? startDate.split("T")[0] : startDate;
    const endStr = endDate.includes("T") ? endDate.split("T")[0] : endDate;
    if (endStr < startStr) {
      return { totalCalendarDays: 0, requestedDays: 0, skippedSundays: 0, skippedHolidays: [] };
    }

    let count = 0;
    let skippedSundays = 0;
    const skippedHolidays: { date: string; name: string }[] = [];
    let totalCalendarDays = 0;

    const cursor = new Date(`${startStr}T00:00:00`);
    const limit = new Date(`${endStr}T00:00:00`);

    while (cursor <= limit) {
      totalCalendarDays++;
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      const curStr = `${y}-${m}-${d}`;
      const isSunday = cursor.getDay() === 0;
      const holiday = (getHoliday && getHoliday(curStr)) || (holidayMap && holidayMap.get(curStr)) || MARKET_HOLIDAYS_MAP.get(curStr);

      if (isSunday) {
        skippedSundays++;
      } else if (holiday) {
        skippedHolidays.push({ date: curStr, name: holiday.name });
      } else {
        count++;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return { totalCalendarDays, requestedDays: count, skippedSundays, skippedHolidays };
  };

  const { totalCalendarDays, requestedDays, skippedSundays, skippedHolidays } = calculateDaysBreakdown();
  const isAllNonWorking = Boolean(totalCalendarDays > 0 && requestedDays === 0);
  const isApproved = leave.status === "APPROVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStart = startDate || fromDMY(startDateDisplay);
    const finalEnd = endDate || fromDMY(endDateDisplay);

    if (!finalStart || !finalEnd) {
      toast.error("Please enter valid start and end dates.");
      return;
    }
    if (new Date(finalEnd) < new Date(finalStart)) {
      toast.error("End date cannot be before start date.");
      return;
    }
    if (isAllNonWorking || requestedDays <= 0) {
      toast.error("The selected dates fall entirely on Sundays or official holidays. No leave deduction is needed!");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the leave.");
      return;
    }

    setLoading(true);
    try {
      const leaveId = leave._id || leave.id;
      const res = await api.put(`/leave/${leaveId}`, {
        type,
        startDate: finalStart,
        endDate: finalEnd,
        reason: reason.trim(),
      });

      toast.success(res.data?.message || "Leave application rectified successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to update leave application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Rectify / Edit Leave</h2>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                    isApproved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : leave.status === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {leave.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rectify mistaken leave type, dates, or reason
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Callout */}
        <div className="mx-6 mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-indigo-50/60 border-indigo-100 text-indigo-900">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed">
            <p className="font-bold text-slate-900">Rectifying Mistaken Applications</p>
            <p className="text-slate-600">
              If this leave was applied under the wrong category (e.g. <strong>Casual</strong> instead of <strong>Sick</strong>), you can rectify it here. Saving updates will re-adjust your leave quotas and attendance regularizations.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Leave Type Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Correct Leave Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  type === "CASUAL"
                    ? "border-sky-500 bg-sky-50/40 text-sky-900 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="rectifyLeaveType"
                  value="CASUAL"
                  checked={type === "CASUAL"}
                  onChange={() => setType("CASUAL")}
                  className="sr-only"
                />
                <span className="text-xs font-bold">Casual Leave</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Annual quota: 10 days</span>
                {type === "CASUAL" && (
                  <CheckCircle2 className="w-4 h-4 text-sky-600 absolute top-2.5 right-2.5" />
                )}
              </label>

              <label
                className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  type === "SICK"
                    ? "border-amber-500 bg-amber-50/40 text-amber-900 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="rectifyLeaveType"
                  value="SICK"
                  checked={type === "SICK"}
                  onChange={() => setType("SICK")}
                  className="sr-only"
                />
                <span className="text-xs font-bold">Sick Leave</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Annual quota: 5 days</span>
                {type === "SICK" && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-2.5 right-2.5" />
                )}
              </label>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" /> Start Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={startDateDisplay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDateDisplay(val);
                    const parsed = fromDMY(val);
                    if (parsed) setStartDate(parsed);
                  }}
                  onBlur={() => {
                    if (startDate) setStartDateDisplay(toDMY(startDate));
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (startPickerRef.current) {
                      if (typeof startPickerRef.current.showPicker === "function") {
                        startPickerRef.current.showPicker();
                      } else {
                        startPickerRef.current.focus();
                        startPickerRef.current.click();
                      }
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <input
                  ref={startPickerRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setStartDate(e.target.value);
                      setStartDateDisplay(toDMY(e.target.value));
                    }
                  }}
                  tabIndex={-1}
                  className="sr-only pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" /> End Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={endDateDisplay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndDateDisplay(val);
                    const parsed = fromDMY(val);
                    if (parsed) setEndDate(parsed);
                  }}
                  onBlur={() => {
                    if (endDate) setEndDateDisplay(toDMY(endDate));
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (endPickerRef.current) {
                      if (typeof endPickerRef.current.showPicker === "function") {
                        endPickerRef.current.showPicker();
                      } else {
                        endPickerRef.current.focus();
                        endPickerRef.current.click();
                      }
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <input
                  ref={endPickerRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setEndDate(e.target.value);
                      setEndDateDisplay(toDMY(e.target.value));
                    }
                  }}
                  tabIndex={-1}
                  className="sr-only pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* All non-working alert banner */}
          {isAllNonWorking && (
            <div className="p-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">No Leave Required</span>
                <span className="text-[11px] text-amber-700 leading-relaxed block mt-0.5">
                  The selected dates fall on a Sunday or official holiday, which are non-working days in DS-Nexus and are not deducted from your quota.
                </span>
              </div>
            </div>
          )}

          {/* Duration Summary */}
          {requestedDays > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Deducted: {requestedDays} working day{requestedDays > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Total {totalCalendarDays} calendar day{totalCalendarDays > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="font-bold text-indigo-700 font-mono bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-xs">
                  {requestedDays} Day{requestedDays > 1 ? "s" : ""}
                </span>
              </div>

              {(skippedSundays > 0 || skippedHolidays.length > 0) && (
                <div className="pt-1.5 border-t border-indigo-200/50 flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-800">
                  <span className="font-bold">Skipped (Not Deducted):</span>
                  {skippedSundays > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100/80 font-medium">
                      {skippedSundays} Sunday{skippedSundays > 1 ? "s" : ""}
                    </span>
                  )}
                  {skippedHolidays.map((h, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
                      {h.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Explanation
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Fever, viral infection, family emergency..."
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isAllNonWorking || (totalCalendarDays > 0 && requestedDays <= 0)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Update & Rectify Leave</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLeaveModal;
