-- Migration 016: Add Audience and Group ID to Bets
-- This ensures the columns exist for the V2 search RPC

-- 1. Add Audience Column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'audience') THEN
        ALTER TABLE public.bets ADD COLUMN audience text CHECK (audience IN ('PUBLIC', 'FRIENDS', 'GROUP', 'PRIVATE')) DEFAULT 'PUBLIC';
    END IF;
END $$;

-- 2. Add Group ID Column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'group_id') THEN
        ALTER TABLE public.bets ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Backfill Data
-- Ensure existing bets have an audience set based on the old "visibility" column
UPDATE public.bets 
SET audience = 'PUBLIC' 
WHERE audience IS NULL AND (visibility = 'PUBLIC' OR visibility IS NULL);

UPDATE public.bets 
SET audience = 'PRIVATE' 
WHERE audience IS NULL AND visibility = 'PRIVATE';

-- 4. Create Index for Audience
CREATE INDEX IF NOT EXISTS idx_bets_audience ON public.bets(audience);
CREATE INDEX IF NOT EXISTS idx_bets_group_id ON public.bets(group_id);
