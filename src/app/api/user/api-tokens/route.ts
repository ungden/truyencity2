import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

// API Token Management for Claude Code Integration
// Allows users to generate tokens for external access

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's API tokens
    const { data: tokens, error } = await supabase
      .from('user_api_tokens')
      .select('id, name, prefix, created_at, last_used_at, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch (error) {
    console.error('API Token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, tokenId, name } = body;

    switch (action) {
      case 'create':
        return await createToken(supabase, user.id, name);
      case 'revoke':
        return await revokeToken(supabase, user.id, tokenId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createToken(supabase: any, userId: string, name: string) {
  // Generate a secure token
  const rawToken = randomBytes(32).toString('hex');
  const prefix = rawToken.substring(0, 8);
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  // Token expires in 90 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { data: token, error } = await supabase
    .from('user_api_tokens')
    .insert({
      user_id: userId,
      name: name || 'Claude Code Token',
      token_hash: hashedToken,
      prefix: prefix,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, name, prefix, created_at, expires_at')
    .single();

  if (error) {
    console.error('Error creating token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the raw token ONLY ONCE - it won't be stored
  return NextResponse.json({
    success: true,
    token: {
      ...token,
      rawToken: `tc_${rawToken}`, // Prefix with tc_ for TruyenCity
    },
    message: 'Lưu token này ngay! Bạn sẽ không thể xem lại.',
  });
}

async function revokeToken(supabase: any, userId: string, tokenId: string) {
  const { error } = await supabase
    .from('user_api_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
