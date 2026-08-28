-- Reload PostgREST so order-expedition columns added in 045 are visible to the API.
NOTIFY pgrst, 'reload schema';
