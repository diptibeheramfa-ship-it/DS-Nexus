import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import Loading from "../components/Loading";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import AdminNotificationBell from "../components/admin/AdminNotificationBell";

const Layout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Headless background notification listener for PWA / native Android device push
  useAdminNotifications();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;

  const isChat = location.pathname.startsWith("/chat") || location.pathname.startsWith("/discussions");

  return (
    <div className="flex h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/30">
      <Sidebar />

      <main className={`flex-1 relative ${isChat ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
        {/* Floating Top Header Controls */}
        <div className="fixed top-3 right-4 sm:top-5 sm:right-8 z-30 flex items-center gap-2.5">
          <AdminNotificationBell />
        </div>

        <div
          className={
            isChat
              ? "w-full h-full flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-2 sm:pb-3 pt-14 sm:pt-14"
              : "p-4 pt-16 sm:p-6 sm:pt-6 lg:p-8 max-w-400 mx-auto"
          }
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
