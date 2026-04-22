import { Hero } from "@/components/landing/Hero";
import { TrustModel } from "@/components/landing/TrustModel";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { Footer } from "@/components/landing/Footer";

export function Landing() {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <Hero />
      <TrustModel />
      <HowItWorks />
      <FeatureShowcase />
      <Footer />
    </div>
  );
}
