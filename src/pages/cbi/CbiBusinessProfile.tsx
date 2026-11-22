import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  CreditCard,
  Target,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Layers,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

export interface BusinessUnit {
  unitId: string;
  name: string;
  code: string;
  headName: string;
  targetRevenue: number;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

const CbiBusinessProfile: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState({
    organizationName: "D&S Investment Group",
    legalName: "D&S Investment & Financial Consultancy Services Pvt. Ltd.",
    brandIdentifier: "DS-NEXUS-CORP",
    cinNumber: "U67190MH2021PTC368924",
    panNumber: "AAACD1234F",
    gstinNumber: "27AAACD1234F1Z5",
    corporateEmail: "corporate@dsinvestment.in",
    corporatePhone: "+91 661 240 5000",
    website: "https://dsinvestment.in",
    fiscalYear: "2026-2027",
    annualRevenueTarget: 50000000,
    currency: "INR",
    street: "Nexus Executive Towers, Financial District",
    city: "Rourkela",
    state: "Odisha",
    postalCode: "769004",
    country: "India",
    bankName: "HDFC Bank Ltd.",
    accountNumber: "50200089234120",
    ifscCode: "HDFC0001234",
    branch: "Commercial Banking Branch",
    accountType: "Current Account",
  });

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/business/profile");
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setProfile({
          organizationName: d.organizationName || "",
          legalName: d.legalName || "",
          brandIdentifier: d.brandIdentifier || "",
          cinNumber: d.cinNumber || "",
          panNumber: d.panNumber || "",
          gstinNumber: d.gstinNumber || "",
          corporateEmail: d.corporateEmail || "",
          corporatePhone: d.corporatePhone || "",
          website: d.website || "",
          fiscalYear: d.fiscalYear || "2026-2027",
          annualRevenueTarget: d.annualRevenueTarget || 50000000,
          currency: d.currency || "INR",
          street: d.registeredOffice?.street || "",
          city: d.registeredOffice?.city || "",
          state: d.registeredOffice?.state || "",
          postalCode: d.registeredOffice?.postalCode || "",
          country: d.registeredOffice?.country || "India",
          bankName: d.bankingDetails?.bankName || "",
          accountNumber: d.bankingDetails?.accountNumber || "",
          ifscCode: d.bankingDetails?.ifscCode || "",
          branch: d.bankingDetails?.branch || "",
          accountType: d.bankingDetails?.accountType || "Current Account",
        });
        setBusinessUnits(d.businessUnits || []);
      }
    } catch (err: any) {
      console.error("fetchProfile error:", err);
      toast.error("Failed to load business profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        organizationName: profile.organizationName,
        legalName: profile.legalName,
        brandIdentifier: profile.brandIdentifier,
        cinNumber: profile.cinNumber,
        panNumber: profile.panNumber,
        gstinNumber: profile.gstinNumber,
        corporateEmail: profile.corporateEmail,
        corporatePhone: profile.corporatePhone,
        website: profile.website,
        fiscalYear: profile.fiscalYear,
        annualRevenueTarget: Number(profile.annualRevenueTarget) || 0,
        currency: profile.currency,
        registeredOffice: {
          street: profile.street,
          city: profile.city,
          state: profile.state,
          postalCode: profile.postalCode,
          country: profile.country,
        },
        bankingDetails: {
          bankName: profile.bankName,
          accountNumber: profile.accountNumber,
          ifscCode: profile.ifscCode,
          branch: profile.branch,
          accountType: profile.accountType,
        },
        businessUnits,
      };

      await api.put("/cbi/business/profile", payload);
      toast.success("Business profile & strategic targets updated successfully");
    } catch (err: any) {
      console.error("Save profile error:", err);
      toast.error(err.response?.data?.error || "Failed to update business profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUnit = () => {
    const newUnit: BusinessUnit = {
      unitId: `BU-${Date.now().toString().slice(-4)}`,
      name: "New Practice Group",
      code: "NPG",
      headName: "Practice Lead",
      targetRevenue: 5000000,
      description: "Strategic business vertical description",
      status: "ACTIVE",
    };
    setBusinessUnits([...businessUnits, newUnit]);
  };

  const handleRemoveUnit = (index: number) => {
    setBusinessUnits(businessUnits.filter((_, i) => i !== index));
  };

  const handleUpdateUnit = (index: number, field: keyof BusinessUnit, value: any) => {
    const updated = [...businessUnits];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessUnits(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Target className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Business Profile & Corporate Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official corporate entity credentials, statutory tax numbers, and practice group targets
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchProfile()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <fieldset disabled={!isAdmin} className="space-y-6 border-0 p-0 m-0">
        {/* Section 1: Corporate Legal Identity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="size-4.5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Corporate Legal Identity & Identifiers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organization Display Name
              </label>
              <input
                type="text"
                value={profile.organizationName}
                onChange={(e) => setProfile({ ...profile, organizationName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Registered Legal Name
              </label>
              <input
                type="text"
                value={profile.legalName}
                onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Identification No. (CIN)
              </label>
              <input
                type="text"
                value={profile.cinNumber}
                onChange={(e) => setProfile({ ...profile, cinNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Permanent Account No. (PAN)
              </label>
              <input
                type="text"
                value={profile.panNumber}
                onChange={(e) => setProfile({ ...profile, panNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN Identification
              </label>
              <input
                type="text"
                value={profile.gstinNumber}
                onChange={(e) => setProfile({ ...profile, gstinNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Corporate Email
              </label>
              <input
                type="email"
                value={profile.corporateEmail}
                onChange={(e) => setProfile({ ...profile, corporateEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Head Office Phone
              </label>
              <input
                type="text"
                value={profile.corporatePhone}
                onChange={(e) => setProfile({ ...profile, corporatePhone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Website
              </label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Registered Office Address */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="size-4.5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Registered Corporate Headquarters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Building & Street Address
              </label>
              <input
                type="text"
                value={profile.street}
                onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN / Postal Code
              </label>
              <input
                type="text"
                value={profile.postalCode}
                onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Strategic Fiscal Targets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Target className="size-4.5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Strategic Fiscal Targets & Currency
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Financial Year
              </label>
              <input
                type="text"
                value={profile.fiscalYear}
                onChange={(e) => setProfile({ ...profile, fiscalYear: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Annual Organizational Revenue Target (INR)
              </label>
              <input
                type="number"
                value={profile.annualRevenueTarget}
                onChange={(e) => setProfile({ ...profile, annualRevenueTarget: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Currency
              </label>
              <input
                type="text"
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Practice Verticals & Business Units */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4.5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Practice Verticals & Business Units
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddUnit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Vertical</span>
            </button>
          </div>

          <div className="space-y-4">
            {businessUnits.map((bu, index) => (
              <div
                key={bu.unitId || index}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {bu.code || "UNIT"}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Practice Group #{index + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnit(index)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Vertical"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Vertical Name
                    </label>
                    <input
                      type="text"
                      value={bu.name}
                      onChange={(e) => handleUpdateUnit(index, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Short Code
                    </label>
                    <input
                      type="text"
                      value={bu.code}
                      onChange={(e) => handleUpdateUnit(index, "code", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Practice Head / Partner
                    </label>
                    <input
                      type="text"
                      value={bu.headName}
                      onChange={(e) => handleUpdateUnit(index, "headName", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Target Revenue (INR)
                    </label>
                    <input
                      type="number"
                      value={bu.targetRevenue}
                      onChange={(e) => handleUpdateUnit(index, "targetRevenue", Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Vertical Description
                    </label>
                    <input
                      type="text"
                      value={bu.description}
                      onChange={(e) => handleUpdateUnit(index, "description", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Corporate Banking & Remittance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="size-4.5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              5. Corporate Banking & Settlement Remittance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={profile.bankName}
                onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={profile.accountNumber}
                onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={profile.ifscCode}
                onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Branch Name
              </label>
              <input
                type="text"
                value={profile.branch}
                onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Type
              </label>
              <input
                type="text"
                value={profile.accountType}
                onChange={(e) => setProfile({ ...profile, accountType: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        </fieldset>

        {/* Submit Bar */}
        {isAdmin && (
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Save Corporate Business Profile</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CbiBusinessProfile;

