-- HireFlow - Migration 013: Fix SVVV Normalization Rule
-- Redefines the normalize_college SQL function to capture all variations of Vaishnav Vidyapeeth correctly.

CREATE OR REPLACE FUNCTION normalize_college(college_str TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF college_str IS NULL OR trim(college_str) = '' OR trim(college_str) = 'N/A' THEN
    RETURN '';
  END IF;
  s := lower(regexp_replace(trim(college_str), '[.,\s-]', '', 'g'));
  
  -- SGSITS
  IF s LIKE '%sgsits%' OR s LIKE '%govindramseksaria%' THEN
    RETURN 'SGSITS';
  -- IET DAVV
  ELSIF s LIKE '%ietdavv%' OR (s LIKE '%iet%' AND s LIKE '%davv%') THEN
    RETURN 'IET DAVV';
  -- IPS Academy
  ELSIF s LIKE '%ipsacademy%' OR s LIKE '%ipsindore%' THEN
    RETURN 'IPS Academy';
  -- Medi-Caps
  ELSIF s LIKE '%medicaps%' THEN
    RETURN 'Medi-Caps University';
  -- Acropolis
  ELSIF s LIKE '%acropolis%' THEN
    RETURN 'Acropolis Institute';
  -- SVITS
  ELSIF s LIKE '%svits%' THEN
    RETURN 'SVITS';
  -- LNCT
  ELSIF s LIKE '%lnct%' THEN
    RETURN 'LNCT';
    
  -- --- NEW RULES ---
  -- Prestige Engineering (PIEMR)
  ELSIF s LIKE '%prestige%engineering%' OR s LIKE '%piemr%' THEN
    RETURN 'Prestige Institute of Engineering Management and Research (PIEMR)';
  -- Prestige Management (PIMR)
  ELSIF s LIKE '%prestige%management%' OR s LIKE '%pimr%' THEN
    RETURN 'Prestige Institute of Management and Research (PIMR)';
  -- Shri Vaishnav (SVVV)
  ELSIF s LIKE '%vaishnav%' OR s LIKE '%svvv%' THEN
    RETURN 'Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV)';
  -- SKITM
  ELSIF s LIKE '%skitm%' OR s LIKE '%shivajiraokadam%' THEN
    RETURN 'Shivajirao Kadam Institute of Technology & Management (SKITM)';
  -- SAGE University
  ELSIF s LIKE '%sageuniversity%' OR (s LIKE '%sage%' AND s LIKE '%univ%') THEN
    RETURN 'SAGE University';
  -- RGPV
  ELSIF s LIKE '%rgpv%' OR s LIKE '%rajivgandhi%proudyogiki%' OR s LIKE '%rajivgandhiproud%' THEN
    RETURN 'RGPV';
  -- Bansal College
  ELSIF s LIKE '%bansal%' THEN
    RETURN 'Sushila Devi Bansal College';
  ELSE
    RETURN initcap(trim(college_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to existing candidates
UPDATE candidates SET
  college = normalize_college(college);
