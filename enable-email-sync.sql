update users
set email_sync_enabled = true,
    email_sync_lookback_days = 14,
    last_email_sync_error = null
where id = 'default-user-id';
