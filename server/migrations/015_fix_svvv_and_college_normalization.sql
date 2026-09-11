-- HireFlow - Migration 015: Fix SVVV and Comprehensive Substring College Normalization
-- Redefines normalize_college SQL function to correctly group all 40+ variations of SVVV, SVIITS, and other major colleges.

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
  ELSIF s = 'ietdavv' OR s LIKE '%iet%davv%' OR (s LIKE '%instituteofengineering%' AND s LIKE '%davv%') THEN
    RETURN 'IET DAVV';
    
  -- IPS Academy
  ELSIF s LIKE '%ipsacademy%' OR s LIKE '%ipsindore%' OR s LIKE '%ipscollege%' THEN
    RETURN 'IPS Academy';
    
  -- Medi-Caps
  ELSIF s LIKE '%medicaps%' THEN
    RETURN 'Medi-Caps University';
    
  -- Acropolis & AITR
  ELSIF s LIKE '%acropolis%' OR s LIKE '%aitr%' THEN
    RETURN 'Acropolis Institute of Technology and Research (AITR)';
    
  -- SVIITS (Shri Vaishnav Info Tech)
  ELSIF s LIKE '%sviit%' OR s LIKE '%sviits%' THEN
    RETURN 'Shri Vaishnav Institute of Information Technology (SVIITS)';

  -- SVITS (Shri Vaishnav Inst of Tech)
  ELSIF s = 'svits' OR s LIKE '%svitsindore%' THEN
    RETURN 'Shri Vaishnav Institute of Technology & Science (SVITS)';

  -- Shri Vaishnav (SVVV) - Matches ALL 40+ SVVV variants
  ELSIF s LIKE '%svvv%' 
     OR s LIKE '%vaishnav%' 
     OR s LIKE '%shrivaishnav%' 
     OR s LIKE '%shreevaishnav%' 
     OR s LIKE '%srivaishnav%' THEN
    RETURN 'Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV)';

  -- LNCT Excellence
  ELSIF s LIKE '%lnct%excellence%' OR s LIKE '%lakshminarain%excellence%' THEN
    RETURN 'LNCT Excellence';

  -- LNCT Main
  ELSIF s LIKE '%lnct%' OR s LIKE '%lakshminaraincollegeoftechnology%' OR s LIKE '%lakshminarayancollegeoftechnology%' THEN
    RETURN 'LNCT';

  -- Prestige Engineering (PIEMR)
  ELSIF s LIKE '%piemr%' OR (s LIKE '%prestige%' AND s LIKE '%engineering%') THEN
    RETURN 'Prestige Institute of Engineering Management and Research (PIEMR)';
    
  -- Prestige Management (PIMR)
  ELSIF s LIKE '%pimr%' OR (s LIKE '%prestige%' AND s LIKE '%management%') THEN
    RETURN 'Prestige Institute of Management and Research (PIMR)';
    
  -- SKITM
  ELSIF s LIKE '%skitm%' OR s LIKE '%shivajiraokadam%' THEN
    RETURN 'Shivajirao Kadam Institute of Technology & Management (SKITM)';
    
  -- SAGE University
  ELSIF s LIKE '%sageuniversity%' OR s LIKE '%sage%' THEN
    RETURN 'SAGE University';
    
  -- RGPV
  ELSIF s LIKE '%rgpv%' OR s LIKE '%rajivgandhiproudyogiki%' THEN
    RETURN 'RGPV';
    
  -- Bansal College
  ELSIF s LIKE '%bansal%' OR s LIKE '%sushiladevibansal%' THEN
    RETURN 'Sushila Devi Bansal College';

  -- Chameli Devi / CDGI
  ELSIF s LIKE '%cdgi%' OR s LIKE '%chamelidevi%' THEN
    RETURN 'Chameli Devi Group of Institutions (CDGI)';

  -- Chandigarh University
  ELSIF s LIKE '%chandigarhuniversity%' THEN
    RETURN 'Chandigarh University';

  -- IIPS DAVV
  ELSIF s LIKE '%iips%' OR s LIKE '%internationalinstituteofprofessionalstudies%' THEN
    RETURN 'International Institute of Professional Studies (IIPS DAVV)';

  -- SCSIT DAVV
  ELSIF s LIKE '%scsit%' OR s LIKE '%schoolofcomputerscience%' THEN
    RETURN 'School of Computer Science & IT (SCSIT DAVV)';

  -- SOE DAVV
  ELSIF s LIKE '%soe%davv%' OR s LIKE '%schoolofelectronicsdavv%' THEN
    RETURN 'School of Electronics (SOE DAVV)';

  -- DAVV University (General)
  ELSIF s LIKE '%davv%' OR s LIKE '%deviahilya%' THEN
    RETURN 'Devi Ahilya Vishwavidyalaya (DAVV)';

  -- IIST
  ELSIF s LIKE '%iist%' OR s LIKE '%indoreinstituteofscience%' THEN
    RETURN 'Indore Institute of Science and Technology (IIST)';

  -- ISTS (Rajahmundry)
  ELSIF s LIKE '%ists%' OR s LIKE '%internationalschooloftech%' THEN
    RETURN 'International School of Technology & Sciences for Women (ISTS)';

  -- ITM University Gwalior
  ELSIF s LIKE '%itm%gwalior%' THEN
    RETURN 'ITM University, Gwalior';
  -- ITM University Raipur
  ELSIF s LIKE '%itm%raipur%' THEN
    RETURN 'ITM University, Raipur';
  -- ITM University (General)
  ELSIF s LIKE '%itm%' THEN
    RETURN 'ITM University';

  -- LPU
  ELSIF s LIKE '%lpu%' OR s LIKE '%lovelyprofessional%' THEN
    RETURN 'Lovely Professional University (LPU)';

  -- MITS Gwalior
  ELSIF s LIKE '%mits%' OR s LIKE '%madhavinstitute%' THEN
    RETURN 'Madhav Institute of Technology and Science (MITS)';

  -- Mahakal MIT
  ELSIF s LIKE '%mahakal%' THEN
    RETURN 'Mahakal Institute of Technology (MIT)';

  -- Oriental College of Technology
  ELSIF s LIKE '%oriental%technology%' THEN
    RETURN 'Oriental College of Technology';
  -- Oriental Institute of Science and Technology
  ELSIF s LIKE '%oriental%science%' THEN
    RETURN 'Oriental Institute of Science and Technology';
  -- Oriental University
  ELSIF s LIKE '%oriental%' THEN
    RETURN 'Oriental University';

  -- Parul University
  ELSIF s LIKE '%parul%' THEN
    RETURN 'Parul University';

  -- Sagar Institute SIRT
  ELSIF s LIKE '%sirt%' THEN
    RETURN 'Sagar Institute of Research and Technology (SIRT)';
  -- Sagar Institute SISTec
  ELSIF s LIKE '%sistec%' THEN
    RETURN 'Sagar Institute of Science and Technology (SISTec)';

  -- SATI
  ELSIF s LIKE '%sati%' OR s LIKE '%samratashok%' THEN
    RETURN 'Samrat Ashok Technological Institute (SATI)';

  -- SAIT
  ELSIF s LIKE '%sait%' OR s LIKE '%sriaurobindo%' THEN
    RETURN 'Sri Aurobindo Institute of Technology (SAIT)';

  -- SRM Chennai / Main
  ELSIF s LIKE '%srm%science%' THEN
    RETURN 'SRM Institute of Science and Technology';
  -- SRM AP
  ELSIF s LIKE '%srm%andhra%' OR s LIKE '%srm%ap%' THEN
    RETURN 'SRM University, Andhra Pradesh';
  -- SRM (General)
  ELSIF s LIKE '%srm%' THEN
    RETURN 'SRM University';

  -- SVCE
  ELSIF s LIKE '%svce%' OR s LIKE '%swamivekanand%' THEN
    RETURN 'Swami Vivekanand College of Engineering (SVCE)';

  -- TIT
  ELSIF s LIKE '%technocrats%' THEN
    RETURN 'Technocrats Institute of Technology (TIT)';

  -- TSSMEC
  ELSIF s LIKE '%tssmec%' OR s LIKE '%thakurshivkumar%' THEN
    RETURN 'Thakur Shivkumar Singh Memorial Engineering College (TSSMEC)';

  ELSE
    RETURN initcap(trim(college_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply normalization to all existing candidates in the database
UPDATE candidates 
SET college = normalize_college(college) 
WHERE college IS NOT NULL AND TRIM(college) <> '';
