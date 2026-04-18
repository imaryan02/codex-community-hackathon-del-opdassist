import { normalizePhone } from "../lib/phone";
import { getSupabaseClient } from "../lib/supabase";
import type { DocumentType, PatientDocument } from "../types/document";

const DOCUMENT_BUCKET = "patient-documents";

type PatientDocumentRow = {
  id: string;
  patient_id: string | null;
  account_mobile: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  document_type: string | null;
  title: string;
  uploaded_at: string;
};

type PatientDocumentLookup = {
  patientId: string;
  accountMobile?: string | null;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function attachSignedUrls(
  rows: PatientDocumentRow[],
): Promise<PatientDocument[]> {
  const supabase = getSupabaseClient();

  return Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(row.file_path, 60 * 60);

      return {
        ...row,
        signed_url: data?.signedUrl ?? null,
      };
    }),
  );
}

export async function getPatientDocuments({
  patientId,
  accountMobile,
}: PatientDocumentLookup): Promise<PatientDocument[]> {
  const supabase = getSupabaseClient();
  const normalizedMobile = normalizePhone(accountMobile);
  const filters = [`patient_id.eq.${patientId}`];

  if (normalizedMobile) {
    filters.push(`account_mobile.eq.${normalizedMobile}`);
  }

  const { data, error } = await supabase
    .from("patient_documents")
    .select(
      "id,patient_id,account_mobile,file_name,file_path,file_type,document_type,title,uploaded_at",
    )
    .or(filters.join(","))
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load medical documents: ${error.message}`);
  }

  return attachSignedUrls((data ?? []) as PatientDocumentRow[]);
}

export async function uploadPatientDocument(input: {
  patientId: string;
  accountMobile: string | null;
  file: File;
  title: string;
  documentType: DocumentType;
}) {
  const supabase = getSupabaseClient();
  const normalizedMobile = normalizePhone(input.accountMobile);
  const folder = normalizedMobile || input.patientId;
  const safeName = sanitizeFileName(input.file.name);
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, input.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Could not upload document: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("patient_documents")
    .insert({
      patient_id: input.patientId,
      account_mobile: normalizedMobile || null,
      file_name: input.file.name,
      file_path: filePath,
      file_type: input.file.type || null,
      document_type: input.documentType,
      title: input.title.trim() || input.file.name,
    });

  if (insertError) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
    throw new Error(`Could not save document record: ${insertError.message}`);
  }
}

export async function renamePatientDocument(documentId: string, title: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("patient_documents")
    .update({ title: title.trim() })
    .eq("id", documentId);

  if (error) {
    throw new Error(`Could not rename document: ${error.message}`);
  }
}

export async function deletePatientDocument(document: PatientDocument) {
  const supabase = getSupabaseClient();

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    throw new Error(`Could not delete file: ${storageError.message}`);
  }

  const { error: dbError } = await supabase
    .from("patient_documents")
    .delete()
    .eq("id", document.id);

  if (dbError) {
    throw new Error(`Could not delete document record: ${dbError.message}`);
  }
}
