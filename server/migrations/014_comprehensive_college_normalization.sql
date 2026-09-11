-- HireFlow - Migration 014: Comprehensive College Normalization Rules
-- Redefines the normalize_college SQL function with strict matching patterns to preserve distinct institutions and prevent false-positives.

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
  ELSIF s = 'ipsacademy' OR s = 'ipsindore' OR s = 'ipscollege' OR s = 'ipscollegeindore' THEN
    RETURN 'IPS Academy';
    
  -- Medi-Caps
  ELSIF s = 'medicaps' OR s LIKE '%medicapsuniversity%' THEN
    RETURN 'Medi-Caps University';
    
  -- Acropolis & AITR
  ELSIF s LIKE '%acropolis%' OR s = 'aitr' OR s = 'aitrindore' THEN
    RETURN 'Acropolis Institute of Technology and Research (AITR)';
    
  -- SVITS
  ELSIF s = 'svits' OR s LIKE '%svitsindore%' THEN
    RETURN 'SVITS';
    
  -- LNCT Main
  ELSIF s = 'lnct' OR s = 'lakshminaraincollegeoftechnology' OR s = 'lakshminarayancollegeoftechnology' THEN
    RETURN 'LNCT';
  -- LNCT Excellence
  ELSIF s = 'lnctexcellence' OR s LIKE '%lakshminarain%excellence%' THEN
    RETURN 'LNCT Excellence';

  -- Prestige Engineering (PIEMR)
  ELSIF s LIKE '%prestige%engineering%' OR s = 'piemr' OR s = 'prestigeindore' THEN
    RETURN 'Prestige Institute of Engineering Management and Research (PIEMR)';
    
  -- Prestige Management (PIMR)
  ELSIF s LIKE '%prestige%management%' OR s = 'pimr' THEN
    RETURN 'Prestige Institute of Management and Research (PIMR)';
    
  -- Shri Vaishnav (SVVV)
  ELSIF s = 'svvv' OR s = 'shrivaishnavvidyapeethvishwavidyalaya' OR s = 'shreevaishnavvidhyapeethvishwavidyalaya' THEN
    RETURN 'Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV)';
  -- SVIITS
  ELSIF s = 'sviits' OR s = 'sviitsindore' THEN
    RETURN 'Shri Vaishnav Institute of Information Technology (SVIITS)';
    
  -- SKITM
  ELSIF s = 'skitm' OR s LIKE '%shivajiraokadam%' THEN
    RETURN 'Shivajirao Kadam Institute of Technology & Management (SKITM)';
    
  -- SAGE University
  ELSIF s = 'sageuniversity' OR s = 'sageuniversityindore' OR s = 'sageuniversitybhopal' THEN
    RETURN 'SAGE University';
    
  -- RGPV
  ELSIF s = 'rgpv' OR s = 'rajivgandhiproudyogikivishwavidyalaya' OR s = 'rgpvbhopal' THEN
    RETURN 'RGPV';
    
  -- Bansal College
  ELSIF s = 'bansal' OR s = 'sushiladevibansalcollege' OR s = 'sushiladevibansalcollegeofengineering' THEN
    RETURN 'Sushila Devi Bansal College';

  -- Chameli Devi / CDGI
  ELSIF s = 'cdgi' OR s LIKE '%chamelidevi%' THEN
    RETURN 'Chameli Devi Group of Institutions (CDGI)';

  -- Chandigarh University
  ELSIF s = 'chandigarhuniversity' OR s = 'chandigarhuniversitymohalipunjab' THEN
    RETURN 'Chandigarh University';

  -- DAVV University
  ELSIF s = 'davvuniversity' OR s = 'deviahilyavishwavidyalaya' OR s = 'deviahilyavishwavidyalayadavv' THEN
    RETURN 'Devi Ahilya Vishwavidyalaya (DAVV)';

  -- IIST
  ELSIF s = 'iist' OR s LIKE '%indoreinstituteofscience%' THEN
    RETURN 'Indore Institute of Science and Technology (IIST)';

  -- IIPS DAVV
  ELSIF s = 'iips' OR s = 'iipsdavv' OR s LIKE '%internationalinstituteofprofessionalstudies%' THEN
    RETURN 'International Institute of Professional Studies (IIPS DAVV)';

  -- ISTS (Rajahmundry)
  ELSIF s = 'ists' OR s = 'istscollege' OR s = 'istsengineeringcollege' OR s LIKE '%internationalschooloftech%' THEN
    RETURN 'International School of Technology & Sciences for Women (ISTS)';

  -- ITM University Gwalior
  ELSIF s = 'itmuniversitygwalior' OR s = 'itmuniversity' THEN
    RETURN 'ITM University, Gwalior';
  -- ITM University Raipur
  ELSIF s = 'itmuniversityraipur' THEN
    RETURN 'ITM University, Raipur';

  -- LPU
  ELSIF s = 'lpu' OR s = 'lovelyprofessionaluniversity' THEN
    RETURN 'Lovely Professional University (LPU)';

  -- MITS Gwalior
  ELSIF s = 'mits' OR s = 'mitsgwalior' OR s LIKE '%madhavinstitute%' THEN
    RETURN 'Madhav Institute of Technology and Science (MITS)';

  -- Mahakal MIT
  ELSIF s = 'mit' OR s = 'mahakalinstituteoftechnology' THEN
    RETURN 'Mahakal Institute of Technology (MIT)';

  -- Oriental College of Technology
  ELSIF s = 'orientalcollegeoftechnology' THEN
    RETURN 'Oriental College of Technology';
  -- Oriental Institute of Science and Technology
  ELSIF s = 'orientalinstituteofscienceandtechnology' THEN
    RETURN 'Oriental Institute of Science and Technology';

  -- Oriental University
  ELSIF s = 'orientaluniversity' OR s = 'orientaluniversityindore' THEN
    RETURN 'Oriental University';

  -- Parul University
  ELSIF s = 'paruluniversity' OR s = 'parulinstituteoftechnology' THEN
    RETURN 'Parul University';

  -- Sagar Institute SIRT
  ELSIF s = 'sirt' OR s = 'sagarinstituteofresearchandtechnology' THEN
    RETURN 'Sagar Institute of Research and Technology (SIRT)';
  -- Sagar Institute SISTec
  ELSIF s = 'sistec' OR s = 'sagarinstituteofscienceandtechnology' THEN
    RETURN 'Sagar Institute of Science and Technology (SISTec)';

  -- SATI
  ELSIF s = 'sati' OR s = 'samratashoktechnologicalinstitute' THEN
    RETURN 'Samrat Ashok Technological Institute (SATI)';

  -- SCSIT DAVV
  ELSIF s = 'scsit' OR s = 'scsitdavv' OR s LIKE '%schoolofcomputerscience%' THEN
    RETURN 'School of Computer Science & IT (SCSIT DAVV)';

  -- SOE DAVV
  ELSIF s = 'soedavv' OR s = 'schoolofelectronicsdavv' THEN
    RETURN 'School of Electronics (SOE DAVV)';

  -- SAIT
  ELSIF s = 'sait' OR s = 'sriaurobindoinstituteoftechnology' THEN
    RETURN 'Sri Aurobindo Institute of Technology (SAIT)';

  -- SRM Chennai / Main
  ELSIF s = 'srminstituteofscienceandtechnology' THEN
    RETURN 'SRM Institute of Science and Technology';
  -- SRM AP
  ELSIF s = 'srmuniversityandhrapradesh' THEN
    RETURN 'SRM University, Andhra Pradesh';

  -- SVCE
  ELSIF s = 'svce' OR s = 'swamivekanandcollegeofengineering' THEN
    RETURN 'Swami Vivekanand College of Engineering (SVCE)';

  -- TIT
  ELSIF s = 'tit' OR s = 'technocratsinstituteoftechnology' THEN
    RETURN 'Technocrats Institute of Technology (TIT)';

  -- TSSMEC
  ELSIF s = 'tssmec' OR s = 'thakurshivkumarsinghmemorialengineeringcollege' THEN
    RETURN 'Thakur Shivkumar Singh Memorial Engineering College (TSSMEC)';

  ELSE
    RETURN initcap(trim(college_str));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply comprehensive normalization rules to existing data
UPDATE candidates SET
  college = normalize_college(college);
