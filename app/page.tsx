"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AuthLoadingScreen } from "@/components/ui/context-loaders";
import { createClient } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { AnalysePage } from "@/components/dashboard/analyse-page";
import { DetailsPage } from "@/components/dashboard/details-page";
import { LayoutDashboard, BarChart3, ListChecks } from "lucide-react";

interface UserProfile {
  id: string;
  pseudo: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  hire_date?: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const { t } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dd-users")
        .select("*")
        .eq("auth_user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Redirect non-admins to POS page
  useEffect(() => {
    if (userProfile && !profileLoading) {
      const role = userProfile.role?.toLowerCase() || "";
      if (!["admin", "superadmin", "manager"].includes(role)) {
        window.location.href = "/admin/pos";
      }
    }
  }, [userProfile, profileLoading]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <AuthLoadingScreen />;
  }

  // Show loading while checking role
  if (profileLoading || !userProfile) {
    return <AuthLoadingScreen />;
  }

  // Redirect non-admins - this is a safeguard
  const role = userProfile.role?.toLowerCase() || "";
  if (!["admin", "superadmin", "manager"].includes(role)) {
    return <AuthLoadingScreen />;
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="analyse">
            <BarChart3 className="h-3.5 w-3.5" />
            Analyse
          </TabsTrigger>
          <TabsTrigger value="details">
            <ListChecks className="h-3.5 w-3.5" />
            Détails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardOverview userRole={userProfile?.role} />
        </TabsContent>

        <TabsContent value="analyse" className="mt-0">
          <AnalysePage userRole={userProfile?.role} />
        </TabsContent>

        <TabsContent value="details" className="mt-0">
          <DetailsPage userRole={userProfile?.role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
