import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  X,
  CreditCard,
  User,
  UserPlus,
  UserCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Eye,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useCbiPermissions } from "../../hooks/useCbiPermissions";

export interface ClientData {
  _id: string;
  sn?: number;
  clientCode: string;
  clientName: string;
  companyName?: string;
  mandate?: string;
  rm: string;
  aof?: string;
  sipSize?: number;
  occupation?: string;
  department?: string;
  income?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  dob?: string;
  age?: number;
  pan?: string;
  aadhar?: string;
  kycStatus?: string;
  bankDetails?: string;
  accountType?: string;
  bankAccountNo?: string;
  banks?: Array<{ bankDetails: string; accountType: string; bankAccountNo: string }>;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeIdType?: "Aadhar" | "PAN";
  nomineeIdNumber?: string;
  nominees?: Array<{
    name: string;
    relation: string;
    idType: "Aadhar" | "PAN";
    idNumber: string;
  }>;
  mobile?: string;
  phone?: string;
  email?: string;
  remarks?: string;
  tier?: string;
  status?: string;
  onboardingDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const formatINR = (val?: number): string => {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const calculateAgeFromDob = (dobString: string): number | null => {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

const OCCUPATION_OPTIONS = [
  "PSU",
  "Govt.Service",
  "Private Service",
  "Business",
  "Professional",
  "Self Employed",
  "Retired",
  "Homemaker",
  "Student",
  "Other",
];

// KYC Status restricted to exactly 3 statuses: Validated (green), Not Available (orange), Frozen (red)
export const KYC_STATUS_OPTIONS = ["Validated", "Not Available", "Frozen"] as const;

// Account Type options: Savings, Current, NRE, NRO
export const ACCOUNT_TYPE_OPTIONS = ["Savings", "Current", "NRE", "NRO"] as const;

export const getKycBadge = (status?: string) => {
  const s = (status || "").trim().toUpperCase();
  if (s.includes("FROZEN")) {
    return {
      label: "Frozen",
      pillClass: "bg-rose-50 text-rose-700 border-rose-200",
      dossierClass: "bg-rose-500/20 text-rose-300 border-rose-400/30",
      icon: "frozen" as const,
    };
  }
  if (
    s.includes("NOT") ||
    s.includes("PENDING") ||
    s.includes("PROCESS") ||
    s.includes("AVAILABLE")
  ) {
    return {
      label: "Not Available",
      pillClass: "bg-orange-50 text-orange-700 border-orange-200",
      dossierClass: "bg-orange-500/20 text-orange-300 border-orange-400/30",
      icon: "not_available" as const,
    };
  }
  return {
    label: "Validated",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dossierClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    icon: "validated" as const,
  };
};

const NOMINEE_RELATIONS = [
  "WIFE",
  "HUSBAND",
  "MOTHER",
  "FATHER",
  "SON",
  "DAUGHTER",
  "BROTHER",
  "SISTER",
  "OTHER",
];

export const INCOME_OPTIONS = [
  "<1 lac",
  "1 to 5 lac",
  "5 to 10 lac",
  "10 - 25 lac",
  "> 25 lacs",
];

const CbiClients: React.FC = () => {
  const { isAdmin, clientDb } = useCbiPermissions();
  const canEdit = isAdmin || clientDb.canEdit;
  const canDelete = isAdmin || clientDb.canDelete;
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [rms, setRms] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRm, setSelectedRm] = useState("ALL");
  const [selectedKyc, setSelectedKyc] = useState("ALL");
  const [selectedOccupation, setSelectedOccupation] = useState("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddRmModalOpen, setIsAddRmModalOpen] = useState(false);
  const [newRmInput, setNewRmInput] = useState("");

  const [activeTab, setActiveTab] = useState<"personal" | "investment" | "banking" | "nominee">("personal");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sn: "",
    clientCode: "",
    onboardingDate: new Date().toISOString().slice(0, 10),
    clientName: "",
    mandate: "5768-38701",
    rm: "SOUMYA",
    aof: "38701",
    sipSize: "10000",
    occupation: "PSU",
    department: "",
    income: "",
    fatherName: "",
    motherName: "",
    address: "",
    dob: "",
    age: "",
    pan: "",
    aadhar: "",
    kycStatus: "Validated",
    bankDetails: "SBI, ROURKELA BRANCH",
    accountType: "Savings",
    bankAccountNo: "",
    banks: [
      {
        bankDetails: "SBI, ROURKELA BRANCH",
        accountType: "Savings",
        bankAccountNo: "",
      },
    ] as Array<{ bankDetails: string; accountType: string; bankAccountNo: string }>,
    nomineeName: "",
    nomineeRelation: "WIFE",
    nomineeIdType: "Aadhar" as "Aadhar" | "PAN",
    nomineeIdNumber: "",
    nominees: [
      {
        name: "",
        relation: "WIFE",
        idType: "Aadhar",
        idNumber: "",
      },
    ] as Array<{
      name: string;
      relation: string;
      idType: "Aadhar" | "PAN";
      idNumber: string;
    }>,
    mobile: "",
    email: "",
    remarks: "",
    status: "ACTIVE",
  });

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/clients", {
        params: { all: "true", sortBy: "sn", order: "asc" },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setClients(res.data.data);
      }
    } catch (err: any) {
      console.error("fetchClients error:", err);
      toast.error("Failed to load client database records");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRms = useCallback(async () => {
    try {
      const res = await api.get("/cbi/rms");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRms(res.data.data);
      }
    } catch (err) {
      console.warn("fetchRms warning:", err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchRms();
  }, [fetchClients, fetchRms]);

  // Compute next continuous SN
  const nextSn = useMemo(() => {
    if (!clients.length) return 1;
    const max = clients.reduce((acc, c) => (typeof c.sn === "number" && c.sn > acc ? c.sn : acc), 0);
    return max + 1;
  }, [clients]);

  // Compute next system-assigned C.Code (e.g. OR00007)
  const nextClientCode = useMemo(() => {
    if (!clients.length) return "OR00001";
    let maxNum = 0;
    clients.forEach((c) => {
      const match = c.clientCode && c.clientCode.match(/^OR(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `OR${String(maxNum + 1).padStart(5, "0")}`;
  }, [clients]);

  // Handle opening add modal
  const handleOpenAddModal = () => {
    setSelectedClient(null);
    setFormData({
      sn: String(nextSn),
      clientCode: nextClientCode, // Automatically assigned by system
      onboardingDate: new Date().toISOString().slice(0, 10),
      clientName: "",
      mandate: "5768-38701",
      rm: rms[0]?.name || "SOUMYA",
      aof: "",
      sipSize: "10000",
      occupation: "PSU",
      department: "",
      income: "",
      fatherName: "",
      motherName: "",
      address: "",
      dob: "",
      age: "",
      pan: "",
      aadhar: "",
      kycStatus: "Validated",
      bankDetails: "SBI, ROURKELA BRANCH",
      accountType: "Savings",
      bankAccountNo: "",
      banks: [
        {
          bankDetails: "SBI, ROURKELA BRANCH",
          accountType: "Savings",
          bankAccountNo: "",
        },
      ],
      nomineeName: "",
      nomineeRelation: "WIFE",
      nomineeIdType: "Aadhar",
      nomineeIdNumber: "",
      nominees: [
        {
          name: "",
          relation: "WIFE",
          idType: "Aadhar",
          idNumber: "",
        },
      ],
      mobile: "",
      email: "",
      remarks: "",
      status: "ACTIVE",
    });
    setActiveTab("personal");
    setIsFormModalOpen(true);
  };

  // Handle opening edit modal
  const handleOpenEditModal = (client: ClientData) => {
    setSelectedClient(client);

    const rawAcc = (client.accountType || "").trim().toUpperCase();
    let normalizedAcc = "Savings";
    if (rawAcc === "CURRENT") normalizedAcc = "Current";
    else if (rawAcc === "NRE") normalizedAcc = "NRE";
    else if (rawAcc === "NRO") normalizedAcc = "NRO";
    else normalizedAcc = "Savings";

    const initialBanks =
      Array.isArray(client.banks) && client.banks.length > 0
        ? client.banks.map((b) => {
            const rawAccType = (b.accountType || "").trim().toUpperCase();
            let norm = "Savings";
            if (rawAccType === "CURRENT") norm = "Current";
            else if (rawAccType === "NRE") norm = "NRE";
            else if (rawAccType === "NRO") norm = "NRO";
            return {
              bankDetails: b.bankDetails || "",
              accountType: norm,
              bankAccountNo: b.bankAccountNo || "",
            };
          })
        : [
            {
              bankDetails: client.bankDetails || "",
              accountType: normalizedAcc,
              bankAccountNo: client.bankAccountNo || "",
            },
          ];

    const initialNominees =
      Array.isArray(client.nominees) && client.nominees.length > 0
        ? client.nominees.map((n) => {
            const rawIdType = (n.idType || "Aadhar").trim().toUpperCase();
            const idType: "Aadhar" | "PAN" = rawIdType === "PAN" ? "PAN" : "Aadhar";
            return {
              name: n.name || "",
              relation: n.relation || "WIFE",
              idType,
              idNumber: n.idNumber || "",
            };
          })
        : client.nomineeName
        ? [
            {
              name: client.nomineeName,
              relation: client.nomineeRelation || "WIFE",
              idType: (client.nomineeIdType === "PAN" ? "PAN" : "Aadhar") as "Aadhar" | "PAN",
              idNumber: client.nomineeIdNumber || "",
            },
          ]
        : [
            {
              name: "",
              relation: "WIFE",
              idType: "Aadhar" as "Aadhar" | "PAN",
              idNumber: "",
            },
          ];

    setFormData({
      sn: client.sn !== undefined ? String(client.sn) : "",
      clientCode: client.clientCode || "",
      onboardingDate:
        client.onboardingDate ||
        (client.createdAt ? client.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      clientName: client.clientName || client.companyName || "",
      mandate: client.mandate || "",
      rm: client.rm || "SOUMYA",
      aof: client.aof || "",
      sipSize: client.sipSize !== undefined ? String(client.sipSize) : "0",
      occupation: client.occupation || "",
      department: client.department || "",
      income: client.income || "",
      fatherName: client.fatherName || "",
      motherName: client.motherName || "",
      address: client.address || "",
      dob: client.dob || "",
      age: client.age !== undefined && client.age !== null ? String(client.age) : "",
      pan: client.pan || "",
      aadhar: client.aadhar || "",
      kycStatus: getKycBadge(client.kycStatus).label,
      bankDetails: initialBanks[0]?.bankDetails || client.bankDetails || "",
      accountType: initialBanks[0]?.accountType || normalizedAcc,
      bankAccountNo: initialBanks[0]?.bankAccountNo || client.bankAccountNo || "",
      banks: initialBanks,
      nomineeName: initialNominees[0]?.name || "",
      nomineeRelation: initialNominees[0]?.relation || "WIFE",
      nomineeIdType: initialNominees[0]?.idType || "Aadhar",
      nomineeIdNumber: initialNominees[0]?.idNumber || "",
      nominees: initialNominees,
      mobile: client.mobile || client.phone || "",
      email: client.email || "",
      remarks: client.remarks || "",
      status: client.status || "ACTIVE",
    });
    setActiveTab("personal");
    setIsFormModalOpen(true);
  };

  // Bank handlers (Multiple banks up to 5)
  const handleAddBank = () => {
    if (formData.banks.length >= 5) {
      toast.error("Maximum 5 bank accounts allowed");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      banks: [
        ...prev.banks,
        {
          bankDetails: "",
          accountType: "Savings",
          bankAccountNo: "",
        },
      ],
    }));
  };

  const handleRemoveBank = (index: number) => {
    if (formData.banks.length <= 1) {
      setFormData((prev) => ({
        ...prev,
        banks: [
          {
            bankDetails: "",
            accountType: "Savings",
            bankAccountNo: "",
          },
        ],
        bankDetails: "",
        accountType: "Savings",
        bankAccountNo: "",
      }));
      return;
    }
    setFormData((prev) => {
      const updated = prev.banks.filter((_, i) => i !== index);
      return {
        ...prev,
        banks: updated,
        bankDetails: updated[0]?.bankDetails || "",
        accountType: updated[0]?.accountType || "Savings",
        bankAccountNo: updated[0]?.bankAccountNo || "",
      };
    });
  };

  const handleBankChange = (
    index: number,
    field: "bankDetails" | "accountType" | "bankAccountNo",
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.banks];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        banks: updated,
        bankDetails: index === 0 && field === "bankDetails" ? value : (updated[0]?.bankDetails || ""),
        accountType: index === 0 && field === "accountType" ? value : (updated[0]?.accountType || "Savings"),
        bankAccountNo: index === 0 && field === "bankAccountNo" ? value : (updated[0]?.bankAccountNo || ""),
      };
    });
  };

  // Nominee handlers (Multiple nominees up to 3)
  const handleAddNominee = () => {
    if (formData.nominees.length >= 3) {
      toast.error("Maximum 3 nominees can be added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      nominees: [
        ...prev.nominees,
        {
          name: "",
          relation: "WIFE",
          idType: "Aadhar",
          idNumber: "",
        },
      ],
    }));
  };

  const handleRemoveNominee = (index: number) => {
    if (formData.nominees.length <= 1) {
      setFormData((prev) => ({
        ...prev,
        nominees: [
          {
            name: "",
            relation: "WIFE",
            idType: "Aadhar",
            idNumber: "",
          },
        ],
        nomineeName: "",
        nomineeRelation: "WIFE",
        nomineeIdType: "Aadhar",
        nomineeIdNumber: "",
      }));
      return;
    }
    setFormData((prev) => {
      const updated = prev.nominees.filter((_, i) => i !== index);
      return {
        ...prev,
        nominees: updated,
        nomineeName: updated[0]?.name || "",
        nomineeRelation: updated[0]?.relation || "WIFE",
        nomineeIdType: updated[0]?.idType || "Aadhar",
        nomineeIdNumber: updated[0]?.idNumber || "",
      };
    });
  };

  const handleNomineeChange = (
    index: number,
    field: "name" | "relation" | "idType" | "idNumber",
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.nominees];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        nominees: updated,
        nomineeName: index === 0 && field === "name" ? value : (updated[0]?.name || ""),
        nomineeRelation: index === 0 && field === "relation" ? value : (updated[0]?.relation || "WIFE"),
        nomineeIdType: index === 0 && field === "idType" ? (value as "Aadhar" | "PAN") : (updated[0]?.idType || "Aadhar"),
        nomineeIdNumber: index === 0 && field === "idNumber" ? value : (updated[0]?.idNumber || ""),
      };
    });
  };

  // When DOB changes: Auto-calculate Age!
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const computedAge = calculateAgeFromDob(val);
    setFormData((prev) => ({
      ...prev,
      dob: val,
      age: computedAge !== null ? String(computedAge) : "",
    }));
  };

  // Quick Add RM
  const handleCreateRm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRmInput.trim()) return;
    try {
      const res = await api.post("/cbi/rms", { name: newRmInput.trim() });
      if (res.data?.success) {
        toast.success(`Relationship Manager ${newRmInput.trim().toUpperCase()} added`);
        await fetchRms();
        setFormData((prev) => ({ ...prev, rm: newRmInput.trim().toUpperCase() }));
        setIsAddRmModalOpen(false);
        setNewRmInput("");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add RM");
    }
  };

  // Handle Form Submit (Create or Update)
  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      toast.error("Client Name is required");
      setActiveTab("personal");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        clientName: formData.clientName.trim(),
        onboardingDate: formData.onboardingDate || new Date().toISOString().slice(0, 10),
        mandate: formData.mandate.trim(),
        rm: (formData.rm || "SOUMYA").trim().toUpperCase(),
        aof: formData.aof.trim(),
        sipSize: Number(formData.sipSize) || 0,
        occupation: formData.occupation.trim(),
        department: formData.department.trim(),
        income: formData.income.trim(),
        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        address: formData.address.trim(),
        dob: formData.dob.trim(),
        pan: formData.pan.trim().toUpperCase(),
        aadhar: formData.aadhar.trim(),
        kycStatus: formData.kycStatus.trim(),
        bankDetails: formData.bankDetails.trim(),
        accountType: formData.accountType.trim(),
        bankAccountNo: formData.bankAccountNo.trim(),
        banks: (formData.banks || [])
          .map((b) => ({
            bankDetails: (b.bankDetails || "").trim(),
            accountType: (b.accountType || "Savings").trim(),
            bankAccountNo: (b.bankAccountNo || "").trim(),
          }))
          .filter((b) => b.bankDetails !== "" || b.bankAccountNo !== ""),
        nomineeName: formData.nomineeName.trim(),
        nomineeRelation: formData.nomineeRelation.trim().toUpperCase(),
        nomineeIdType: formData.nomineeIdType,
        nomineeIdNumber: formData.nomineeIdNumber.trim().toUpperCase(),
        nominees: (formData.nominees || [])
          .map((n) => ({
            name: (n.name || "").trim(),
            relation: (n.relation || "WIFE").trim().toUpperCase(),
            idType: n.idType || "Aadhar",
            idNumber: (n.idNumber || "").trim().toUpperCase(),
          }))
          .filter((n) => n.name !== ""),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        remarks: formData.remarks.trim(),
        status: formData.status,
      };

      // Optional SN
      if (formData.sn.trim()) {
        payload.sn = Number(formData.sn);
      }

      // Optional Client Code (auto-generated if empty)
      if (formData.clientCode.trim()) {
        payload.clientCode = formData.clientCode.trim().toUpperCase();
      }

      // Age calculation
      if (formData.age.trim()) {
        payload.age = Number(formData.age);
      }

      if (selectedClient) {
        // Update
        const res = await api.put(`/cbi/clients/${selectedClient._id}`, payload);
        if (res.data?.success) {
          toast.success("Client record updated in Client Database");
          setIsFormModalOpen(false);
          await fetchClients();
        }
      } else {
        // Create
        const res = await api.post("/cbi/clients", payload);
        if (res.data?.success) {
          toast.success("Client successfully registered in Client Database");
          setIsFormModalOpen(false);
          await fetchClients();
        }
      }
    } catch (err: any) {
      console.error("submitClient error:", err);
      toast.error(err.response?.data?.message || "Failed to save client record");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      setIsSubmitting(true);
      const res = await api.delete(`/cbi/clients/${clientToDelete._id}`);
      if (res.data?.success) {
        toast.success("Client archived from Client Database");
        setIsDeleteModalOpen(false);
        setClientToDelete(null);
        await fetchClients();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete client");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!clients.length) {
      toast.error("No client records to export");
      return;
    }

    const rows = filteredClients.map((c, idx) => ({
      SN: c.sn ?? idx + 1,
      "C.Code": c.clientCode || "",
      "Onboarding Date": c.onboardingDate || (c.createdAt ? c.createdAt.slice(0, 10) : ""),
      MANDATE: c.mandate || "",
      RM: c.rm || "",
      AOF: c.aof || "",
      "Client Name": c.clientName || c.companyName || "",
      "SIP SIZE": c.sipSize || 0,
      Occupation: c.occupation || "",
      DEPARTMENT: c.department || "",
      Income: c.income || "",
      Father_Name: c.fatherName || "",
      Mother_Name: c.motherName || "",
      ADDRESS: c.address || "",
      AGE: c.age ?? "",
      DOB: c.dob || "",
      PAN: c.pan || "",
      "KYC Status": getKycBadge(c.kycStatus).label,
      "BANK DETAILS": c.bankDetails || c.banks?.[0]?.bankDetails || "",
      "A/C TYPE": c.accountType || c.banks?.[0]?.accountType || "Savings",
      "BANK A/C NO.": c.bankAccountNo || c.banks?.[0]?.bankAccountNo || "",
      "BANK 2": c.banks?.[1]?.bankDetails ? `${c.banks[1].bankDetails} (A/C: ${c.banks[1].bankAccountNo || ""} - ${c.banks[1].accountType || "Savings"})` : "",
      "BANK 3": c.banks?.[2]?.bankDetails ? `${c.banks[2].bankDetails} (A/C: ${c.banks[2].bankAccountNo || ""} - ${c.banks[2].accountType || "Savings"})` : "",
      "BANK 4": c.banks?.[3]?.bankDetails ? `${c.banks[3].bankDetails} (A/C: ${c.banks[3].bankAccountNo || ""} - ${c.banks[3].accountType || "Savings"})` : "",
      "BANK 5": c.banks?.[4]?.bankDetails ? `${c.banks[4].bankDetails} (A/C: ${c.banks[4].bankAccountNo || ""} - ${c.banks[4].accountType || "Savings"})` : "",
      "NOMINEE NAME": c.nomineeName || c.nominees?.[0]?.name || "",
      NOM_RELATION: c.nomineeRelation || c.nominees?.[0]?.relation || "",
      "NOMINEE 1 ID TYPE": c.nominees?.[0]?.idType || c.nomineeIdType || "",
      "NOMINEE 1 ID NO": c.nominees?.[0]?.idNumber || c.nomineeIdNumber || "",
      "NOMINEE 2": c.nominees?.[1]?.name || "",
      "NOM_RELATION 2": c.nominees?.[1]?.relation || "",
      "NOMINEE 2 ID": c.nominees?.[1]?.idNumber
        ? `${c.nominees[1].idType || "ID"}: ${c.nominees[1].idNumber}`
        : "",
      "NOMINEE 3": c.nominees?.[2]?.name || "",
      "NOM_RELATION 3": c.nominees?.[2]?.relation || "",
      "NOMINEE 3 ID": c.nominees?.[2]?.idNumber
        ? `${c.nominees[2].idType || "ID"}: ${c.nominees[2].idNumber}`
        : "",
      MOBILE: c.mobile || c.phone || "",
      EMAIL: c.email || "",
      AADHAR: c.aadhar || "",
      REMARKS: c.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Client Database");
    XLSX.writeFile(
      workbook,
      `DS_Nexus_Client_Database_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Client Database exported to Excel");
  };

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          (client.clientName && client.clientName.toLowerCase().includes(term)) ||
          (client.companyName && client.companyName.toLowerCase().includes(term)) ||
          (client.clientCode && client.clientCode.toLowerCase().includes(term)) ||
          (client.pan && client.pan.toLowerCase().includes(term)) ||
          (client.aadhar && client.aadhar.includes(term)) ||
          (client.mobile && client.mobile.includes(term)) ||
          (client.bankAccountNo && client.bankAccountNo.includes(term)) ||
          (client.mandate && client.mandate.toLowerCase().includes(term));
        if (!matches) return false;
      }

      // RM
      if (selectedRm !== "ALL") {
        if ((client.rm || "").toUpperCase() !== selectedRm.toUpperCase()) return false;
      }

      // KYC (Strict 3 statuses)
      if (selectedKyc !== "ALL") {
        if (getKycBadge(client.kycStatus).label !== selectedKyc) return false;
      }

      // Occupation
      if (selectedOccupation !== "ALL") {
        if ((client.occupation || "").toUpperCase() !== selectedOccupation.toUpperCase()) return false;
      }

      return true;
    });
  }, [clients, searchTerm, selectedRm, selectedKyc, selectedOccupation]);

  // Aggregate Stats
  const totalSipBook = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.sipSize || 0), 0);
  }, [clients]);

  const kycValidatedCount = useMemo(() => {
    return clients.filter((c) => getKycBadge(c.kycStatus).label === "Validated").length;
  }, [clients]);

  const uniqueRms = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.rm) set.add(c.rm.trim().toUpperCase());
    });
    rms.forEach((r) => set.add(r.name.trim().toUpperCase()));
    return Array.from(set).sort();
  }, [clients, rms]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Client Database
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Enterprise Wealth Management & Client Dossier Database
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddRmModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer border border-slate-200"
            title="Add a Relationship Manager"
          >
            <Users className="size-3.5 text-indigo-600" />
            <span>Add RM</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-xs"
          >
            <Download className="size-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={fetchClients}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition-all cursor-pointer shadow-xs"
            title="Refresh Database"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Clients
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{clients.length}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Clients</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Monthly SIP Book
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-600">
              {formatINR(totalSipBook)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">/ month</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            KYC Validated
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">
              {kycValidatedCount} / {clients.length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {clients.length ? Math.round((kycValidatedCount / clients.length) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Assigned RMs
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600">{uniqueRms.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">Advisors</span>
          </div>
        </div>
      </div>

      {/* Search & Filters - All 4 in 1 Line */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
        {/* 1. Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name, C.Code, PAN, Aadhar, Mobile, Bank A/C..."
            className="w-full !pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 transition-all outline-hidden"
          />
        </div>

        {/* 2. RM Filter */}
        <select
          value={selectedRm}
          onChange={(e) => setSelectedRm(e.target.value)}
          className="shrink-0 w-36 px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-700 outline-hidden cursor-pointer transition-all"
        >
          <option value="ALL">All RMs</option>
          {uniqueRms.map((rm) => (
            <option key={rm} value={rm}>
              RM: {rm}
            </option>
          ))}
        </select>

        {/* 3. KYC Status Filter (3 options: Validated, Not Available, Frozen) */}
        <select
          value={selectedKyc}
          onChange={(e) => setSelectedKyc(e.target.value)}
          className="shrink-0 w-36 px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-700 outline-hidden cursor-pointer transition-all"
        >
          <option value="ALL">All KYC Status</option>
          {KYC_STATUS_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {/* 4. Occupation Filter */}
        <select
          value={selectedOccupation}
          onChange={(e) => setSelectedOccupation(e.target.value)}
          className="shrink-0 w-40 px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-700 outline-hidden cursor-pointer transition-all"
        >
          <option value="ALL">All Occupations</option>
          {OCCUPATION_OPTIONS.map((occ) => (
            <option key={occ} value={occ}>
              {occ}
            </option>
          ))}
        </select>
      </div>

      {/* Main Client DB Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3 w-14 text-center">SN</th>
                <th className="py-2.5 px-3 w-28 text-center">C.Code / Date</th>
                <th className="py-2.5 px-4 min-w-[180px] text-left">Client Name</th>
                <th className="py-2.5 px-3 w-28 text-center">RM / SIP</th>
                <th className="py-2.5 px-3 w-28 text-center">DOB / Age</th>
                <th className="py-2.5 px-3 w-36 text-left">PAN / Aadhar</th>
                <th className="py-2.5 px-3 w-36 text-center">KYC Status</th>
                <th className="py-2.5 px-4 min-w-[220px] text-left">Bank Details</th>
                <th className="py-2.5 px-3 w-36 text-left">Nominee</th>
                <th className="py-2.5 px-3 w-32 text-center">Mobile</th>
                <th className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>Loading Client Database records...</span>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No client records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or add a new client to Client Database.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => {
                  return (
                    <tr
                      key={client._id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedClient(client);
                        setIsDossierModalOpen(true);
                      }}
                    >
                      {/* SN (continuous) */}
                      <td className="py-2.5 px-3 text-center align-middle font-mono font-bold text-slate-500">
                        {client.sn ?? index + 1}
                      </td>

                      {/* C.Code & Onboarding Date (one below the other) */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {client.clientCode || "—"}
                          </span>
                          <span
                            className="mt-0.5 font-mono text-[10px] text-slate-400 font-medium whitespace-nowrap"
                            title="Client Onboarding Date (Data Creation Date)"
                          >
                            {client.onboardingDate || (client.createdAt ? client.createdAt.slice(0, 10) : "—")}
                          </span>
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-2.5 px-4 text-left align-middle font-semibold text-slate-900">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {client.clientName || client.companyName}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {client.occupation || "Investor"}{" "}
                            {client.department ? `• ${client.department}` : ""}
                          </p>
                        </div>
                      </td>

                      {/* RM & SIP Size (centered one below the other) */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-block">
                            {client.rm || "SOUMYA"}
                          </span>
                          <span className="mt-0.5 font-mono font-bold text-xs text-indigo-600">
                            {formatINR(client.sipSize || 0)}
                          </span>
                        </div>
                      </td>

                      {/* DOB / Age (centered one below the other) */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-mono text-[11px] font-semibold text-slate-800">
                            {client.dob || "—"}
                          </span>
                          {client.age !== undefined && client.age !== null ? (
                            <span className="mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {client.age} yrs
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">—</span>
                          )}
                        </div>
                      </td>

                      {/* PAN & Aadhar (left-aligned, clean monospace pair) */}
                      <td className="py-2.5 px-3 text-left align-middle font-mono">
                        <div>
                          <p className="font-bold text-xs text-slate-800 tracking-wider">
                            {client.pan || "—"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 font-medium tracking-wide">
                            {client.aadhar || "—"}
                          </p>
                        </div>
                      </td>

                      {/* KYC Status (3 statuses: Validated [green], Not Available [orange], Frozen [red]) */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        {(() => {
                          const badge = getKycBadge(client.kycStatus);
                          return (
                            <span
                              className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.pillClass}`}
                            >
                              {badge.icon === "validated" && <CheckCircle2 className="size-3 shrink-0" />}
                              {badge.icon === "not_available" && <AlertTriangle className="size-3 shrink-0" />}
                              {badge.icon === "frozen" && <AlertOctagon className="size-3 shrink-0" />}
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Bank Details */}
                      <td className="py-2.5 px-4 text-left align-middle text-slate-600">
                        <div className="max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-800 truncate" title={client.bankDetails}>
                              {client.bankDetails || "—"}
                            </p>
                            {client.banks && client.banks.length > 1 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0"
                                title={client.banks
                                  .map((b) => `${b.bankDetails || "Bank"} (${b.bankAccountNo || "A/C"} - ${b.accountType || "Savings"})`)
                                  .join("; ")}
                              >
                                +{client.banks.length - 1}
                              </span>
                            )}
                          </div>
                          {client.bankAccountNo && (
                            <p className="mt-0.5 text-[10px] font-mono text-slate-400 font-medium truncate">
                              A/C: {client.bankAccountNo} ({client.accountType || "Savings"})
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Nominee */}
                      <td className="py-2.5 px-3 text-left align-middle text-slate-700">
                        {client.nomineeName ? (
                          <div className="max-w-[170px]">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-xs text-slate-900 truncate">
                                {client.nomineeName}
                              </p>
                              {client.nominees && client.nominees.length > 1 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0"
                                  title={client.nominees
                                    .map(
                                      (n) =>
                                        `${n.name} (${n.relation}${
                                          n.idNumber ? ` - ${n.idType || "ID"}: ${n.idNumber}` : ""
                                        })`
                                    )
                                    .join("; ")}
                                >
                                  +{client.nominees.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {client.nomineeRelation || "Nominee"}
                              </span>
                              {(client.nominees?.[0]?.idNumber || client.nomineeIdNumber) && (
                                <span className="text-[9px] font-mono font-semibold text-indigo-600 bg-indigo-50/90 px-1 py-0.2 rounded border border-indigo-200/50">
                                  {client.nominees?.[0]?.idType || client.nomineeIdType || "ID"}:{" "}
                                  {client.nominees?.[0]?.idNumber || client.nomineeIdNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="py-2.5 px-3 text-center align-middle font-mono text-xs font-semibold text-slate-700">
                        {client.mobile || client.phone || "—"}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-2.5 px-3 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setIsDossierModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="View Full Client Dossier"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/cbi/onboarding?clientId=${client._id}`)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Stage 2: Onboard Client (Single Source of Truth)"
                          >
                            <UserPlus className="size-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/cbi/portfolio-review?clientId=${client._id}`)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Stage 3: Portfolio Review"
                          >
                            <UserCheck className="size-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(client)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Edit Client"
                            >
                              <Edit className="size-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setClientToDelete(client);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Permanently Delete Client"
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
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT CLIENT MODAL                                 */}
      {/* ======================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedClient ? "Edit Client" : "Register New Client"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedClient
                      ? `Updating records for C.Code: ${selectedClient.clientCode}`
                      : "C.Code and Serial Number are automatically assigned by the system"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "personal"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                1. Personal & KYC
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("investment")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "investment"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                2. Investment & Mandate
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("banking")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "banking"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                3. Bank & Remittance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("nominee")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "nominee"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                4. Nominee & Family
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitClient}>
              <div className="p-6 max-h-[68vh] overflow-y-auto space-y-4">
                {/* TAB 1: PERSONAL & KYC */}
                {activeTab === "personal" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* SN (Auto-generated / Non-editable) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SN (Serial Number)
                          <span className="text-slate-400 font-normal ml-1">(Auto-generated)</span>
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={formData.sn}
                          placeholder="Auto"
                          className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 outline-hidden cursor-not-allowed select-none shadow-inner"
                        />
                      </div>

                      {/* C.Code (System-Assigned / Non-editable) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          C.Code
                          <span className="text-indigo-600 font-semibold ml-1">
                            (Auto-assigned)
                          </span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={formData.clientCode}
                          placeholder="Assigned by system"
                          className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-600 outline-hidden cursor-not-allowed select-none shadow-inner"
                        />
                      </div>

                      {/* Client Onboarding Date (System Date / Non-editable) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Onboarding Date
                          <span className="text-emerald-600 font-semibold ml-1">
                            (System Date)
                          </span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={formData.onboardingDate}
                          className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 outline-hidden cursor-not-allowed select-none shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Client Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Client Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.clientName}
                          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                          placeholder="e.g. SHAKTI PRASAD MOHAPATRA"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Mobile */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          placeholder="e.g. 9776147497"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* DOB */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Date of Birth (DOB)
                        </label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={handleDobChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Age (Auto-calculated / Non-editable) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Age <span className="text-emerald-600 font-normal">(Auto-calculated)</span>
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={formData.age}
                          placeholder="Auto from DOB"
                          className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-not-allowed select-none shadow-inner"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="client@gmail.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* PAN */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={formData.pan}
                          onChange={(e) =>
                            setFormData({ ...formData, pan: e.target.value.toUpperCase() })
                          }
                          placeholder="e.g. BNLPM2029L"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Aadhar */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Aadhar Number
                        </label>
                        <input
                          type="text"
                          value={formData.aadhar}
                          onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
                          placeholder="12 digit Aadhar"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* KYC Status (Strict 3 statuses: Validated, Not Available, Frozen) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          KYC Status
                        </label>
                        <select
                          value={formData.kycStatus}
                          onChange={(e) => setFormData({ ...formData, kycStatus: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer"
                        >
                          {KYC_STATUS_OPTIONS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Annual Income */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Annual Income
                        </label>
                        <select
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">Select Income</option>
                          {INCOME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Residential Address
                      </label>
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. E-78, PH-1, BASANTI NGR, ROURKELA, 769012"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: INVESTMENT & MANDATE */}
                {activeTab === "investment" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* RM with inline Add RM capability */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Relationship Manager (RM)
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAddRmModalOpen(true)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="size-3" />
                            Add RM
                          </button>
                        </div>
                        <select
                          value={formData.rm}
                          onChange={(e) => setFormData({ ...formData, rm: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        >
                          {uniqueRms.map((rm) => (
                            <option key={rm} value={rm}>
                              {rm}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Monthly SIP Size */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Monthly SIP Size (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.sipSize}
                          onChange={(e) => setFormData({ ...formData, sipSize: e.target.value })}
                          placeholder="e.g. 12000"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-600 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Mandate */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mandate / Registration ID
                        </label>
                        <input
                          type="text"
                          value={formData.mandate}
                          onChange={(e) => setFormData({ ...formData, mandate: e.target.value })}
                          placeholder="e.g. 5768-38701 or BOTH"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* AOF */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          AOF (Account Opening Form No.)
                        </label>
                        <input
                          type="text"
                          value={formData.aof}
                          onChange={(e) => setFormData({ ...formData, aof: e.target.value })}
                          placeholder="e.g. 38701"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Occupation */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Occupation
                        </label>
                        <select
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        >
                          {OCCUPATION_OPTIONS.map((occ) => (
                            <option key={occ} value={occ}>
                              {occ}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department / Employer
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="e.g. RSP, SAIL"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Annual Income */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Annual Income
                        </label>
                        <select
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">Select Income Range</option>
                          {INCOME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Remarks / Security Note
                      </label>
                      <input
                        type="text"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="e.g. Pattanaik@1967, rourkela"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: BANKING */}
                {activeTab === "banking" && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <CreditCard className="size-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Bank Accounts
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400">
                          ({formData.banks.length}/5)
                        </span>
                      </div>

                      {formData.banks.length < 5 && (
                        <button
                          type="button"
                          onClick={handleAddBank}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors border border-indigo-200/80 cursor-pointer shadow-2xs"
                        >
                          <Plus className="size-3.5" />
                          <span>+ Add Bank</span>
                        </button>
                      )}
                    </div>

                    {/* Bank List (Up to 5) */}
                    <div className="space-y-3">
                      {formData.banks.map((bank, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="size-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                Bank Account {idx + 1}
                              </span>
                              {idx === 0 && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                                  Primary
                                </span>
                              )}
                            </div>

                            {formData.banks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBank(idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                title="Remove Bank Account"
                              >
                                <Trash2 className="size-3" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Bank Details (Bank Name, Branch, IFSC, MICR)
                            </label>
                            <input
                              type="text"
                              value={bank.bankDetails}
                              onChange={(e) =>
                                handleBankChange(idx, "bankDetails", e.target.value)
                              }
                              placeholder="e.g. SBI, BASANTI NGR, SBIN0014915, MICR-769002023"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:border-indigo-500 transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Account Type */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Account Type
                              </label>
                              <select
                                value={bank.accountType}
                                onChange={(e) =>
                                  handleBankChange(idx, "accountType", e.target.value)
                                }
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 cursor-pointer transition-all"
                              >
                                {ACCOUNT_TYPE_OPTIONS.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Account Number */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Bank Account Number
                              </label>
                              <input
                                type="text"
                                value={bank.bankAccountNo}
                                onChange={(e) =>
                                  handleBankChange(idx, "bankAccountNo", e.target.value)
                                }
                                placeholder="e.g. 31841605410"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden focus:border-indigo-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: NOMINEE & FAMILY */}
                {activeTab === "nominee" && (
                  <div className="space-y-4">
                    {/* Nominees Section Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Nominee Details
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400">
                          ({formData.nominees.length}/3)
                        </span>
                      </div>

                      {formData.nominees.length < 3 && (
                        <button
                          type="button"
                          onClick={handleAddNominee}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors border border-indigo-200/80 cursor-pointer shadow-2xs"
                        >
                          <Plus className="size-3.5" />
                          <span>+ Add Nominee</span>
                        </button>
                      )}
                    </div>

                    {/* Nominee List (Up to 3) */}
                    <div className="space-y-3">
                      {formData.nominees.map((nominee, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="size-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                Nominee {idx + 1}
                              </span>
                              {idx === 0 && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                                  Primary
                                </span>
                              )}
                            </div>

                            {formData.nominees.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNominee(idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                title="Remove Nominee"
                              >
                                <Trash2 className="size-3" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Nominee Name */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Nominee Name
                              </label>
                              <input
                                type="text"
                                value={nominee.name}
                                onChange={(e) =>
                                  handleNomineeChange(idx, "name", e.target.value)
                                }
                                placeholder="e.g. ADARMANI MOHAPATRA"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:border-indigo-500 transition-all"
                              />
                            </div>

                            {/* Nominee Relation */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Nominee Relation
                              </label>
                              <select
                                value={nominee.relation}
                                onChange={(e) =>
                                  handleNomineeChange(idx, "relation", e.target.value)
                                }
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
                              >
                                {NOMINEE_RELATIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Nominee ID Document Type Dropdown */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Document Type (Select One)
                              </label>
                              <select
                                value={nominee.idType || "Aadhar"}
                                onChange={(e) =>
                                  handleNomineeChange(idx, "idType", e.target.value)
                                }
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 cursor-pointer transition-all"
                              >
                                <option value="Aadhar">Aadhar</option>
                                <option value="PAN">PAN</option>
                              </select>
                            </div>

                            {/* Nominee ID Document Number Alphanumeric Text Box */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                {nominee.idType === "PAN" ? "PAN Card Number" : "Aadhaar Number"}
                              </label>
                              <input
                                type="text"
                                value={nominee.idNumber || ""}
                                onChange={(e) =>
                                  handleNomineeChange(idx, "idNumber", e.target.value.toUpperCase())
                                }
                                placeholder={
                                  nominee.idType === "PAN"
                                    ? "e.g. ABCDE1234F"
                                    : "e.g. 1234 5678 9012"
                                }
                                maxLength={nominee.idType === "PAN" ? 10 : 14}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-hidden focus:border-indigo-500 uppercase transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Family Details Header */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <User className="size-3.5 text-slate-500" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Family Details
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Father Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Father's Name
                          </label>
                          <input
                            type="text"
                            value={formData.fatherName}
                            onChange={(e) =>
                              setFormData({ ...formData, fatherName: e.target.value })
                            }
                            placeholder="e.g. BIMAL PRASAD PATTANAIK"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>

                        {/* Mother Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Mother's Name
                          </label>
                          <input
                            type="text"
                            value={formData.motherName}
                            onChange={(e) =>
                              setFormData({ ...formData, motherName: e.target.value })
                            }
                            placeholder="e.g. SANGHAMITRA PATTANAIK"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  {activeTab === "personal" && "Step 1 of 4: Personal Details"}
                  {activeTab === "investment" && "Step 2 of 4: Investment Portfolio"}
                  {activeTab === "banking" && "Step 3 of 4: Banking Remittance"}
                  {activeTab === "nominee" && "Step 4 of 4: Family & Nominee"}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                    <span>{selectedClient ? "Save Changes" : "Create Client"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD RELATIONSHIP MANAGER (RM) MODAL                     */}
      {/* ======================================================== */}
      {isAddRmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Users className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Relationship Manager</h3>
                  <p className="text-[11px] text-slate-500">Add new RM to Client Database registry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRmModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RM Full Name / Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newRmInput}
                  onChange={(e) => setNewRmInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SOUMYA, RAHUL, PRIYA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRmModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 cursor-pointer"
                >
                  Add RM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 360° CLIENT DOSSIER VIEW MODAL                           */}
      {/* ======================================================== */}
      {isDossierModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-indigo-300 border border-white/10">
                      SN #{selectedClient.sn ?? "-"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 text-white border border-indigo-400/30">
                      C.Code: {selectedClient.clientCode}
                    </span>
                    {(() => {
                      const badge = getKycBadge(selectedClient.kycStatus);
                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.dossierClass}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/10 text-emerald-300 border border-white/10">
                      Onboarded: {selectedClient.onboardingDate || (selectedClient.createdAt ? selectedClient.createdAt.slice(0, 10) : "—")}
                    </span>
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-white truncate pt-0.5">
                    {selectedClient.clientName || selectedClient.companyName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDossierModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Compact Highlights Strip */}
              <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">RM</span>
                  <span className="font-semibold text-indigo-300">{selectedClient.rm || "SOUMYA"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly SIP</span>
                  <span className="font-mono font-bold text-emerald-400">{formatINR(selectedClient.sipSize)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">PAN</span>
                  <span className="font-mono font-bold text-indigo-300">{selectedClient.pan || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">DOB / Age</span>
                  <span className="text-slate-200 font-medium">{selectedClient.dob || "—"} ({selectedClient.age ?? "-"} yrs)</span>
                </div>
              </div>
            </div>

            {/* Compact Body - High Density & No Wasted Space */}
            <div className="p-4 space-y-3 text-xs max-h-[65vh] overflow-y-auto">
              {/* Card 1: Personal & Contact Credentials */}
              <div className="bg-slate-50/90 rounded-xl border border-slate-200/90 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <User className="size-3.5 text-indigo-600" />
                  <span>Personal & Contact Profile</span>
                </div>
                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Onboarding Date</span>
                    <span className="font-mono font-semibold text-emerald-600 text-right truncate ml-2">
                      {selectedClient.onboardingDate || (selectedClient.createdAt ? selectedClient.createdAt.slice(0, 10) : "—")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Father's Name</span>
                    <span className="font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.fatherName || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Mother's Name</span>
                    <span className="font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.motherName || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Aadhaar Number</span>
                    <span className="font-mono font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.aadhar || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Occupation / Dept</span>
                    <span className="font-semibold text-slate-900 text-right truncate ml-2">
                      {selectedClient.occupation || "—"} {selectedClient.department ? `(${selectedClient.department})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Annual Income</span>
                    <span className="font-semibold text-indigo-600 text-right truncate ml-2">
                      {selectedClient.income || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Mobile Phone</span>
                    <span className="font-mono font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.mobile || selectedClient.phone || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500 font-medium text-[11px]">Email Address</span>
                    <span className="font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.email || "—"}</span>
                  </div>
                  <div className="sm:col-span-2 flex items-baseline justify-between pt-1">
                    <span className="text-slate-500 font-medium text-[11px] shrink-0">Residential Address</span>
                    <span className="font-medium text-slate-800 text-right text-xs truncate ml-3">{selectedClient.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Banking, Nominee & Mandate */}
              <div className="bg-slate-50/90 rounded-xl border border-slate-200/90 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <CreditCard className="size-3.5 text-indigo-600" />
                  <span>Banking, Nominee & Mandate</span>
                </div>
                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {selectedClient.banks && selectedClient.banks.length > 1 ? (
                    <div className="sm:col-span-2 py-1.5 border-b border-slate-200/50 space-y-1">
                      <span className="text-slate-500 font-medium text-[11px] block">
                        Bank Accounts ({selectedClient.banks.length}/5)
                      </span>
                      <div className="space-y-1.5">
                        {selectedClient.banks.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-2 bg-white border border-slate-200/70 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                          >
                            <span className="font-semibold text-slate-900 truncate" title={b.bankDetails}>
                              {bIdx + 1}. {b.bankDetails || "—"}
                            </span>
                            <span className="font-mono font-bold text-indigo-600 text-[11px] shrink-0">
                              {b.bankAccountNo || "—"} ({b.accountType || "Savings"})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium text-[11px]">Bank Branch</span>
                        <span className="font-semibold text-slate-900 text-right truncate ml-2" title={selectedClient.bankDetails}>{selectedClient.bankDetails || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium text-[11px]">Account Number</span>
                        <span className="font-mono font-bold text-indigo-600 text-right truncate ml-2">
                          {selectedClient.bankAccountNo || "—"} ({selectedClient.accountType || "Savings"})
                        </span>
                      </div>
                    </>
                  )}
                  {selectedClient.nominees && selectedClient.nominees.length > 1 ? (
                    <div className="sm:col-span-2 py-1.5 border-b border-slate-200/50 space-y-1">
                      <span className="text-slate-500 font-medium text-[11px] block">
                        Nominees ({selectedClient.nominees.length}/3)
                      </span>
                      <div className="space-y-1.5">
                        {selectedClient.nominees.map((nom, nIdx) => (
                          <div
                            key={nIdx}
                            className="p-1.5 bg-white border border-slate-200/70 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                          >
                            <div className="truncate">
                              <span className="font-semibold text-slate-900">
                                {nIdx + 1}. {nom.name || "—"}
                              </span>
                              <span className="font-bold text-purple-700 uppercase text-[10px] ml-1.5">
                                ({nom.relation || "Nominee"})
                              </span>
                            </div>
                            {nom.idNumber ? (
                              <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                {nom.idType || "ID"}: {nom.idNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium text-[11px]">Nominee Name</span>
                        <span className="font-semibold text-slate-900 text-right truncate ml-2">
                          {selectedClient.nomineeName || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium text-[11px]">Relationship & ID</span>
                        <div className="text-right ml-2 truncate">
                          <span className="font-bold text-purple-700 uppercase">
                            {selectedClient.nomineeRelation || "—"}
                          </span>
                          {(selectedClient.nominees?.[0]?.idNumber || selectedClient.nomineeIdNumber) && (
                            <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] ml-1.5">
                              {selectedClient.nominees?.[0]?.idType || selectedClient.nomineeIdType || "ID"}:{" "}
                              {selectedClient.nominees?.[0]?.idNumber || selectedClient.nomineeIdNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium text-[11px]">Mandate</span>
                    <span className="font-mono font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.mandate || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium text-[11px]">AOF Number</span>
                    <span className="font-mono font-semibold text-slate-900 text-right truncate ml-2">{selectedClient.aof || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>Status: <strong className="text-emerald-600 font-semibold">{selectedClient.status || "ACTIVE"}</strong></span>
                <span>•</span>
                <span>Tier: <strong className="text-slate-700 font-semibold">{selectedClient.tier || "RETAINER"}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDossierModalOpen(false);
                    navigate(`/cbi/onboarding?clientId=${selectedClient._id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-all cursor-pointer shadow-xs"
                  title="Proceed to Stage 2: Client Onboarding (Auto-fetch all fields)"
                >
                  <UserPlus className="size-3.5" />
                  <span>Onboard Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDossierModalOpen(false);
                    navigate(`/cbi/portfolio-review?clientId=${selectedClient._id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all cursor-pointer shadow-xs"
                  title="Proceed to Stage 3: Portfolio Review"
                >
                  <UserCheck className="size-3.5" />
                  <span>Portfolio Review</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDossierModalOpen(false);
                      handleOpenEditModal(selectedClient);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-xs"
                  >
                    <Edit className="size-3.5 text-indigo-600" />
                    <span>Edit Record</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDossierModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PERMANENT DELETE CONFIRMATION MODAL                      */}
      {/* ======================================================== */}
      {canDelete && isDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Client</h3>
                <p className="text-xs text-rose-500 font-semibold">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">
                {clientToDelete.clientName || clientToDelete.companyName}
              </strong>{" "}
              ({clientToDelete.clientCode}) from the Client Database? All linked portfolio reviews will also be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/30 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbiClients;
