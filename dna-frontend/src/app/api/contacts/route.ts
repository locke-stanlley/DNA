import { NextRequest } from "next/server";
import { getAddressBook, saveAddressBook } from "@/lib/storage";
import { fail, ok, readBody } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return ok({ addresses: getAddressBook() });
}

export async function POST(req: NextRequest) {
  const body = await readBody<{ address?: string; label?: string }>(req);
  const address = body.address?.trim() || "";
  const label = body.label?.trim() || address.slice(0, 8);
  if (!address) return fail("address required");

  const book = getAddressBook();
  if (book.some((e) => e.address === address)) return fail("address already in book");
  book.push({ address, label, addedAt: new Date().toISOString() });
  saveAddressBook(book);
  return ok({ addresses: book });
}

export async function DELETE(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!address) return fail("address required");
  const book = getAddressBook().filter((e) => e.address !== address);
  saveAddressBook(book);
  return ok({ addresses: book });
}
