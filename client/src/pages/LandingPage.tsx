import { Lock, ShieldCheck, Zap, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
    <div className="p-3 mb-4 rounded-full bg-[#edecf8]">
      <Icon className="w-6 h-6 text-[#493d9e]" />
    </div>
    <h3 className="text-xl font-semibold text-[#041d0f] mb-2 text-center">{title}</h3>
    <p className="text-gray-600 text-center">{description}</p>
  </div>
);

const Step = ({ step, title, description }: { step: number; title: string; description: string }) => (
  <div className="flex flex-col items-start p-6 bg-white rounded-lg shadow-sm border-t-4 border-[#493d9e]">
    <div className="flex items-center justify-center w-10 h-10 mb-4 text-xl font-bold text-white bg-[#493d9e] rounded-full">
      {step}
    </div>
    <h3 className="text-xl font-semibold text-[#041d0f] mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export const LandingPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    // Check for payment reference in URL params
    const urlParams = new URLSearchParams(search);
    const paymentReference = urlParams.get('payment_reference');

    if (paymentReference) {
      // Redirect to payment success page
      setLocation(`/payment-success/${paymentReference}`);
    }
  }, [search, setLocation]);

  const handleTransactionSearch = () => {
    if (transactionId.trim()) {
      // Check if it's a full URL or just an ID
      const trimmedId = transactionId.trim();
      if (trimmedId.includes('/transaction/')) {
        // Extract the ID from the URL
        const id = trimmedId.split('/transaction/')[1];
        setLocation(`/transaction/${id}`);
      } else {
        // Assume it's just the ID
        setLocation(`/transaction/${trimmedId}`);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTransactionSearch();
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-2">
            <img
              className="w-8 h-8 md:w-10 md:h-10"
              alt="Material symbols"
              src="/figmaAssets/material-symbols-shield.svg"
            />
            <div className="font-bold text-2xl md:text-3xl text-[#493d9e]">
              xcrow
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              className="text-[#041d0f] hover:text-[#493d9e]"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-[#493d9e] hover:bg-[#493d9e]/90 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-[1440px] mx-auto">

        {/* Transaction Search Section */}
        <section className="py-12 px-4 bg-[#493d9e]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Have a Transaction Link?
            </h2>
            <p className="text-lg text-gray-200 mb-8">
              Enter your transaction ID or link to proceed with payment
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="text"
                placeholder="Enter transaction ID or link..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 text-lg bg-white border-0 focus:ring-2 focus:ring-white/50"
              />
              <Button
                onClick={handleTransactionSearch}
                disabled={!transactionId.trim()}
                className="h-12 px-6 bg-white text-[#493d9e] hover:bg-gray-100 font-semibold"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Transaction
              </Button>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 bg-white flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl md:max-w-2xl text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#041d0f] leading-tight mb-4">
              The <span className="text-[#493d9e]">Secure</span> Way to Buy and Sell Digital Assets
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8">
              Xcrow protects both <b>buyers</b> and <b>sellers</b> in peer-to-peer transactions for Bitcoin, NFTs, and more. Trust, transparency, and safety guaranteed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button
                onClick={() => setLocation("/create-transaction")}
                className="h-14 px-8 text-lg bg-[#493d9e] hover:bg-[#493d9e]/90 text-white shadow-lg shadow-[#493d9e]/50"
              >
                Start a Transaction <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => setLocation("/register")}
                variant="outline"
                className="h-14 px-8 text-lg border-2 border-[#493d9e] text-[#493d9e] hover:bg-[#edecf8]"
              >
                Create Account
              </Button>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
             <div className="relative w-full max-w-md aspect-[4/3] bg-[#493d9e] rounded-xl flex items-center justify-center p-8 hidden md:block">
              <img
                className="w-full h-full object-contain absolute top-0 left-0 opacity-80"
                alt="Escrow illustration"
                src="/figmaAssets/group-2721.png"
              />
              <Lock className="w-16 h-16 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-100"/>
              <div className="absolute bottom-4 right-4 text-white font-medium">Secured by Xcrow</div>
             </div>
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* Features Section */}
        <section className="py-16 md:py-20 px-4 bg-gray-50">
          <h2 className="text-3xl md:text-4xl font-bold text-[#041d0f] text-center mb-12">
            Why Choose Xcrow?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={ShieldCheck}
              title="Buyer & Seller Protection"
              description="Funds are held safely until both parties confirm satisfaction, eliminating counterparty risk."
            />
            <FeatureCard
              icon={Lock}
              title="Ironclad Security"
              description="Leveraging secure payment gateways and data encryption to keep your assets and information safe."
            />
            <FeatureCard
              icon={Zap}
              title="Fast & Transparent"
              description="Clear transaction status updates and quick fund releases mean less waiting and more clarity."
            />
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* How It Works Section */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <h2 className="text-3xl md:text-4xl font-bold text-[#041d0f] text-center mb-12">
            How Our Escrow Works in 3 Simple Steps
          </h2>
          <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto md:grid-cols-3">
            <Step
              step={1}
              title="Seller Initiates Transaction"
              description="The seller signs up, creates a transaction detailing the asset and price, and sends the unique payment link to the buyer."
            />
            <Step
              step={2}
              title="Buyer Pays - Funds are Secured"
              description="The buyer pays the total amount (price + 5% fee). The funds are securely held in Xcrow's dedicated account."
            />
            <Step
              step={3}
              title="Asset Sent & Funds Released"
              description="Seller sends the asset (e.g., Bitcoin). Buyer confirms receipt and clicks 'Release Funds'. Money is instantly sent to the seller."
            />
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* Final CTA Section */}
        <section className="py-16 md:py-20 px-4 bg-[#493d9e]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Trade Without Worry?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join thousands of users securing their digital transactions with Xcrow.
            </p>
            <Button
              onClick={() => setLocation("/register")}
              className="h-14 px-10 text-xl bg-white text-[#493d9e] font-bold hover:bg-gray-100 shadow-xl"
            >
              Create Your Free Account Now
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#041d0f]">
        <div className="max-w-[1440px] mx-auto text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Xcrow. All rights reserved. |{" "}
          <span
            onClick={() => setLocation("/terms")}
            className="cursor-pointer hover:text-[#493d9e]"
          >
            Terms of Use
          </span>{" "}
          |{" "}
          <span
            onClick={() => setLocation("/privacy")}
            className="cursor-pointer hover:text-[#493d9e]"
          >
            Privacy Policy
          </span>
        </div>
      </footer>
    </div>
  );
};
