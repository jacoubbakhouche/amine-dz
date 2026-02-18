-- Create the clinical_data table
CREATE TABLE IF NOT EXISTS clinical_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL, -- e.g., 'dental_products' or 'antibiotic_rules'
    data JSONB NOT NULL,   -- The actual JSON content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE clinical_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read data
CREATE POLICY "Allow authenticated users to read clinical data" 
ON clinical_data FOR SELECT 
TO authenticated 
USING (true);

-- Create index on the 'source' column for faster lookups
CREATE INDEX IF NOT EXISTS idx_clinical_data_source ON clinical_data(source);
