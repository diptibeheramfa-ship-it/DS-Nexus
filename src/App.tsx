import { Suspense, lazy } from 'react'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './pages/Layout'
import Loading from './components/Loading'

// Route Lazy Loading for Optimized Code Splitting & Fast Initial Page Load
const LoginLanding = lazy(() => import('./pages/LoginLanding'))
const LoginForm = lazy(() => import('./components/LoginForm'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Departments = lazy(() => import('./pages/Departments'))
const Holidays = lazy(() => import('./pages/Holidays'))
const Incentives = lazy(() => import('./pages/Incentives'))
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'))
const Authorization = lazy(() => import('./pages/Authorization'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Leave = lazy(() => import('./pages/Leave'))
const Payslips = lazy(() => import('./pages/Payslips'))
const PrintPayslip = lazy(() => import('./pages/PrintPayslip'))
const KpaDashboard = lazy(() => import('./pages/KpaDashboard'))
const KpaScorecard = lazy(() => import('./pages/KpaScorecard'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Chat = lazy(() => import('./pages/Chat'))
const Settings = lazy(() => import('./pages/Settings'))
const CbiDashboard = lazy(() => import('./pages/cbi/CbiDashboard'))
const CbiClients = lazy(() => import('./pages/cbi/CbiClients'))
const CbiDeals = lazy(() => import('./pages/cbi/CbiDeals'))
const CbiInvoices = lazy(() => import('./pages/cbi/CbiInvoices'))
const CbiBusinessProfile = lazy(() => import('./pages/cbi/CbiBusinessProfile'))
const CbiPortfolioReview = lazy(() => import('./pages/cbi/CbiPortfolioReview'))
const CbiClientOnboard = lazy(() => import('./pages/cbi/CbiClientOnboard'))
const CbiAuthorization = lazy(() => import('./pages/cbi/CbiAuthorization'))

const App = () => {
  return (
    <>
      <Toaster />
      <Suspense fallback={<Loading fullScreen />}>
        <Routes>
          <Route path="/login" element={<LoginLanding />} />

          <Route
            path="/login/admin"
            element={
              <LoginForm
                role="admin"
                title="Admin Portal"
                subtitle="Sign in to manage the organization"
              />
            }
          />
          <Route
            path="/login/employee"
            element={
              <LoginForm
                role="employee"
                title="Employee Portal"
                subtitle="Sign in to access your profile and records"
              />
            }
          />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/incentives" element={<Incentives />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/authorization" element={<Authorization />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/kpa" element={<KpaDashboard />} />
            <Route path="/kpa/scorecard" element={<KpaScorecard />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/discussions" element={<Navigate to="/chat" replace />} />
            <Route path="/settings" element={<Settings />} />

            {/* Client & Business Intelligence (CBI) Suite */}
            <Route path="/cbi" element={<Navigate to="/cbi/dashboard" replace />} />
            <Route path="/cbi/dashboard" element={<CbiDashboard />} />
            <Route path="/cbi/clients" element={<CbiClients />} />
            <Route path="/cbi/client-db" element={<Navigate to="/cbi/clients" replace />} />
            <Route path="/cbi/client-database" element={<Navigate to="/cbi/clients" replace />} />
            <Route path="/cbi/onboarding" element={<CbiClientOnboard />} />
            <Route path="/cbi/client-onboard" element={<Navigate to="/cbi/onboarding" replace />} />
            <Route path="/cbi/onboard" element={<Navigate to="/cbi/onboarding" replace />} />
            <Route path="/cbi/portfolio-review" element={<CbiPortfolioReview />} />
            <Route path="/cbi/profile-review" element={<Navigate to="/cbi/portfolio-review" replace />} />
            <Route path="/cbi/reviews" element={<Navigate to="/cbi/portfolio-review" replace />} />
            <Route path="/cbi/deals" element={<CbiDeals />} />
            <Route path="/cbi/invoices" element={<CbiInvoices />} />
            <Route path="/cbi/business" element={<CbiBusinessProfile />} />
            <Route path="/cbi/authorization" element={<CbiAuthorization />} />
            <Route path="/cbi/roles-authorization" element={<Navigate to="/cbi/authorization" replace />} />
            <Route path="/cbi/roles" element={<Navigate to="/cbi/authorization" replace />} />
          </Route>
          <Route path="/print/payslips/:id" element={<PrintPayslip />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App