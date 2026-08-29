INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-attachments',
  'event-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_own_attachments" ON storage.objects;
CREATE POLICY "read_own_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "insert_own_attachments" ON storage.objects;
CREATE POLICY "insert_own_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "update_own_attachments" ON storage.objects;
CREATE POLICY "update_own_attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'event-attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "delete_own_attachments" ON storage.objects;
CREATE POLICY "delete_own_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid());