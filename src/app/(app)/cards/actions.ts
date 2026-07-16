"use server";
import { parseCardsCsv } from "@/lib/csv";
import { persistCards } from "@/lib/persist-cards";
import { saveUploadedCsv } from "@/lib/files";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function uploadCsv(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const text = await file.text();
  const filename = await saveUploadedCsv(file.name || "upload.csv", text);
  const result = parseCardsCsv(text, filename);

  const { imported, matched } = await persistCards(result.cards);
  const skipped = result.stats.total - imported - matched;

  revalidatePath("/cards");
  redirect(
    `/cards?uploaded=${encodeURIComponent(filename)}` +
    `&imported=${imported}&matched=${matched}&skipped=${skipped}`,
  );
}
