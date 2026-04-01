select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('projects', 'sourcing_results', 'matches', 'portfolio_items')
order by tablename;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('projects', 'sourcing_results', 'matches', 'portfolio_items')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('projects', 'sourcing_results', 'matches', 'portfolio_items')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
