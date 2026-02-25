import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { TokenActionSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';
import type { SupabaseClient } from '@supabase/supabase-js';

export const maxDuration = 15;

// API Token Management for Claude Code Integration
// Allows users to generate tokens for external access

export async function GET() {
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
      console.error('[api-tokens] Error fetching tokens:', error);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch (error) {
    console.error('[api-tokens] GET error:', error);
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

    const rawBody = await request.json();
    const parseResult = TokenActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const body = parseResult.data;

    switch (body.action) {
      case 'create':
        return await createToken(supabase, user.id, body.name);
      case 'revoke':
        return await revokeToken(supabase, user.id, body.tokenId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[api-tokens] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createToken(supabase: SupabaseClient, userId: string, name?: string) {
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
    console.error('[api-tokens] Error creating token:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
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

async function revokeToken(supabase: SupabaseClient, userId: string, tokenId: string) {
  const { error } = await supabase
    .from('user_api_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', userId);

  if (error) {
    console.error('[api-tokens] Error revoking token:', error);
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
