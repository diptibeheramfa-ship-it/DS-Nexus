import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowRight,
  ChevronRight,
  FileCheck2,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export const formatINR = (amount: number = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactINR = (amount: number = 0) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount}`;
};

interface CbiDashboardData {
  kpis: {
    totalClients: number;
    activeClients: number;
    totalSipVolume: number;
    annualizedRunRate: number;
    totalOnboarded: number;
    singleHoldingCount: number;
    jointHoldingCount: number;
    docCompletionRate: number;
    totalReviews: number;
    pendingReviews: number;
    completedReviews: number;
    deferredReviews: number;
    totalEmployees: number;
    delegatedStaffCount: number;
    fullAccessStaff: number;
  };
  clientDb: {
    totalClients: number;
    activeKycClients: number;
    pendingKycClients: number;
    frozenKycClients: number;
    totalSipVolume: number;
    annualizedRunRate: number;
    averageSip?: number;
    rmDistribution: Record<string, number>;
    rmAumDistribution?: Record<string, number>;
    occupationDistribution: Record<string, number>;
    sectorBreakdown?: Array<{
      sector: string;
      count: number;
      volume: number;
      percentage: number;
    }>;
    sipPortfolios?: Array<{
      _id: string;
      name: string;
      clientCode: string;
      rm: string;
      sipSize: number;
      kycStatus: string;
    }>;
  };
  clientOnboarding: {
    totalOnboarded: number;
    singleHoldingCount: number;
    jointHoldingCount: number;
    completeDocsCount: number;
    docCompletionRate: number;
    docChecklist?: {
      panSubmitted: number;
      aadharSubmitted: number;
      photoSubmitted: number;
      chequeSubmitted: number;
      total: number;
    };
  };
  portfolioReview: {
    totalReviews: number;
    reviewStatus: {
      pending: number;
      inProgress: number;
      completed: number;
      deferred: number;
    };
    reviewIntimations: {
      firstTime: number;
      secondTime: number;
      completed: number;
    };
    reviewerBreakdown?: Array<{
      reviewer: string;
      count: number;
      percentage: number;
    }>;
    upcomingReviews: Array<{
      _id: string;
      clientName: string;
      ucc: string;
      nextReviewDate: string;
      assignedPerson: string;
      intimation: string;
      status: string;
    }>;
  };
  authorization: {
    totalEmployees: number;
    delegatedStaffCount: number;
    clientDbStaff: number;
    clientOnboardingStaff: number;
    portfolioReviewStaff: number;
    fullAccessStaff: number;
  };
  stagePipeline: {
    stage1Clients: number;
    stage2Onboarded: number;
    stage3Reviews: number;
    stage3Completed: number;
    onboardingRate: number;
    reviewResolutionRate: number;
  };
}

const PALETTE = [
  "#4f46e5", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

const CbiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<CbiDashboardData | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [donutView, setDonutView] = useState<"sector" | "reviewer">("sector");
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/cbi/dashboard");
      if (res.data?.success && res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load CBI dashboard:", err);
      toast.error(err?.response?.data?.message || "Failed to load CBI overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = dashboardData?.kpis;
  const clientDb = dashboardData?.clientDb;
  const clientOnboarding = dashboardData?.clientOnboarding;
  const portfolioReview = dashboardData?.portfolioReview;
  const authorization = dashboardData?.authorization;
  const stagePipeline = dashboardData?.stagePipeline;

  // Process Clean Bar Chart Data
  const barChartData = useMemo(() => {
    if (!clientDb?.sipPortfolios || clientDb.sipPortfolios.length === 0) return [];
    return clientDb.sipPortfolios.slice(0, 7);
  }, [clientDb?.sipPortfolios]);

  const maxSip = useMemo(() => {
    if (barChartData.length === 0) return 80000;
    const maxVal = Math.max(...barChartData.map((d) => d.sipSize));
    return Math.ceil(maxVal / 10000) * 10000 || 80000;
  }, [barChartData]);

  // Process Multi-Segment Donut Data (Sector vs Reviewer)
  const donutData = useMemo(() => {
    if (donutView === "sector") {
      const sectors = clientDb?.sectorBreakdown || [];
      const totalVolume = sectors.reduce((sum, s) => sum + s.volume, 0) || 1;
      let accumulated = 0;

      return sectors.map((s, idx) => {
        const startAngle = (accumulated / totalVolume) * 360;
        accumulated += s.volume;
        const endAngle = (accumulated / totalVolume) * 360;
        return {
          id: s.sector,
          label: s.sector,
          valueFormatted: formatCompactINR(s.volume),
          count: `${s.count} ${s.count === 1 ? "Client" : "Clients"}`,
          percentage: s.percentage,
          color: PALETTE[idx % PALETTE.length],
          startAngle,
          endAngle,
        };
      });
    } else {
      const reviewers = portfolioReview?.reviewerBreakdown || [];
      const totalReviews = reviewers.reduce((sum, r) => sum + r.count, 0) || 1;
      let accumulated = 0;

      return reviewers.map((r, idx) => {
        const startAngle = (accumulated / totalReviews) * 360;
        accumulated += r.count;
        const endAngle = (accumulated / totalReviews) * 360;
        return {
          id: r.reviewer,
          label: r.reviewer,
          valueFormatted: `${r.count} ${r.count === 1 ? "Review" : "Reviews"}`,
          count: `Assigned`,
          percentage: r.percentage,
          color: PALETTE[idx % PALETTE.length],
          startAngle,
          endAngle,
        };
      });
    }
  }, [donutView, clientDb?.sectorBreakdown, portfolioReview?.reviewerBreakdown]);

  // Helper to compute SVG arc coordinates
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Institutional Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Building2 className="size-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Client & Business Intelligence
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">FY 2026–27</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Business Overview & Summary
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/cbi/clients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Register Client</span>
          </Link>

          <Link
            to="/cbi/authorization"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer"
            title="Manage CBI Roles & Delegation"
          >
            <ShieldCheck className="size-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Access Roles</span>
          </Link>
        </div>
      </div>

      {/* 2. Top-Level Core Financial & Operational Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly SIP Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Monthly Systematic Inflow</span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Active AUM
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCompactINR(kpis?.totalSipVolume || 0)}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ month</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Annual Run-Rate</span>
            <span className="font-mono font-bold text-slate-800">
              {formatCompactINR(kpis?.annualizedRunRate || 0)}
            </span>
          </div>
        </div>

        {/* KPI 2: Master Client Base */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Master Client Accounts</span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Stage 1
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis?.totalClients || 0}
              <span className="text-sm font-normal text-slate-400 ml-1.5">Accounts</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {kpis?.activeClients || 0} KYC Validated
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Average Ticket Size</span>
            <span className="font-mono font-bold text-slate-800">
              {formatCompactINR(clientDb?.averageSip || 0)}
            </span>
          </div>
        </div>

        {/* KPI 3: Onboarding Velocity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Onboarding Dossiers</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Stage 2
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {stagePipeline?.onboardingRate || 0}%
            </span>
            <span className="text-xs text-slate-500">
              {kpis?.totalOnboarded || 0} of {kpis?.totalClients || 0} Files
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Doc Verification Health</span>
            <span className="font-bold text-emerald-600">
              {kpis?.docCompletionRate || 0}% Complete
            </span>
          </div>
        </div>

        {/* KPI 4: Portfolio Review Standing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Portfolio Reviews</span>
            <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              Stage 3
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis?.totalReviews || 0}
              <span className="text-sm font-normal text-slate-400 ml-1.5">Scheduled</span>
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              {kpis?.pendingReviews || 0} Actionable
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Resolution Rate</span>
            <span className="font-bold text-purple-700">
              {stagePipeline?.reviewResolutionRate || 0}% ({kpis?.completedReviews || 0} Closed)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Flagship Business Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1 (Left 7 Cols): Monthly Capital Allocation by Account (Bar Chart) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Monthly Commitment by Account (SIP)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portfolio commitment size across registered client mandates
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono font-bold text-indigo-600">
                  Book: {formatINR(kpis?.totalSipVolume || 0)}
                </span>
                <Link
                  to="/cbi/clients"
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="View full Client Database"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Structured Column Chart */}
            <div className="mt-6 relative h-64 w-full">
              {barChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No portfolio accounts recorded.
                </div>
              ) : (
                <div className="relative h-full w-full flex flex-col justify-between">
                  {/* Chart Plot Area with Y-Axis */}
                  <div className="relative h-48 w-full flex">
                    {/* Y-Axis Labels */}
                    <div className="w-12 h-full flex flex-col justify-between text-right pr-2.5 text-[9px] font-mono text-slate-400 select-none pb-0">
                      <span>{formatCompactINR(maxSip)}</span>
                      <span>{formatCompactINR(Math.round(maxSip * 0.75))}</span>
                      <span>{formatCompactINR(Math.round(maxSip * 0.5))}</span>
                      <span>{formatCompactINR(Math.round(maxSip * 0.25))}</span>
                      <span>₹0</span>
                    </div>

                    {/* Plot Grid & Bars */}
                    <div className="relative flex-1 h-full border-b border-slate-300">
                      {/* Gridlines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="w-full border-b border-slate-100" />
                        <div className="w-full border-b border-slate-100" />
                        <div className="w-full border-b border-slate-100" />
                        <div className="w-full border-b border-slate-100" />
                        <div className="w-full" />
                      </div>

                      {/* Columns */}
                      <div className="relative h-full flex items-end justify-around px-2 sm:px-4 gap-2 z-10">
                        {barChartData.map((client, idx) => {
                          const pct = Math.max(6, Math.min(100, Math.round((client.sipSize / maxSip) * 100)));
                          const isHovered = hoveredBarIndex === idx;

                          return (
                            <div
                              key={client._id}
                              className="flex-1 max-w-[54px] flex flex-col items-center h-full justify-end cursor-pointer group"
                              onMouseEnter={() => setHoveredBarIndex(idx)}
                              onMouseLeave={() => setHoveredBarIndex(null)}
                              onClick={() => navigate(`/cbi/clients?search=${client.clientCode}`)}
                            >
                              {/* Top Value Tag */}
                              <span
                                className={`text-[10px] font-mono font-bold mb-1 transition-all ${isHovered ? "text-indigo-900 scale-105" : "text-slate-600"
                                  }`}
                              >
                                {formatCompactINR(client.sipSize)}
                              </span>

                              {/* Bar Pillar */}
                              <div className="w-full bg-slate-100/60 rounded-t-md h-full flex items-end">
                                <div
                                  style={{ height: `${pct}%` }}
                                  className={`w-full rounded-t-md transition-all duration-200 ${isHovered
                                      ? "bg-indigo-800 shadow-sm"
                                      : "bg-indigo-600 group-hover:bg-indigo-700"
                                    }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* X-Axis Labels row */}
                  <div className="w-full flex pl-12 pt-2">
                    <div className="flex-1 flex justify-around px-2 sm:px-4 gap-2">
                      {barChartData.map((client) => (
                        <div
                          key={client._id}
                          className="flex-1 max-w-[54px] flex flex-col items-center text-center overflow-hidden"
                        >
                          <span className="text-[11px] font-semibold text-slate-700 truncate w-full" title={client.name}>
                            {client.name.split(" ")[0]}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {client.clientCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Inspection Strip */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            {hoveredBarIndex !== null && barChartData[hoveredBarIndex] ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  {barChartData[hoveredBarIndex].name}
                </span>
                <span className="text-slate-300">•</span>
                <span>Code: <strong className="font-mono text-slate-700">{barChartData[hoveredBarIndex].clientCode}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Monthly: <strong className="font-mono text-indigo-600">{formatINR(barChartData[hoveredBarIndex].sipSize)}</strong></span>
              </div>
            ) : (
              <span>Top accounts by systematic monthly capital volume</span>
            )}
            <span className="text-[11px] font-mono text-slate-400">
              {barChartData.length} Portfolios Charted
            </span>
          </div>
        </div>

        {/* CHART 2 (Right 5 Cols): Portfolio Allocation Donut & Tabular Legend */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Portfolio Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asset allocation across sectors & review advisors
                </p>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setDonutView("sector")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${donutView === "sector"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "hover:text-slate-900"
                    }`}
                >
                  By Sector
                </button>
                <button
                  type="button"
                  onClick={() => setDonutView("reviewer")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${donutView === "reviewer"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "hover:text-slate-900"
                    }`}
                >
                  By Advisor
                </button>
              </div>
            </div>

            {/* Circular Ring & Structured Legend */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
              {/* Refined SVG Donut */}
              <div className="relative size-36 shrink-0 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="-1.1 -1.1 2.2 2.2">
                  {donutData.map((slice, idx) => {
                    const start = getCoordinatesForPercent(slice.startAngle / 360);
                    const end = getCoordinatesForPercent(slice.endAngle / 360);
                    const largeArcFlag = slice.percentage > 50 ? 1 : 0;
                    const pathData = [
                      `M ${start[0]} ${start[1]}`,
                      `A 1 1 0 ${largeArcFlag} 1 ${end[0]} ${end[1]}`,
                      `L 0 0`,
                    ].join(" ");

                    const isHovered = hoveredDonutIndex === idx;

                    return (
                      <path
                        key={slice.id}
                        d={pathData}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="0.03"
                        opacity={isHovered ? 1 : 0.9}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredDonutIndex(idx)}
                        onMouseLeave={() => setHoveredDonutIndex(null)}
                      />
                    );
                  })}
                  {/* Clean Center Cutout */}
                  <circle cx="0" cy="0" r="0.66" fill="#ffffff" />
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {donutView === "sector" ? "Total AUM" : "Reviews"}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {donutView === "sector"
                      ? formatCompactINR(kpis?.totalSipVolume || 0)
                      : `${kpis?.totalReviews || 0} Total`}
                  </span>
                </div>
              </div>

              {/* Clean Structured Legend */}
              <div className="flex-1 w-full space-y-2">
                {donutData.map((item, idx) => {
                  const isHovered = hoveredDonutIndex === idx;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredDonutIndex(idx)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isHovered ? "bg-slate-50" : "hover:bg-slate-50/60"
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-800">{item.label}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {item.valueFormatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.count}</span>
                        <span className="font-medium text-slate-600">{item.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {donutView === "sector"
                ? `Lead Sector: ${donutData[0]?.label || "General"}`
                : `Lead Reviewer: ${donutData[0]?.label || "General"}`}
            </span>
            <span className="font-semibold text-indigo-600">
              {donutData[0]?.percentage || 0}% Concentration
            </span>
          </div>
        </div>
      </div>

      {/* 4. Structured Operational Summary Row (Enterprise Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PANEL 1: Onboarding & KYC Document Verification Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Onboarding & Compliance Health
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {kpis?.docCompletionRate || 0}% Compliance Index
            </span>
          </div>

          {/* Structured Document Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-2">Verification Item</th>
                  <th className="pb-2 text-center">Submitted</th>
                  <th className="pb-2 text-right">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 font-medium text-slate-700">Permanent Account Number (PAN)</td>
                  <td className="py-2.5 text-center font-mono text-slate-600">
                    {clientOnboarding?.docChecklist?.panSubmitted || 0} / {clientOnboarding?.totalOnboarded || 0}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">100%</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-slate-700">Aadhaar Card Identification</td>
                  <td className="py-2.5 text-center font-mono text-slate-600">
                    {clientOnboarding?.docChecklist?.aadharSubmitted || 0} / {clientOnboarding?.totalOnboarded || 0}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">
                    {clientOnboarding?.totalOnboarded
                      ? Math.round(
                        ((clientOnboarding.docChecklist?.aadharSubmitted || 0) /
                          clientOnboarding.totalOnboarded) *
                        100
                      )
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-slate-700">Passport Photographs</td>
                  <td className="py-2.5 text-center font-mono text-slate-600">
                    {clientOnboarding?.docChecklist?.photoSubmitted || 0} / {clientOnboarding?.totalOnboarded || 0}
                  </td>
                  <td className="py-2.5 text-right font-bold text-teal-600">100%</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-slate-700">Bank Mandate Proof (Cancelled Cheque)</td>
                  <td className="py-2.5 text-center font-mono text-slate-600">
                    {clientOnboarding?.docChecklist?.chequeSubmitted || 0} / {clientOnboarding?.totalOnboarded || 0}
                  </td>
                  <td className="py-2.5 text-right font-bold text-amber-600">
                    {clientOnboarding?.totalOnboarded
                      ? Math.round(
                        ((clientOnboarding.docChecklist?.chequeSubmitted || 0) /
                          clientOnboarding.totalOnboarded) *
                        100
                      )
                      : 0}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Holdings: <strong>{kpis?.singleHoldingCount || 0} Single</strong> • <strong>{kpis?.jointHoldingCount || 0} Joint</strong>
            </span>
            <Link
              to="/cbi/onboarding"
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>View Onboarded Clients</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* PANEL 2: Portfolio Review Operations & Governance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Review Operations & Governance
              </h3>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              {kpis?.totalReviews || 0} Reviews Scheduled
            </span>
          </div>

          {/* Review Status Flow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Scheduled Actions:</span>
              <span className="font-semibold text-slate-800">
                <strong className="text-amber-600">{kpis?.pendingReviews || 0} Pending</strong> •{" "}
                <strong className="text-emerald-600">{kpis?.completedReviews || 0} Completed</strong> •{" "}
                <strong className="text-purple-600">{kpis?.deferredReviews || 0} Deferred</strong>
              </span>
            </div>

            {/* Upcoming Priority Review Alert */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Next Upcoming Review</span>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {portfolioReview?.upcomingReviews?.[0]?.nextReviewDate || "12-04-2026"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Client:{" "}
                <strong>
                  {portfolioReview?.upcomingReviews?.[0]?.clientName || "Sibasish Pattanaik"}
                </strong>{" "}
                ({portfolioReview?.upcomingReviews?.[0]?.ucc || "OR00758"}) • Assigned:{" "}
                <strong>{portfolioReview?.upcomingReviews?.[0]?.assignedPerson || "SOUMYA"}</strong>
              </p>
            </div>

            {/* Roles Delegation Badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">Role-Based Access Control</p>
                <p className="text-[11px] text-slate-500">
                  Master Admin access active • {authorization?.totalEmployees || 0} Staff members
                </p>
              </div>
              <Link
                to="/cbi/authorization"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
              >
                Roles Matrix
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Intimations: {portfolioReview?.reviewIntimations?.firstTime || 0} Active Dispatches</span>
            <Link
              to="/cbi/portfolio-review"
              className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
            >
              <span>Manage Reviews</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CbiDashboard;
