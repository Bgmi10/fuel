"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export const Login = () => {
  const [step, setStep] = useState<"IDENTIFIER" | "OTP">("IDENTIFIER");

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRef = useRef<HTMLInputElement>(null);

  // 🔥 detect phone
  const isPhone = useMemo(() => {
    return /^[0-9]+$/.test(identifier);
  }, [identifier]);

  // 🔥 formatted phone
  const formattedPhone = useMemo(() => {
    if (!isPhone) return "";

    const cleaned = identifier.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    return "";
  }, [identifier, isPhone]);

  // 🔥 WEB OTP API
  useEffect(() => {
    if (step !== "OTP") return;

    if ("OTPCredential" in window) {
      const ac = new AbortController();

      navigator.credentials
        .get({
          otp: {
            transport: ["sms"],
          },
          signal: ac.signal,
        } as any)
        .then((otp: any) => {
          if (otp?.code) {
            setOtp(otp.code);
          }
        })
        .catch(console.log);

      return () => ac.abort();
    }
  }, [step]);

  // 🔥 validate
  const validate = () => {
    if (!identifier.trim()) {
      return "Email or mobile number is required";
    }

    // 🔥 PHONE
    if (isPhone) {
      const cleaned = identifier.replace(/\D/g, "");

      if (cleaned.length !== 10) {
        return "Mobile number must be 10 digits";
      }

      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return "Enter valid Indian mobile number";
      }

      return "";
    }

    // 🔥 EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(identifier)) {
      return "Enter valid email address";
    }

    return "";
  };

  // 🔥 SEND OTP
  const handleContinue = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        type: isPhone ? "PHONE" : "EMAIL",
        value: isPhone
          ? formattedPhone
          : identifier.toLowerCase(),
      };

      const response = await fetch("/api/member/send-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      setStep("OTP");

      setTimeout(() => {
        otpRef.current?.focus();
      }, 150);

    } catch (e) {
      console.log(e);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 VERIFY OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter valid OTP");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/member/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          otp,
          email: !isPhone
            ? identifier.toLowerCase()
            : undefined,
          phone: isPhone
            ? identifier
            : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }
      if (data.profileFilled) {
        window.location.href = "/member/dashboard";
      } else {
        window.location.href = "/member/complete-profile";
      }
    } catch (e) {
      console.log(e);
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 overflow-hidden">

      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div
          className="
            absolute top-[-120px] left-[-120px]
            w-[300px] h-[300px]
            bg-lime-400/10
            blur-[120px]
            rounded-full
            animate-pulse
          "
        />

        <div
          className="
            absolute bottom-[-120px] right-[-120px]
            w-[300px] h-[300px]
            bg-lime-400/10
            blur-[120px]
            rounded-full
            animate-pulse
          "
        />
      </div>

      {/* CARD */}
      <div
        className="
          relative
          w-full max-w-md
          bg-neutral-950/95
          backdrop-blur-xl
          border border-neutral-900
          rounded-3xl
          p-8
          shadow-[0_0_50px_rgba(0,0,0,0.6)]
          transition-all duration-500
        "
      >

        {/* LOGO */}
        <div className="flex justify-start mb-8">
          <img
            src="/logo.png"
            className="
              w-20
              transition-all duration-500
              hover:scale-105
            "
          />
        </div>

        {/* STEP 1 */}
        {step === "IDENTIFIER" && (
          <div
            className="
              animate-in fade-in slide-in-from-bottom-5
              duration-500
            "
          >

            {/* HEADER */}
            <div className="text-center mb-8">

              <h1
                className="
                  text-3xl font-bold text-white tracking-tight
                "
              >
                Welcome Back
              </h1>

              <p
                className="
                  text-neutral-500 text-sm mt-2 leading-relaxed
                "
              >
                Login with your email address or mobile number
              </p>
            </div>

            {/* INPUT */}
            <div className="space-y-2">

              <label className="text-sm text-neutral-400">
                Email or Mobile Number
              </label>

              <div className="relative">

                {/* +91 */}
                {isPhone && identifier.length > 0 && (
                  <div
                    className="
                      absolute left-4 top-1/2 -translate-y-1/2
                      text-neutral-400 text-sm
                      transition-all duration-300
                      animate-in fade-in slide-in-from-left-2
                    "
                  >
                    +91
                  </div>
                )}

                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    const value = e.target.value;

                    // 🔥 PHONE
                    if (/^[0-9]+$/.test(value)) {
                      const cleaned = value
                        .replace(/\D/g, "")
                        .slice(0, 10);

                      setIdentifier(cleaned);
                      setError("");
                      return;
                    }

                    // 🔥 EMAIL
                    setIdentifier(value.trim());
                    setError("");
                  }}
                  placeholder="Enter email or mobile number"
                  className={`
                    w-full h-14 rounded-2xl
                    bg-neutral-900/80
                    border
                    ${
                      error
                        ? "border-red-500"
                        : "border-neutral-800 focus:border-lime-400"
                    }
                    outline-none
                    text-white
                    px-4
                    ${
                      isPhone && identifier.length > 0
                        ? "pl-[60px]"
                        : ""
                    }
                    transition-all duration-300
                    focus:shadow-[0_0_30px_rgba(163,230,53,0.08)]
                    focus:bg-neutral-900
                  `}
                />
              </div>

              {/* HELPER */}
              {isPhone && identifier.length > 0 && (
                <p
                  className="
                    text-xs text-neutral-500 mt-1
                    animate-in fade-in slide-in-from-bottom-1
                    duration-300
                  "
                >
                  OTP will be sent to {formattedPhone}
                </p>
              )}

              {/* ERROR */}
              {error && (
                <p
                  className="
                    text-red-400 text-sm mt-1
                    animate-in fade-in slide-in-from-bottom-1
                  "
                >
                  {error}
                </p>
              )}
            </div>

            {/* BUTTON */}
            <button
              onClick={handleContinue}
              disabled={loading}
              className="
                relative
                w-full h-14 rounded-2xl
                bg-lime-400
                text-black
                font-semibold
                mt-7
                overflow-hidden
                transition-all duration-300
                hover:scale-[1.01]
                hover:shadow-[0_0_30px_rgba(163,230,53,0.25)]
                active:scale-[0.99]
                disabled:opacity-50
              "
            >
              {loading ? "Please wait..." : "Continue"}
            </button>
          </div>
        )}

        {/* STEP 2 OTP */}
        {step === "OTP" && (
          <div
            className="
              animate-in fade-in slide-in-from-right-5
              duration-500
            "
          >

            {/* HEADER */}
            <div className="text-center mb-8">

              <button
                onClick={() => {
                  setStep("IDENTIFIER");
                  setOtp("");
                  setError("");
                }}
                className="
                  absolute left-6 top-6
                  text-neutral-500 hover:text-white
                  transition-all
                "
              >
                ←
              </button>

              <h1 className="text-3xl font-bold text-white">
                Verify OTP
              </h1>

              <p className="text-neutral-500 text-sm mt-2">
                Enter the 6 digit OTP sent to your
                phone and email
              </p>
            </div>

            {/* OTP INPUT */}
            <div className="space-y-3">

              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  );

                  setError("");
                }}
                className="
                  w-full h-16
                  text-center
                  tracking-[14px]
                  text-3xl
                  rounded-2xl
                  bg-neutral-900/80
                  border border-neutral-800
                  text-white
                  outline-none
                  transition-all duration-300
                  focus:border-lime-400
                  focus:shadow-[0_0_30px_rgba(163,230,53,0.08)]
                "
                placeholder="000000"
              />

              <div className="flex justify-between items-center">

                <p className="text-xs text-neutral-500">
                  Didn’t receive OTP?
                </p>

                <button
                  className="
                    text-lime-400 text-sm
                    hover:text-lime-300
                    transition-all
                  "
                >
                  Resend
                </button>
              </div>

              {/* ERROR */}
              {error && (
                <p
                  className="
                    text-red-400 text-sm
                    animate-in fade-in slide-in-from-bottom-1
                  "
                >
                  {error}
                </p>
              )}
            </div>

            {/* VERIFY BUTTON */}
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="
                relative
                w-full h-14 rounded-2xl
                bg-lime-400
                text-black
                font-semibold
                mt-7
                overflow-hidden
                transition-all duration-300
                hover:scale-[1.01]
                hover:shadow-[0_0_30px_rgba(163,230,53,0.25)]
                active:scale-[0.99]
                disabled:opacity-50
              "
            >
              {loading
                ? "Verifying..."
                : "Verify OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};