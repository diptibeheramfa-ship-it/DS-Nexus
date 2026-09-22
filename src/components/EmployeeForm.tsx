import { useState } from "react";
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useDepartments } from "../hooks/useDepartments";

interface EmployeeFormProps {
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const EmployeeForm = ({ initialData, onSuccess, onCancel }: EmployeeFormProps) => {

    const navigate = useNavigate();
    const { departmentNames } = useDepartments();
    const [loading, setLoading] = useState(false);
    const isEditMode = !!initialData;
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true)
        const formData = new FormData(e.currentTarget);
        if (isEditMode) {
            const pwd = formData.get("password");
            if (!pwd) formData.delete("password")
        }
        try {
            const url = isEditMode ? `/employees/${initialData.id}` : "/employees";
            const method = isEditMode ? "put" : "post";
            await api[method](url, formData);
            onSuccess ? onSuccess() : navigate("/employees");
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl animate-fade-in">

            {/* Personal Information */}
            <div className="card p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-2">
                    <h3 className="font-medium text-slate-900">Personal Information</h3>
                    {isEditMode && initialData?.employeeCode && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold w-fit">
                            <span className="text-indigo-400 font-sans font-normal">Employee Code:</span> #{initialData.employeeCode}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">First Name</label>
                        <input name="firstName" required defaultValue={initialData?.firstName} />
                    </div>
                    <div>
                        <label className="block mb-2">Last Name</label>
                        <input name="lastName" required defaultValue={initialData?.lastName} />
                    </div>
                    <div>
                        <label className="block mb-2">Phone Number</label>
                        <input name="phone" required defaultValue={initialData?.phone} />
                    </div>
                    <div>
                        <label className="block mb-2">Join Date</label>
                        <input type="date" name="joinDate" required defaultValue={initialData?.joinDate ? new Date(initialData.joinDate).toISOString().split('T')[0] : ""} />
                    </div>
                    <div>
                        <label className="block mb-2">Department</label>
                        <select name="department" defaultValue={initialData?.department || ""}>
                            <option value="">Select Department</option>
                            {departmentNames.map((deptName: string) => (
                                <option key={deptName} value={deptName}>{deptName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2">Position</label>
                        <input name="position" required defaultValue={initialData?.position} />
                    </div>
                    {isEditMode && (
                        <div>
                            <label className="block mb-2">Status</label>
                            <select name="employmentStatus" defaultValue={initialData?.employmentStatus || "ACTIVE"}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    )}
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                            <label htmlFor="isLocationExempt" className="font-semibold text-slate-900 cursor-pointer block text-sm">
                                Location Geofence Exemption
                            </label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                When enabled, this employee can punch in from anywhere without office GPS location restrictions.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            id="isLocationExempt"
                            name="isLocationExempt"
                            value="true"
                            defaultChecked={Boolean(initialData?.isLocationExempt || initialData?.employeeCode === "202602")}
                            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block mb-2">Bio (Optional)</label>
                        <textarea name="bio" defaultValue={initialData?.bio} rows={2} className="resize-none" placeholder="Brief Description..." />
                    </div>
                </div>
            </div>

            {/* Identity & Qualifications */}
            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">Identity & Qualifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">PAN Number</label>
                        <input
                            name="panNumber"
                            placeholder="e.g. ABCDE1234F"
                            defaultValue={initialData?.panNumber}
                            className="uppercase font-mono tracking-wider"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Aadhar Number</label>
                        <input
                            name="aadharNumber"
                            placeholder="e.g. 1234 5678 9012"
                            defaultValue={initialData?.aadharNumber}
                            className="font-mono tracking-wider"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Highest Qualification</label>
                        <input
                            name="highestQualification"
                            placeholder="e.g. B.Tech, MBA, M.Com"
                            defaultValue={initialData?.highestQualification}
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Pass Out Year</label>
                        <input
                            name="passOutYear"
                            placeholder="e.g. 2022"
                            defaultValue={initialData?.passOutYear}
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Certification</label>
                        <input
                            name="certification"
                            placeholder="e.g. AWS Solutions Architect, NISM Series V-A"
                            defaultValue={initialData?.certification}
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Certification Validity</label>
                        <input
                            name="certificationValidity"
                            placeholder="e.g. 2028-12-31 or Lifetime"
                            defaultValue={initialData?.certificationValidity}
                        />
                    </div>
                </div>
            </div>

            {/* Account Setup */}
            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">Account Setup</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div className="sm:col-span-2">
                        <label className="block mb-2">Work Email</label>
                        <input type="email" name="email" required defaultValue={initialData?.email} />
                    </div>
                    {!isEditMode && (
                        <div className="sm:col-span-2">
                            <label className="block mb-2">Temporary Password</label>
                            <input type="password" name="password" required />
                        </div>
                    )}
                    {isEditMode && (
                        <div className="sm:col-span-2">
                            <label className="block mb-2">Change Password (Optional)</label>
                            <input type="password" name="password" placeholder="Leave blank to keep current password" />
                        </div>
                    )}
                    {isEditMode && (
                        <div className="sm:col-span-2">
                            <label className="block mb-2">System Role</label>
                            <select name="role" defaultValue={initialData?.user?.role || "EMPLOYEE"}>
                                <option value="EMPLOYEE">Employee</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (isEditMode ? "Update Employee" : "Create Employee")}
                </button>
            </div>
        </form>
    )
}

export default EmployeeForm