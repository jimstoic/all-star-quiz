-- Enable public uploads for the quiz_asset bucket
-- Run this in Supabase SQL Editor

-- 1. Create Policy for INSERT (Upload)
-- Allows anyone (anon) to upload files to 'quiz_asset'
CREATE POLICY "Allow public uploads 1ov140_0" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'quiz_asset');

-- 2. Create Policy for SELECT (View)
-- Allows anyone to view files (Redundant if "Public Bucket" is checked, but safe to have)
CREATE POLICY "Allow public downloads 1ov140_1" ON storage.objects FOR SELECT TO public USING (bucket_id = 'quiz_asset');

-- 3. Create Policy for UPDATE (Overwrite)
-- Allows anyone to update files in 'quiz_asset'
CREATE POLICY "Allow public updates 1ov140_2" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'quiz_asset');
