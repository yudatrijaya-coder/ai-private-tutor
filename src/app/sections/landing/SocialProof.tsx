import { Clock, GraduationCap, BookOpen, Mail } from "lucide-react";

const items = [
  { icon: Clock, label: "24/7 AI Tutor" },
  { icon: GraduationCap, label: "SD – SMP – SMA" },
  { icon: BookOpen, label: "Ribuan soal latihan" },
  { icon: Mail, label: "Laporan ortu tiap minggu" },
];

export default function SocialProof() {
  return (
    <section className="border-y border-orange-100 bg-white py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-4 text-sm font-medium text-[#78716c] md:justify-between">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon size={18} className="text-[#f97316]" />
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}
