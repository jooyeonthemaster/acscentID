-- Store per-user app preferences such as the default shipping address.
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

UPDATE user_profiles
SET preferences = '{}'::jsonb
WHERE preferences IS NULL;

ALTER TABLE user_profiles
ALTER COLUMN preferences SET DEFAULT '{}'::jsonb;
