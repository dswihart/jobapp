-- Target-company pipeline: 35 verified companies added 2026-06-29.
-- greenhouse/lever/ashby boards, each verified live with EU/Spain-remote roles,
-- deduped against the prior 96. Already applied to the production DB; kept here
-- for reproducibility. NOTE: OLX was later paused (its Lever board only resolves
-- on api.eu.lever.co, which the adapter does not call).

INSERT INTO companies (id, name, careers_url, ats_platform, ats_slug, status, spain_presence_evidence, hq_country, size_band, discovery_source, created_at, updated_at)
VALUES
(gen_random_uuid()::text, 'Sysdig', 'https://jobs.lever.co/sysdig', 'lever', 'sysdig', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Tenable', 'https://boards.greenhouse.io/tenableinc', 'greenhouse', 'tenableinc', 'active', 'manual', 'US', 'large', 'automated', now(), now()),
(gen_random_uuid()::text, 'Sonatype', 'https://jobs.lever.co/sonatype', 'lever', 'sonatype', 'active', 'manual', 'US', 'mid', 'automated', now(), now()),
(gen_random_uuid()::text, 'JumpCloud', 'https://jobs.lever.co/jumpcloud', 'lever', 'jumpcloud', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, '1Password', 'https://jobs.ashbyhq.com/1password', 'ashby', '1password', 'active', 'manual', 'CA', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'HackerOne', 'https://jobs.ashbyhq.com/hackerone', 'ashby', 'hackerone', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Kong', 'https://jobs.ashbyhq.com/kong', 'ashby', 'kong', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Recorded Future', 'https://boards.greenhouse.io/recordedfuture', 'greenhouse', 'recordedfuture', 'active', 'manual', 'US', 'enterprise', 'automated', now(), now()),
(gen_random_uuid()::text, 'Sentry', 'https://jobs.ashbyhq.com/sentry', 'ashby', 'sentry', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Aiven', 'https://job-boards.greenhouse.io/aiven36', 'greenhouse', 'aiven36', 'active', 'manual', 'FI', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Pleo', 'https://jobs.ashbyhq.com/pleo', 'ashby', 'pleo', 'active', 'manual', 'DK', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Aircall', 'https://jobs.lever.co/aircall', 'lever', 'aircall', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Infisical', 'https://jobs.ashbyhq.com/infisical', 'ashby', 'infisical', 'active', 'manual', 'US', 'startup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Contentful', 'https://boards.greenhouse.io/contentful', 'greenhouse', 'contentful', 'active', 'manual', 'DE', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Algolia', 'https://job-boards.greenhouse.io/algolia', 'greenhouse', 'algolia', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Sourcegraph', 'https://boards.greenhouse.io/sourcegraph91', 'greenhouse', 'sourcegraph91', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Mistral AI', 'https://jobs.lever.co/mistral', 'lever', 'mistral', 'active', 'manual', 'FR', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Postman', 'https://job-boards.greenhouse.io/postman', 'greenhouse', 'postman', 'active', 'manual', 'US', 'large', 'automated', now(), now()),
(gen_random_uuid()::text, 'SecurityScorecard', 'https://boards.greenhouse.io/securityscorecard', 'greenhouse', 'securityscorecard', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Censys', 'https://job-boards.greenhouse.io/censys', 'greenhouse', 'censys', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Tanium', 'https://boards.greenhouse.io/tanium', 'greenhouse', 'tanium', 'active', 'manual', 'US', 'enterprise', 'automated', now(), now()),
(gen_random_uuid()::text, 'ClickHouse', 'https://job-boards.greenhouse.io/clickhouse', 'greenhouse', 'clickhouse', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Camunda', 'https://jobs.ashbyhq.com/camunda', 'ashby', 'camunda', 'active', 'manual', 'DE', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Temporal', 'https://boards.greenhouse.io/temporaltechnologies', 'greenhouse', 'temporaltechnologies', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Redis', 'https://jobs.ashbyhq.com/redis', 'ashby', 'redis', 'active', 'manual', 'US', 'large', 'automated', now(), now()),
(gen_random_uuid()::text, 'YugabyteDB', 'https://boards.greenhouse.io/yugabyte', 'greenhouse', 'yugabyte', 'active', 'manual', 'US', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'SEON', 'https://jobs.ashbyhq.com/seon', 'ashby', 'seon', 'active', 'manual', 'HU', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'GoCardless', 'https://job-boards.greenhouse.io/gocardless', 'greenhouse', 'gocardless', 'active', 'manual', 'GB', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Bitpanda', 'https://job-boards.eu.greenhouse.io/bitpanda', 'greenhouse', 'bitpanda', 'active', 'manual', 'AT', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Mollie', 'https://jobs.ashbyhq.com/mollie', 'ashby', 'mollie', 'active', 'manual', 'NL', 'large', 'automated', now(), now()),
(gen_random_uuid()::text, 'OLX', 'https://jobs.eu.lever.co/olx', 'lever', 'olx', 'active', 'manual', 'NL', 'enterprise', 'automated', now(), now()),
(gen_random_uuid()::text, 'Ledger', 'https://jobs.ashbyhq.com/ledger', 'ashby', 'ledger', 'active', 'manual', 'FR', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Qonto', 'https://jobs.lever.co/qonto', 'lever', 'qonto', 'active', 'manual', 'FR', 'scaleup', 'automated', now(), now()),
(gen_random_uuid()::text, 'Trade Republic', 'https://job-boards.greenhouse.io/traderepublicbank', 'greenhouse', 'traderepublicbank', 'active', 'manual', 'DE', 'large', 'automated', now(), now()),
(gen_random_uuid()::text, 'Pennylane', 'https://jobs.ashbyhq.com/pennylane', 'ashby', 'pennylane', 'active', 'manual', 'FR', 'scaleup', 'automated', now(), now())
ON CONFLICT DO NOTHING;
