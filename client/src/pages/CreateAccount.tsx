import { EyeIcon } from "lucide-react";
import React from "react";
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

export const CreateAccount = (): JSX.Element => {
  const formFields: Array<{ id: string; label: string; type: string; placeholder: string; defaultValue?: string }> = [
    { id: "firstName", label: "First Name", type: "text", placeholder: "" },
    { id: "lastName", label: "Last Name", type: "text", placeholder: "" },
  ];

  const fullWidthFields: Array<{ id: string; label: string; type: string; placeholder: string; defaultValue?: string }> = [
    { id: "email", label: "Email Address", type: "email", placeholder: "" },
    {
      id: "referralCode",
      label: "Referral Code",
      type: "text",
      placeholder: "",
      defaultValue: "XCR-25-0956",
    },
    {
      id: "password",
      label: "Create Password",
      type: "password",
      placeholder: "",
    },
  ];

  return (
    <div className="w-[1440px] h-[1024px] flex bg-white">
      <div className="flex mt-6 w-[1392px] h-[976px] ml-6 relative items-start gap-6">
        <div className="relative w-[684px] h-[976px] bg-[#493d9e]">
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

        <div className="flex flex-col w-[684px] items-start justify-center gap-12 px-6 py-10 relative bg-white">
          <header className="inline-flex flex-col items-start gap-2 relative flex-[0_0_auto]">
            <h1 className="relative w-fit mt-[-1.00px] font-poppins-semibold-h5 font-[number:var(--poppins-semibold-h5-font-weight)] text-[#041d0f] text-[length:var(--poppins-semibold-h5-font-size)] text-center tracking-[var(--poppins-semibold-h5-letter-spacing)] leading-[var(--poppins-semibold-h5-line-height)] whitespace-nowrap [font-style:var(--poppins-semibold-h5-font-style)]">
              Create Your Account
            </h1>

            <p className="relative w-fit font-poppins-regular-body-lg font-[number:var(--poppins-regular-body-lg-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-lg-font-size)] text-center tracking-[var(--poppins-regular-body-lg-letter-spacing)] leading-[var(--poppins-regular-body-lg-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-lg-font-style)]">
              Easy, fast &amp; secure
            </p>
          </header>

          <form className="flex flex-col items-start gap-8 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex flex-col items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
                {formFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex flex-col items-start gap-1 px-0 py-px relative flex-1 grow"
                  >
                    <Label
                      htmlFor={field.id}
                      className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                    >
                      <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                        {field.label}
                      </span>
                    </Label>

                    <Input
                      id={field.id}
                      type={field.type}
                      className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]"
                      defaultValue={field.defaultValue}
                    />
                  </div>
                ))}
              </div>

              {fullWidthFields.map((field) => (
                <div
                  key={field.id}
                  className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full"
                >
                  <Label
                    htmlFor={field.id}
                    className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                  >
                    <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                      {field.label}
                    </span>
                  </Label>

                  <div className="relative w-full">
                    <Input
                      id={field.id}
                      type={field.type}
                      className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90] pr-10"
                      defaultValue={field.defaultValue}
                    />
                    {field.type === "password" && (
                      <EyeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
              ))}

              <div className="flex-col h-[82px] items-start gap-1 px-0 py-px flex relative self-stretch w-full">
                <Label
                  htmlFor="country"
                  className="flex h-5 items-center gap-1 px-2 py-0 relative self-stretch w-full"
                >
                  <span className="relative w-fit font-poppins-regular-xs font-[number:var(--poppins-regular-xs-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-xs-font-size)] tracking-[var(--poppins-regular-xs-letter-spacing)] leading-[var(--poppins-regular-xs-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-xs-font-style)]">
                    Country
                  </span>
                </Label>

                <Select defaultValue="nigeria">
                  <SelectTrigger className="h-14 px-3 py-2 bg-white rounded-lg border-[0.5px] border-solid border-[#868b90]">
                    <SelectValue>
                      <span className="font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-[#041d0f] text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] [font-style:var(--poppins-regular-body-font-style)]">
                        Nigeria
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nigeria">Nigeria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
                <Checkbox
                  id="terms"
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
              <Button className="flex items-center justify-center gap-2 p-3 relative self-stretch w-full flex-[0_0_auto] bg-[#493d9e] rounded-lg h-auto hover:bg-[#493d9e]/90">
                <span className="relative w-fit mt-[-1.00px] font-poppins-regular-body font-[number:var(--poppins-regular-body-font-weight)] text-white text-[length:var(--poppins-regular-body-font-size)] tracking-[var(--poppins-regular-body-letter-spacing)] leading-[var(--poppins-regular-body-line-height)] whitespace-nowrap [font-style:var(--poppins-regular-body-font-style)]">
                  Sign Up
                </span>
              </Button>

              <p className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-transparent text-sm tracking-[0] leading-[14px]">
                <span className="text-[#041d0f] leading-[17.5px]">
                  Already have an account?
                </span>

                <span className="text-[#041d0f] leading-[17.5px]">&nbsp;</span>

                <span className="text-[#493d9e] leading-[17.5px] cursor-pointer hover:underline">
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
