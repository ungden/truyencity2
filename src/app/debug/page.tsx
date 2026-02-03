"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User:', user);
        console.log('User error:', userError);
        setUser(user);

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          console.log('Profile:', profile);
          console.log('Profile error:', profileError);
          setProfile(profile);
        }
      } catch (error) {
        console.error('Debug error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Profile:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Role Check:</h2>
          <p>Is Admin: {profile?.role === 'admin' ? 'YES' : 'NO'}</p>
          <p>Role: {profile?.role || 'No role'}</p>
        </div>
      </div>
    </div>
  );
}