-- Create the user_login_log table
CREATE TABLE IF NOT EXISTS public.user_login_log (
    login_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- User Info
    emp_id TEXT NOT NULL,
    user_name TEXT,
    role TEXT,

    -- Session Info
    session_id UUID NOT NULL,
    login_status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'LOGOUT'
    failure_reason TEXT,

    -- Timestamps
    login_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    logout_time TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    
    session_duration_minutes INT,

    -- Device/Context Info
    ip_address TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_login_log_emp_id ON public.user_login_log(emp_id);
CREATE INDEX IF NOT EXISTS idx_login_log_login_time ON public.user_login_log(login_time);
CREATE INDEX IF NOT EXISTS idx_login_log_session_id ON public.user_login_log(session_id);

-- Optional: Enable RLS
ALTER TABLE public.user_login_log ENABLE ROW LEVEL SECURITY;

-- Allow insert for everyone (since login happens before auth context is fully established in this custom flow, 
-- or strictly speaking, the user might be anon).
-- If you have strict RLS, you might need a policy.
-- For now, allowing public insert for the custom login flow to work.
CREATE POLICY "Allow anonymous inserts" ON public.user_login_log FOR INSERT WITH CHECK (true);

-- Allow users to view their own logs (if they are authenticated via Supabase Auth, but we use custom auth)
-- Since we use custom auth, we might just allow all Select for now or restrict it to Admin dashboard queries.
CREATE POLICY "Allow all select" ON public.user_login_log FOR SELECT USING (true);
CREATE POLICY "Allow all update" ON public.user_login_log FOR UPDATE USING (true);
