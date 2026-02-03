-- Create table for storing user-specific AI provider settings
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    default_provider TEXT DEFAULT 'openrouter',
    default_model TEXT,
    provider_configs JSONB DEFAULT '{}'::jsonb, -- Stores encrypted/obfuscated keys or preferences if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings" 
    ON public.ai_provider_settings FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
    ON public.ai_provider_settings FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
    ON public.ai_provider_settings FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at 
    BEFORE UPDATE ON public.ai_provider_settings 
    FOR EACH ROW 
    EXECUTE PROCEDURE moddatetime (updated_at);