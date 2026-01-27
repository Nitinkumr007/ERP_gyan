-- Create the user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    emp_id TEXT NOT NULL,                     -- user_access_master.emp_id
    user_name TEXT,
    role TEXT,

    login_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE,                     -- last_activity + 50 min

    is_active BOOLEAN DEFAULT TRUE,

    ip_address TEXT,
    device_type TEXT,                         -- Mobile / Desktop
    browser TEXT,                             -- Chrome / Edge / Safari
    os TEXT,                                  -- Windows / Android / iOS

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    CONSTRAINT fk_user_sessions_emp
        FOREIGN KEY (emp_id)
        REFERENCES public.user_access_master (emp_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_emp_id ON public.user_sessions(emp_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);

-- RLS Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all select" ON public.user_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all update" ON public.user_sessions FOR UPDATE USING (true);
