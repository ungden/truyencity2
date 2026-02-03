-- Create user_api_tokens table for Claude Code external access
CREATE TABLE IF NOT EXISTS user_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(token_hash)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_token_hash ON user_api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_user_id ON user_api_tokens(user_id);

-- Enable RLS
ALTER TABLE user_api_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view own tokens"
  ON user_api_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own tokens
CREATE POLICY "Users can create own tokens"
  ON user_api_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own tokens"
  ON user_api_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow service role to read all tokens (for API validation)
CREATE POLICY "Service role can read all tokens"
  ON user_api_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Allow service role to update last_used_at
CREATE POLICY "Service role can update tokens"
  ON user_api_tokens
  FOR UPDATE
  TO service_role
  USING (true);

-- Comment on table
COMMENT ON TABLE user_api_tokens IS 'API tokens for external Claude Code CLI access';
