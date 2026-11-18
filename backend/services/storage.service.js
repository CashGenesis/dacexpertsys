import { createClient } from '@supabase/supabase-js';

// Evidence files live in a PRIVATE Supabase Storage bucket so every backend instance
// (and every developer machine) sees the same files.
// Configure in .env (backend only, never expose to the frontend):
//   SUPABASE_URL               - https://<project-ref>.supabase.co
//   SUPABASE_SECRET_KEY        - secret key "sb_secret_..." (Project Settings -> API Keys).
//                                Bypasses RLS: keep secret. The legacy service_role key also works,
//                                as SUPABASE_SERVICE_ROLE_KEY.
//   SUPABASE_EVIDENCE_BUCKET   - optional, default "evidence"
//
// The database stores a reference "supabase://<bucket>/<object path>" instead of a public URL.
// Viewers get a short-lived signed URL after the backend checks they may see the case.

export const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024; // 2 MB
const SIGNED_URL_TTL_SECONDS = 10 * 60;
const STORAGE_PREFIX = 'supabase://';

let client = null;

function bucketName() {
  return String(process.env.SUPABASE_EVIDENCE_BUCKET || 'evidence').trim();
}

function secretKey() {
  return String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function isStorageConfigured() {
  return Boolean(String(process.env.SUPABASE_URL || '').trim() && secretKey());
}

function getClient() {
  if (!client) {
    client = createClient(String(process.env.SUPABASE_URL).trim(), secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/**
 * Uploads one evidence file. Returns the reference to store in the database.
 * @returns {Promise<string>} e.g. "supabase://evidence/cases/42/1731900000000-ab12cd34.jpg"
 */
export async function uploadEvidenceFile({ caseId, buffer, mimeType, extension, randomId }) {
  if (!isStorageConfigured()) {
    throw new Error('STORAGE_NOT_CONFIGURED');
  }
  const bucket = bucketName();
  const objectPath = `cases/${caseId}/${Date.now()}-${randomId}${extension}`;
  const { error } = await getClient().storage.from(bucket).upload(objectPath, buffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    const err = new Error(error.message || 'Upload to storage failed');
    err.code = 'STORAGE_UPLOAD_FAILED';
    throw err;
  }
  return `${STORAGE_PREFIX}${bucket}/${objectPath}`;
}

/**
 * Turns a stored evidence reference into a URL the browser can open.
 * - supabase://bucket/path -> signed URL valid for 10 minutes
 * - /uploads/...           -> absolute URL on this backend (files uploaded before Supabase Storage)
 * - http(s)://...          -> unchanged
 * @param {string} reference
 * @param {string} backendOrigin e.g. "http://localhost:5001"
 * @returns {Promise<string|null>}
 */
export async function resolveEvidenceUrl(reference, backendOrigin) {
  const value = String(reference || '').trim();
  if (!value) return null;

  if (value.startsWith(STORAGE_PREFIX)) {
    if (!isStorageConfigured()) return null;
    const rest = value.slice(STORAGE_PREFIX.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const { data, error } = await getClient()
      .storage.from(rest.slice(0, slash))
      .createSignedUrl(rest.slice(slash + 1), SIGNED_URL_TTL_SECONDS);
    if (error) {
      console.warn('Could not sign evidence URL:', error.message);
      return null;
    }
    return data?.signedUrl || null;
  }

  if (value.startsWith('/')) return `${backendOrigin}${value}`;
  return value;
}
