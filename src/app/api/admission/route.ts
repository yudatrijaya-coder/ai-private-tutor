import { NextRequest, NextResponse } from "next/server";
import { handleAdmission, type AdmissionInput } from "@/agents/guardian/admission";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, gradeLevel, characterPreference, interests } = body;

  if (!name || !gradeLevel) {
    return NextResponse.json(
      { error: "Nama dan kelas wajib diisi" },
      { status: 400 },
    );
  }

  if (!["SD_5", "SMP_1", "SMA_2"].includes(gradeLevel)) {
    return NextResponse.json(
      { error: "Kelas tidak valid. Pilih: SD_5, SMP_1, atau SMA_2" },
      { status: 400 },
    );
  }

  const input: AdmissionInput = {
    parentUserId: "admin",            // admin-created, no real parent yet
    name,
    gradeLevel: gradeLevel as "SD_5" | "SMP_1" | "SMA_2",
    characterPreference: characterPreference ?? undefined,
    interests: interests ?? undefined,
  };

  const result = await handleAdmission(input);

  return NextResponse.json(result, { status: 201 });
}
