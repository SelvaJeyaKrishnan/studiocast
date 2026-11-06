import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <LandingPage />
      </main>
      <Footer />
    </div>
  );
}
