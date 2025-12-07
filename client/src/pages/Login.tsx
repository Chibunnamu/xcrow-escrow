import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Redirect to dashboard for all users
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      let errorMessage = "Login failed. Please try again.";

      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    loginMutation.mutate(data);
  });

  return (
    <div className="w-full min-h-screen flex bg-white">
      <div className="flex w-full max-w-[1440px] mx-auto items-start gap-6 p-6">
        {/* Illustration Panel - Hidden on Mobile */}
        <div className="relative w-1/2 min-h-[976px] bg-[#493d9e] rounded-lg hidden md:block">
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

        {/* Form Container - Full Width on Mobile */}
        <div className="flex flex-col w-full md:w-1/2 items-start justify-center gap-8 px-4 md:px-6 py-10 relative bg-white">
          {/* Mobile Logo - Only visible on mobile */}
          <div className="flex items-center gap-2 md:hidden mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#493d9e] flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <span className="text-2xl font-bold text-[#041d0f]">xcrow</span>
          </div>

          <header className="inline-flex flex-col items-start gap-2 relative flex-[0_0_auto]">
            <h1 className="relative w-fit mt-[-1.00px] font-poppins-semibold-h5 font-[number:var(--poppins-semibold-h5-font-weight)] text-[#041d0f] text-[length:var(--poppins-semibold-h5-font-size)] text-center tracking-[var(--poppins-semibold-h5-letter-spacing)] leading-[var(--poppins-semibold-h5-line-height)] whitespace-nowrap [font-style:var(--poppins-semibold-h5-font-style)]">
              Sign In
            </h1>

            <p className="relative w-fit font-poppins-regular-body-lg font-[number:var(--poppins-regular-body-lg-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-lg-font-size)] text-center tracking-[var(--poppins-regular-body-lg-letter-spacing)] leading-[var(--poppins-regular-body-lg-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-lg-font-style)]">
              Welcome back to Xcrow
            </p>
          </header>

          <form onSubmit={onSubmit} className="flex flex-col items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex-col items-start gap-1 px-0 py-px flex relative self-stretch w-full">
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

              <div className="flex-col items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="password"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Password
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
            </div>

            <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              <Button
                type="submit"
                data-testid="button-login"
                disabled={loginMutation.isPending}
                className="flex items-center justify-center gap-2 p-3 relative self-stretch w-full flex-[0_0_auto] bg-[#493d9e] rounded-lg h-auto hover:bg-[#493d9e]/90"
              >
                <span className="relative w-fit mt-[-1.00px] font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-white text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-font-style)]">
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </span>
              </Button>

              <div className="relative self-stretch w-full flex items-center gap-4">
                <div className="flex-1 h-[0.5px] bg-[#868b90]" />
                <span className="font-poppins-regular-xs text-[#868b90]">OR</span>
                <div className="flex-1 h-[0.5px] bg-[#868b90]" />
              </div>

              <Button
                type="button"
                onClick={() => window.location.href = "/api/auth/login"}
                data-testid="button-google-login"
                className="flex items-center justify-center gap-2 p-3 relative self-stretch w-full flex-[0_0_auto] bg-white rounded-lg h-auto border border-[#868b90] hover:bg-gray-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                <span className="relative w-fit mt-[-1.00px] font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-font-style)]">
                  Continue with Google
                </span>
              </Button>

              <p className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-transparent text-sm tracking-[0] leading-[14px]">
                <span className="text-[#041d0f] leading-[17.5px]">
                  Don't have an account?
                </span>

                <span className="text-[#041d0f] leading-[17.5px]">&nbsp;</span>

                <span
                  onClick={() => setLocation("/")}
                  data-testid="link-signup"
                  className="text-[#493d9e] leading-[17.5px] cursor-pointer hover:underline"
                >
                  Sign Up
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
