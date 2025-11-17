import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShoppingBag, TrendingUp, Users } from "lucide-react";

export const Marketplace = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#493d9e]/10 text-[#493d9e] px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Coming Soon
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            XCROW Marketplace
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover, buy, and sell digital assets with confidence. Our marketplace is coming soon with enhanced features for seamless transactions.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-[#493d9e]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-[#493d9e]" />
              </div>
              <CardTitle className="text-lg">Digital Marketplace</CardTitle>
              <CardDescription>
                Browse and purchase digital assets from verified sellers worldwide
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Smart Pricing</CardTitle>
              <CardDescription>
                Competitive pricing with transparent fees and escrow protection
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Verified Sellers</CardTitle>
              <CardDescription>
                All sellers are verified with ratings and reviews for trust and safety
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Coming Soon Details */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#493d9e]/5 to-purple-50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">What to Expect</CardTitle>
            <CardDescription className="text-lg">
              We're building the ultimate digital marketplace experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-[#493d9e]/10 text-[#493d9e]">For Buyers</Badge>
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#493d9e] rounded-full"></div>
                    Browse categorized digital products
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#493d9e] rounded-full"></div>
                    Secure escrow payments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#493d9e] rounded-full"></div>
                    Instant delivery after payment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#493d9e] rounded-full"></div>
                    Dispute resolution support
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">For Sellers</Badge>
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Easy product listing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Automated payout system
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Seller analytics dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Customer review system
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launch Timeline */}
        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">
            Stay tuned for updates! We'll notify you when the marketplace launches.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            Expected Launch: Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};
