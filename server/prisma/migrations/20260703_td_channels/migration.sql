INSERT INTO "Channel" ("nom", "description", "type")
VALUES
  ('TDA', 'Canal TD - Promotion A (TA1 & TA2)', 'td'),
  ('TDB', 'Canal TD - Promotion B (TB1 & TB2)', 'td')
ON CONFLICT ("nom") DO NOTHING;
