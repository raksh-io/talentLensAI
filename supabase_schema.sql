-- 1. Create Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT CHECK (role IN ('recruiter', 'candidate')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    required_skills JSONB DEFAULT '[]',
    nice_to_have_skills JSONB DEFAULT '[]',
    min_experience_years NUMERIC DEFAULT 0,
    domains JSONB DEFAULT '[]',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    custom BOOLEAN DEFAULT TRUE
);

-- 3. Create Candidates table (Analysis Results)
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_name TEXT NOT NULL,
    job_id TEXT, -- Can be UUID or string ID
    job_title TEXT,
    fit_score INTEGER,
    score_label TEXT,
    matched_skills JSONB DEFAULT '[]',
    missing_skills JSONB DEFAULT '[]',
    explanation TEXT,
    recommendation TEXT,
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies (Simplified for Hackathon/Demo)
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Jobs are viewable by everyone." ON jobs FOR SELECT USING (true);
CREATE POLICY "Recruiters can create jobs." ON jobs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'recruiter')
);

CREATE POLICY "Candidates are viewable by everyone." ON candidates FOR SELECT USING (true);
CREATE POLICY "Logged in users can insert candidates." ON candidates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
