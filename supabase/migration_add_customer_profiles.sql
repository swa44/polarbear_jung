CREATE TABLE IF NOT EXISTS customer_profiles (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_profiles'
      AND policyname = 'customer_profiles_service_all'
  ) THEN
    CREATE POLICY "customer_profiles_service_all"
      ON customer_profiles
      FOR ALL
      USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS customer_profiles_updated_at ON customer_profiles;

CREATE TRIGGER customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
