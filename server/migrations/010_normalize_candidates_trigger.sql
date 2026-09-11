-- HireFlow - Migration 010: Candidate Metadata Normalization Trigger
-- Standardizes degree, college, and city fields before insertion or update.

-- 1. Create degree normalization function
CREATE OR REPLACE FUNCTION normalize_degree(degree_str TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF degree_str IS NULL OR trim(degree_str) = '' OR trim(degree_str) = 'N/A' THEN
    RETURN '';
  END IF;
  s := lower(regexp_replace(trim(degree_str), '[.\s-]', '', 'g'));
  IF s IN ('btech', 'bacheloroftechnology', 'be', 'bachelorofengineering') THEN
    RETURN 'B.Tech';
  ELSIF s IN ('mtech', 'masteroftechnology', 'me', 'masterofengineering') THEN
    RETURN 'M.Tech';
  ELSIF s IN ('mca', 'masterofcomputerapplications') THEN
    RETURN 'MCA';
  ELSIF s IN ('bca', 'bachelorofcomputerapplications') THEN
    RETURN 'BCA';
  ELSIF s IN ('bsc', 'bachelorofscience') THEN
    RETURN 'B.Sc';
  ELSIF s IN ('msc', 'masterofscience') THEN
    RETURN 'M.Sc';
  ELSE
    RETURN initcap(trim(degree_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Create city normalization function
CREATE OR REPLACE FUNCTION normalize_city(city_str TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF city_str IS NULL OR trim(city_str) = '' OR trim(city_str) = 'N/A' THEN
    RETURN '';
  END IF;
  s := lower(trim(city_str));
  IF s = 'indore' THEN
    RETURN 'Indore';
  ELSIF s = 'bhopal' THEN
    RETURN 'Bhopal';
  ELSIF s = 'pune' THEN
    RETURN 'Pune';
  ELSIF s IN ('bangalore', 'bengaluru') THEN
    RETURN 'Bengaluru';
  ELSIF s = 'mumbai' THEN
    RETURN 'Mumbai';
  ELSIF s IN ('delhi', 'new delhi') THEN
    RETURN 'Delhi';
  ELSIF s = 'hyderabad' THEN
    RETURN 'Hyderabad';
  ELSIF s = 'chennai' THEN
    RETURN 'Chennai';
  ELSIF s = 'kolkata' THEN
    RETURN 'Kolkata';
  ELSE
    RETURN initcap(trim(city_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create college normalization function
CREATE OR REPLACE FUNCTION normalize_college(college_str TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF college_str IS NULL OR trim(college_str) = '' OR trim(college_str) = 'N/A' THEN
    RETURN '';
  END IF;
  s := lower(regexp_replace(trim(college_str), '[.,\s-]', '', 'g'));
  IF s LIKE '%sgsits%' OR s LIKE '%govindramseksaria%' THEN
    RETURN 'SGSITS';
  ELSIF s LIKE '%ietdavv%' OR (s LIKE '%iet%' AND s LIKE '%davv%') THEN
    RETURN 'IET DAVV';
  ELSIF s LIKE '%ipsacademy%' OR s LIKE '%ipsindore%' THEN
    RETURN 'IPS Academy';
  ELSIF s LIKE '%medicaps%' THEN
    RETURN 'Medi-Caps University';
  ELSIF s LIKE '%acropolis%' THEN
    RETURN 'Acropolis Institute';
  ELSIF s LIKE '%svits%' THEN
    RETURN 'SVITS';
  ELSIF s LIKE '%lnct%' THEN
    RETURN 'LNCT';
  ELSE
    RETURN initcap(trim(college_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger handler function
CREATE OR REPLACE FUNCTION candidates_normalize_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  NEW.degree := normalize_degree(NEW.degree);
  NEW.highest_degree := normalize_degree(NEW.highest_degree);
  NEW.college := normalize_college(NEW.college);
  NEW.city := normalize_city(NEW.city);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind the trigger to candidates table
DROP TRIGGER IF EXISTS trg_normalize_candidates ON candidates;
CREATE TRIGGER trg_normalize_candidates
  BEFORE INSERT OR UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION candidates_normalize_trigger_fn();

-- 6. Apply normalization to existing candidate records in the database
UPDATE candidates SET
  degree = normalize_degree(degree),
  highest_degree = normalize_degree(highest_degree),
  college = normalize_college(college),
  city = normalize_city(city);
