import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export const CreateAccount = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      country: "Nigeria",
      referralCode: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/signup", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully",
        description: "Welcome to Xcrow!",
      });
      setLocation("/seller-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (!agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Use and Privacy Policy",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate(data);
  });

  return (
    <div className="w-full min-h-screen flex bg-white">
      <div className="flex w-full max-w-[1440px] mx-auto items-start gap-6 p-6">
        <div className="relative w-1/2 min-h-[976px] bg-[#493d9e] rounded-lg">
          <div className="absolute top-6 left-6 w-40 h-12">
            <img
              className="absolute top-0 left-0 w-12 h-12"
              alt="Material symbols"
              src="/figmaAssets/material-symbols-shield.svg"
            />

            <div className="absolute top-px left-12 [font-family:'Inter',Helvetica] font-bold text-white text-[38.7px] tracking-[-0.77px] leading-[38.7px] whitespace-nowrap">
              xcrow
            </div>
          </div>

          <img
            className="absolute top-[289px] left-[calc(50.00%_-_186px)] w-[372px] h-[276px]"
            alt="Group"
            src="/figmaAssets/group-2721.png"
          />

          <div className="absolute top-[552px] left-[439px] w-16 h-16 flex items-center justify-center bg-[#edecf8] rounded-[64px] overflow-hidden rotate-[-55.82deg]">
            <div className="mt-[57.3px] h-16 ml-[-0.1px] w-[64.82px] bg-[#493d9e] rotate-[0.15deg]" />
          </div>

          <div className="absolute top-[200px] left-[137px] w-[69px] h-[72px]">
            <div className="absolute top-0 left-0 w-12 h-12 bg-[#edecf8]" />

            <div className="absolute top-6 left-[21px] w-12 h-12 border-[0.5px] border-solid border-[#42a670]" />
          </div>

          <div className="flex flex-col w-[500px] items-center gap-4 absolute top-[666px] left-[calc(50.00%_-_250px)]">
            <div className="relative w-fit mt-[-1.00px] font-poppins-semibold-h5 font-[number:var(--poppins-semibold-h5-font-weight)] text-white text-[length:var(--poppins-semibold-h5-font-size)] tracking-[var(--poppins-semibold-h5-letter-spacing)] leading-[var(--poppins-semibold-h5-line-height)] whitespace-nowrap [font-style:var(--poppins-semibold-h5-font-style)]">
              Secure Your Digital Deals
            </div>

            <div className="relative self-stretch font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-white text-[length:var(--poppins-regular-body-font-size)] text-center tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] [font-style:var(--poppins-regular-body-font-style)]">
              Join Xcrow to experience seamless and secure peer-to-peer
              transactions for cryptocurrencies, NFTs, and more—all protected by
              our trusted escrow system.
            </div>
          </div>

          <img
            className="absolute top-4 left-[640px] w-5 h-[116px]"
            alt="Frame"
            src="/figmaAssets/frame-1000003642.svg"
          />

          <img
            className="absolute top-[880px] left-6 w-[72px] h-[72px]"
            alt="Frame"
            src="/figmaAssets/frame-1000003645.svg"
          />

          <img
            className="absolute top-[299px] left-[529px] w-[94px] h-[94px]"
            alt="Frame"
            src="/figmaAssets/frame.svg"
          />
        </div>

        <div className="flex flex-col w-1/2 items-start justify-center gap-12 px-6 py-10 relative bg-white">
          <header className="inline-flex flex-col items-start gap-2 relative flex-[0_0_auto]">
            <h1 className="relative w-fit mt-[-1.00px] font-poppins-semibold-h5 font-[number:var(--poppins-semibold-h5-font-weight)] text-[#041d0f] text-[length:var(--poppins-semibold-h5-font-size)] text-center tracking-[var(--poppins-semibold-h5-letter-spacing)] leading-[var(--poppins-semibold-h5-line-height)] whitespace-nowrap [font-style:var(--poppins-semibold-h5-font-style)]">
              Create Your Account
            </h1>

            <p className="relative w-fit font-poppins-regular-body-lg font-[number:var(--poppins-regular-body-lg-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-lg-font-size)] text-center tracking-[var(--poppins-regular-body-lg-letter-spacing)] leading-[var(--poppins-regular-body-lg-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-lg-font-style)]">
              Easy, fast &amp; secure
            </p>
          </header>

          <form onSubmit={onSubmit} className="flex flex-col items-start gap-8 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex flex-col items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col items-start gap-1 px-0 py-px relative flex-1 grow">
                  <Label
                    htmlFor="firstName"
                    className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                  >
                    <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                      First Name
                    </span>
                  </Label>

                  <Input
                    id="firstName"
                    data-testid="input-firstName"
                    {...form.register("firstName")}
                    type="text"
                    className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]"
                  />
                </div>

                <div className="flex flex-col items-start gap-1 px-0 py-px relative flex-1 grow">
                  <Label
                    htmlFor="lastName"
                    className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                  >
                    <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                      Last Name
                    </span>
                  </Label>

                  <Input
                    id="lastName"
                    data-testid="input-lastName"
                    {...form.register("lastName")}
                    type="text"
                    className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]"
                  />
                </div>
              </div>

              <div className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="email"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Email Address
                  </span>
                </Label>

                <Input
                  id="email"
                  data-testid="input-email"
                  {...form.register("email")}
                  type="email"
                  className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]"
                />
              </div>

              <div className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="referralCode"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Referral Code (Optional)
                  </span>
                </Label>

                <Input
                  id="referralCode"
                  data-testid="input-referralCode"
                  {...form.register("referralCode")}
                  type="text"
                  className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]"
                />
              </div>

              <div className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="password"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Create Password
                  </span>
                </Label>

                <div className="relative w-full">
                  <Input
                    id="password"
                    data-testid="input-password"
                    {...form.register("password")}
                    type={showPassword ? "text" : "password"}
                    className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="country"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Country
                  </span>
                </Label>

                <Select
                  value={form.watch("country")}
                  onValueChange={(value) => form.setValue("country", value)}
                >
                  <SelectTrigger data-testid="select-country" className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]">
                    <SelectValue>
                      <span className="font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] [font-style:var(--poppins-regular-body-font-style)]">
                        {form.watch("country")}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
                <Checkbox
                  id="terms"
                  data-testid="checkbox-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="w-[18px] h-[18px] bg-white rounded border-[0.5px] border-solid border-[#868b90]"
                />

                <Label
                  htmlFor="terms"
                  className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-sm tracking-[0] leading-[14px] cursor-pointer"
                >
                  <span className="text-[#041d0f] leading-[17.5px]">
                    I agree to the{" "}
                  </span>

                  <span className="text-[#493d9e] leading-[17.5px] underline">
                    Terms of Use
                  </span>

                  <span className="text-[#041d0f] leading-[17.5px]"> and </span>

                  <span className="text-[#493d9e] leading-[17.5px] underline">
                    Privacy Policy
                  </span>
                </Label>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              <Button 
                type="submit" 
                data-testid="button-signup"
                disabled={signupMutation.isPending}
                className="flex items-center justify-center gap-2 p-3 relative self-stretch w-full flex-[0_0_auto] bg-[#493d9e] rounded-lg h-auto hover:bg-[#493d9e]/90"
              >
                <span className="relative w-fit mt-[-1.00px] font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-white text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-font-style)]">
                  {signupMutation.isPending ? "Creating Account..." : "Sign Up"}
                </span>
              </Button>

              <p className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-transparent text-sm tracking-[0] leading-[14px]">
                <span className="text-[#041d0f] leading-[17.5px]">
                  Already have an account?
                </span>

                <span className="text-[#041d0f] leading-[17.5px]">&nbsp;</span>

                <span 
                  onClick={() => setLocation("/login")} 
                  data-testid="link-login"
                  className="text-[#493d9e] leading-[17.5px] cursor-pointer hover:underline"
                >
                  Sign In
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
