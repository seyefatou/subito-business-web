import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSolution from "@/components/landing/ProblemSolution";
import KeyModules from "@/components/landing/KeyModules";
import HowItWorks from "@/components/landing/HowItWorks";
import CredibilitySection from "@/components/landing/CredibilitySection";
import AccountRequestForm from "@/components/landing/AccountRequestForm";
import LoginSection from "@/components/landing/LoginSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <ProblemSolution />
      <div id="modules">
        <KeyModules />
      </div>
      <div id="process">
        <HowItWorks />
      </div>
      <CredibilitySection />
      <AccountRequestForm />
      <LoginSection />
      <Footer />
    </>
  );
}
