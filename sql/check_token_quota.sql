-- Function to check if a token has reached its response limit (5)
-- SECURITY DEFINER allows this function to bypass RLS policies
create or replace function check_token_quota(lookup_token_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  response_count integer;
begin
  select count(*)
  into response_count
  from survey_responses
  where token_id = lookup_token_id;
  
  return response_count >= 5;
end;
$$;
