"use client";

import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  
  const redirectTo = searchParams.get('redirectTo') || '/';

  useEffect(() => {
    let mounted = true;

    const checkInitialAuth = async () => {
      try {
        // Clear any bad tokens first
        await supabase.auth.signOut();
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          // Clear only Supabase auth tokens, not all user data
          try {
            const keysToRemove = Object.keys(localStorage).filter(
              key => key.startsWith('sb-') || key.startsWith('supabase.')
            );
            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
          } catch {
            // Ignore storage errors
          }
          setLoading(false);
          return;
        }

        if (session?.user && mounted) {
          
          // If redirecting to admin, check role first
          if (redirectTo.startsWith('/admin')) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              if (profile?.role === 'admin') {
                router.push(redirectTo);
              } else {
                router.push('/?error=unauthorized');
              }
            } catch (error) {
              console.error('Failed to check admin role:', error);
              router.push('/');
            }
          } else {
            router.push(redirectTo);
          }
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Initial auth check failed:', error);
        // Clear only Supabase auth tokens, not all user data
        try {
          const keysToRemove = Object.keys(localStorage).filter(
            key => key.startsWith('sb-') || key.startsWith('supabase.')
          );
          keysToRemove.forEach(key => localStorage.removeItem(key));
          sessionStorage.clear();
        } catch {
          // Ignore storage errors
        }
        setLoading(false);
      }
    };

    checkInitialAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && mounted) {
        
        // If redirecting to admin, check role first
        if (redirectTo.startsWith('/admin')) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role === 'admin') {
              router.push(redirectTo);
            } else {
              router.push('/?error=unauthorized');
            }
          } catch (error) {
            console.error('Failed to check admin role:', error);
            router.push('/');
          }
        } else {
          router.push(redirectTo);
        }
      }
      
      if (event === 'SIGNED_OUT' && mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Button asChild variant="ghost" className="absolute top-4 left-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Trang chủ
        </Link>
      </Button>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Chào mừng đến TruyenCity</CardTitle>
          <CardDescription>
            Đăng nhập để lưu tiến trình đọc và đồng bộ tủ sách của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Địa chỉ email',
                  password_label: 'Mật khẩu',
                  button_label: 'Đăng nhập',
                  social_provider_text: 'Đăng nhập với {{provider}}',
                  link_text: 'Đã có tài khoản? Đăng nhập',
                },
                sign_up: {
                  email_label: 'Địa chỉ email',
                  password_label: 'Mật khẩu',
                  button_label: 'Đăng ký',
                  social_provider_text: 'Đăng ký với {{provider}}',
                  link_text: 'Chưa có tài khoản? Đăng ký',
                },
                forgotten_password: {
                  email_label: 'Địa chỉ email',
                  button_label: 'Gửi hướng dẫn',
                  link_text: 'Quên mật khẩu?',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}