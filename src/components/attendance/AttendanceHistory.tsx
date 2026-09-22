// @ts-ignore
import { getDayTypeDisplay, getWorkingHoursDisplay } from "../../assets/assets"
import { format } from "date-fns"
import { AlertTriangle } from "lucide-react"

interface AttendanceHistoryProps {
    history: any[];
}

const AttendanceHistory = ({ history = [] }: AttendanceHistoryProps) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900">Recent Attendance Activity</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Daily punch logs, shift duration, and attendance verdicts</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {history.length} Record{history.length !== 1 ? "s" : ""}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="table-modern">
                    <thead>
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">First In</th>
                            <th className="px-6 py-4">Last Out</th>
                            <th className="px-6 py-4">Working Hours</th>
                            <th className="px-6 py-4">Day Type</th>
                            <th className="px-6 py-4">Status & Official Verdict</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-400">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            history.map((record: any) => {
                                const dayType = getDayTypeDisplay(record)
                                const isAbsent = record.status === "ABSENT" || record.requiresCorrection
                                const isLate = record.status === "LATE"

                                const recordDate = new Date(record.date);
                                recordDate.setHours(0, 0, 0, 0);
                                const isPastDay = recordDate.getTime() < today.getTime();
                                const hasValidOut = Boolean(
                                    (record.checkOut && record.currentStatus !== "IN" && (!record.punches?.length || record.punches[record.punches.length - 1]?.type !== "IN")) ||
                                    (record.punches && record.punches.length > 0 && record.punches[record.punches.length - 1].type === "OUT") ||
                                    (record.status === "PRESENT" && typeof record.workingHours === "number" && record.workingHours > 0)
                                );
                                const isMissingPunch = Boolean(
                                    isPastDay &&
                                    (record.checkIn || (record.punches && record.punches.length > 0)) &&
                                    !hasValidOut
                                );

                                const firstInTime = (record.punches && record.punches.length > 0)
                                    ? (record.punches.find((p: any) => p.type === "IN")?.time || record.checkIn)
                                    : record.checkIn;

                                const lastOutTime = (record.punches && record.punches.length > 0)
                                    ? (() => {
                                        for (let i = record.punches.length - 1; i >= 0; i--) {
                                            if (record.punches[i].type === "OUT") return record.punches[i].time;
                                        }
                                        return record.checkOut;
                                    })()
                                    : record.checkOut;

                                const sessionCount = record.punches && record.punches.length > 2
                                    ? Math.floor(record.punches.length / 2)
                                    : 0;

                                return (
                                    <tr key={record._id || record.id} className={isMissingPunch ? "bg-amber-50/50 hover:bg-amber-100/40 transition-colors" : ""}>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {format(new Date(record.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-semibold">
                                            {firstInTime ? format(new Date(firstInTime), 'hh:mm a') : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-semibold">
                                            {lastOutTime ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span>{format(new Date(lastOutTime), 'hh:mm a')}</span>
                                                    {sessionCount > 1 && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            {sessionCount} sessions
                                                        </span>
                                                    )}
                                                </div>
                                            ) : isMissingPunch ? (
                                                <span className="inline-flex items-center gap-1 text-amber-800 font-bold text-xs bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                    Missing (Locked)
                                                </span>
                                            ) : record.checkIn ? (
                                                <span className="text-emerald-600 font-medium text-xs">Active</span>
                                            ) : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {isMissingPunch && !record.workingHours ? (
                                                <span className="text-amber-700 font-semibold text-xs">Incomplete</span>
                                            ) : (
                                                getWorkingHoursDisplay(record)
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {dayType.label !== "-" ? <span className={`badge ${dayType.className}`}>{dayType.label}</span> : "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {isMissingPunch ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-400 shadow-2xs">
                                                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                                            Missing Punch
                                                        </span>
                                                    ) : (
                                                        <span className={`badge ${record.status === "PRESENT" ? "badge-success" : isLate ? "badge-warning" : "badge-danger"}`}>
                                                            {record.status}
                                                        </span>
                                                    )}
                                                    {record.requiresCorrection && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                                            Correction Needed (LWP)
                                                        </span>
                                                    )}
                                                </div>
                                                {record.verdict && (
                                                    <p className={`text-[11px] leading-tight ${isAbsent ? "text-rose-600 font-medium" : isLate ? "text-amber-700" : "text-slate-500"}`}>
                                                        {record.verdict}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    )
}
export default AttendanceHistory