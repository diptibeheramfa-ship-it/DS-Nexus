import { format } from "date-fns";
import { Download, Printer } from "lucide-react";

interface PayslipListProps {
    payslips: any[];
    isAdmin?: boolean;
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const PayslipList = ({ payslips, isAdmin }: PayslipListProps) => {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="table-modern">
                    <thead>
                        <tr>
                            {isAdmin && <th>Employee</th>}
                            <th>Period</th>
                            <th>Basic Salary</th>
                            <th>Total Earnings</th>
                            <th>Total Deductions</th>
                            <th>Net Salary</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payslips.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-slate-400">
                                    No payslips found
                                </td>
                            </tr>
                        ) : (
                            payslips.map((payslip: any) => {
                                const id = payslip._id || payslip.id;
                                const period = payslip.monthName 
                                    ? `${payslip.monthName} ${payslip.year}`
                                    : (payslip.month ? `${MONTH_NAMES[payslip.month - 1]} ${payslip.year}` : format(new Date(payslip.year, (payslip.month || 1) - 1), "MMMM yyyy"));
                                
                                const totalEarn = payslip.earnings?.total ?? ((payslip.basicSalary || 0) + (payslip.allowances || 0));
                                const totalDed = payslip.deductionsDetail?.total ?? (payslip.deductions || 0);

                                return (
                                    <tr key={id}>
                                        {isAdmin && (
                                            <td className="text-slate-900 font-medium">
                                                {payslip.employee?.firstName} {payslip.employee?.lastName}
                                            </td>
                                        )}
                                        <td className="text-slate-700 font-semibold">
                                            {period}
                                        </td>
                                        <td className="text-slate-500">
                                            ₹{payslip.basicSalary?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-emerald-700 font-medium">
                                            ₹{totalEarn?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-rose-600 font-medium">
                                            ₹{totalDed?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="font-bold text-slate-900">
                                            ₹{payslip.netSalary?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 min-w-0">
                                                {/* Download PDF Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(`${import.meta.env.BASE_URL}print/payslips/${id}?download=1`)}
                                                    className="inline-flex items-center justify-center w-full sm:w-auto px-2.5 py-1 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                                                    title="Download Payslip as PDF"
                                                >
                                                    <Download className="w-3 h-3 mr-1 text-indigo-600 shrink-0" />
                                                    Download PDF
                                                </button>

                                                {/* Print PDF / Preview Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(`${import.meta.env.BASE_URL}print/payslips/${id}`)}
                                                    className="inline-flex items-center justify-center w-full sm:w-auto px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                                                    title="Print or View Statement"
                                                >
                                                    <Printer className="w-3 h-3 mr-1 text-slate-500 shrink-0" />
                                                    Print
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
        </div>
    );
};

export default PayslipList;