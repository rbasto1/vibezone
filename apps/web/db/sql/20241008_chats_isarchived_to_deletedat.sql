-- Copy `is_archived` flags into `deleted_at` timestamps
UPDATE chats
SET deleted_at = COALESCE(deleted_at, NOW())
WHERE is_archived AND deleted_at IS NULL;
