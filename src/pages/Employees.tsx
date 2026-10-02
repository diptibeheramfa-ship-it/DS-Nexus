import { useCallback, useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import EmployeeCard from "../components/EmployeeCard.js";
import EmployeeForm from "../components/EmployeeForm.js";

import { useAuth } from "../../context/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useDepartments } from "../hooks/useDepartments";

const Employees = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  const { departmentNames } = useDepartments();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "");
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [showCreateModel, setShowCreateModel] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const url = selectedDept ? `/employees?department=${selectedDept}` : "/employees";
      const res = await api.get(url)
      setEmployees(res.data)
    } catch (error) {
      console.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, [selectedDept])

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees])

  const filtered = employees.filter((emp) =>
    `${emp.employeeCode || ''} ${emp.firstName || emp.firstname || ''} ${emp.lastName || ''} ${emp.position || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your Team members</p>
        </div>
        <button onClick={() => setShowCreateModel(true)} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            placeholder="Search employees by code, name, or position..."
            className="w-full pl-10!"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />
        </div>
        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="max-w-40">
          <option value="">All Departments</option>
          {departmentNames.map((deptName: string) => (
            <option key={deptName} value={deptName}>{deptName}</option>
          ))}
        </select>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="flex justify-center p-12" >
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">No employees found.</p>
          ) : (
            filtered.map((emp) => <EmployeeCard key={emp.id} employee={emp} onDelete={fetchEmployees} onEdit={(e) => setEditEmployee(e)} />)
          )}
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateModel && (
        <div className="fixed bg-black/50 backdrop-blur-xs inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowCreateModel(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-auto animate-fade-in flex flex-col max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Add New Employee</h2>
                <p className="text-xs text-slate-500">Create a user account and employee profile</p>
              </div>
              <button onClick={() => setShowCreateModel(false)} className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <EmployeeForm onSuccess={() => { setShowCreateModel(false); fetchEmployees(); }} onCancel={() => setShowCreateModel(false)} initialData={undefined} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div className="fixed bg-black/50 backdrop-blur-xs inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setEditEmployee(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-auto animate-fade-in flex flex-col max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Edit Employee</h2>
                <p className="text-xs text-slate-500">Update Employee Information</p>
              </div>
              <button onClick={() => setEditEmployee(null)} className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <EmployeeForm initialData={editEmployee} onSuccess={() => { setEditEmployee(null); fetchEmployees(); }} onCancel={() => setEditEmployee(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees