import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../../context/AuthContext";

export interface CbiModulePermissions {
  canEdit: boolean;
  canDelete: boolean;
}

export interface CbiPermissionsState {
  isAdmin: boolean;
  clientDb: CbiModulePermissions;
  clientOnboarding: CbiModulePermissions;
  portfolioReview: CbiModulePermissions;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useCbiPermissions = (): CbiPermissionsState => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [permissions, setPermissions] = useState<{
    clientDb: CbiModulePermissions;
    clientOnboarding: CbiModulePermissions;
    portfolioReview: CbiModulePermissions;
  }>({
    clientDb: { canEdit: isAdmin, canDelete: isAdmin },
    clientOnboarding: { canEdit: isAdmin, canDelete: isAdmin },
    portfolioReview: { canEdit: isAdmin, canDelete: isAdmin },
  });
  const [loading, setLoading] = useState(!isAdmin);

  const fetchPermissions = useCallback(async () => {
    if (isAdmin) {
      setPermissions({
        clientDb: { canEdit: true, canDelete: true },
        clientOnboarding: { canEdit: true, canDelete: true },
        portfolioReview: { canEdit: true, canDelete: true },
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get("/cbi/my-permissions");
      if (res.data) {
        setPermissions({
          clientDb: {
            canEdit: Boolean(res.data.clientDb?.canEdit),
            canDelete: Boolean(res.data.clientDb?.canDelete),
          },
          clientOnboarding: {
            canEdit: Boolean(res.data.clientOnboarding?.canEdit),
            canDelete: Boolean(res.data.clientOnboarding?.canDelete),
          },
          portfolioReview: {
            canEdit: Boolean(res.data.portfolioReview?.canEdit),
            canDelete: Boolean(res.data.portfolioReview?.canDelete),
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch CBI permissions", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions, user?.role, user?._id]);

  return {
    isAdmin,
    clientDb: permissions.clientDb,
    clientOnboarding: permissions.clientOnboarding,
    portfolioReview: permissions.portfolioReview,
    loading,
    refresh: fetchPermissions,
  };
};

export default useCbiPermissions;
