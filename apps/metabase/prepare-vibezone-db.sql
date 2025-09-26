-- Run this on the database that will be queried by Metabase
GRANT USAGE ON SCHEMA public TO mb;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mb;
