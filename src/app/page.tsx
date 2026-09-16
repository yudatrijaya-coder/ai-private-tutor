import Navbar from "./sections/landing/Navbar";
import Hero from "./sections/landing/Hero";
import SocialProof from "./sections/landing/SocialProof";
import Features from "./sections/landing/Features";
import HowItWorks from "./sections/landing/HowItWorks";
import Curriculum from "./sections/landing/Curriculum";
import ParentPreview from "./sections/landing/ParentPreview";
import Testimonials from "./sections/landing/Testimonials";
import FAQ from "./sections/landing/FAQ";
import CTABanner from "./sections/landing/CTABanner";
import Footer from "./sections/landing/Footer";

export const metadata = {
  title: "Senang Belajar — AI Tutor untuk SD, SMP, SMA",
  description:
    "Belajar jadi senang dengan AI Tutor pribadi. Kuis interaktif, video penjelasan, peta materi, dan laporan mingguan untuk orang tua.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFF7ED]">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Curriculum />
      <ParentPreview />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}
