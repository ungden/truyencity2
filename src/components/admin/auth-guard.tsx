"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Clear any bad tokens first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          await supabase.auth.signOut();
          if (mounted) {
            router.push('/login?redirectTo=/admin');
          }
          return;
        }

        if (!session?.user) {
          if (mounted) {
            router.push('/login?redirectTo=/admin');
          }
          return;
        }

        setUser(session.user);

        // Check admin role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          if (mounted) {
            router.push('/?error=profile-not-found');
          }
          return;
        }

        if (profileData?.role !== 'admin') {
          if (mounted) {
            router.push('/?error=unauthorized');
          }
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          router.push('/login?redirectTo=/admin');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          router.push('/login?redirectTo=/admin');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect
  }

  return <>{children}</>;
}