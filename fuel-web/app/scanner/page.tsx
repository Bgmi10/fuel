"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function Page() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const successAudio = useRef<HTMLAudioElement | null>(null);
const errorAudio = useRef<HTMLAudioElement | null>(null);


useEffect(() => {
    successAudio.current = new Audio("./success.mp3");
    errorAudio.current = new Audio("./buzz.mp3");
  
    successAudio.current.preload = "auto";
    errorAudio.current.preload = "auto";
  }, []);

  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "failed"
  >("idle");
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  
  const [message, setMessage] = useState("");
  const [member, setMember] = useState<any>(null);
  const [result, setResult] = useState("");

  const verifyBooking = async (bookingId: string) => {
    try {
      const response = await fetch("/api/slot/scanner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
        }),
      });
  
      const data = await response.json();
  
      if (data.success) {
        setStatus("success");
        setMember(data.member);
        setMessage(data.message);
        successAudio.current?.play().catch(() => {});
      } else {

  errorAudio.current?.play().catch(() => {});
        setStatus("failed");
        setMember(null);
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);

  errorAudio.current?.play().catch(() => {});

  
      setStatus("failed");
      setMember(null);
      setMessage("Unable to reach server.");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        lastScannedRef.current = null;
  
        setStatus("scanning");
        setMessage("");
        setMember(null);
        setResult("");
      }, 3000);
    }
  };


  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner
      .start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 240,
            height: 240,
          },
        },
        async (decodedText) => {
            if (processingRef.current) return;
          
            if (lastScannedRef.current === decodedText) return;
          
            processingRef.current = true;
            lastScannedRef.current = decodedText;
          
            setResult(decodedText);
          
            await verifyBooking(decodedText);
          },
        () => {}
      )
      .then(() => {
        setStatus("scanning");
      });

    return () => {
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
        });
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 flex justify-center">
      <div className="w-full max-w-sm min-h-screen flex flex-col">

        {/* Header */}

        <div className="p-6 justify-center flex border-b border-neutral-800">
        <div className="mb-2">
        <img src="/logo.png" className="w-32" />
      </div>
        </div>

        {/* Scanner */}

        <div className="flex-1 px-5 py-8">

          <div className="relative">

            <div
              id="reader"
              className="rounded-3xl overflow-hidden border border-neutral-700"
            />

            {status === "scanning" && (
              <>
                <div className="absolute inset-0 rounded-3xl border-4 border-lime-400 pointer-events-none animate-pulse" />

                <div className="absolute top-1/2 left-0 w-full h-[3px] bg-lime-400 animate-pulse" />
              </>
            )}
          </div>

          <div className="mt-8 rounded-3xl bg-neutral-900 border border-neutral-800 p-6">
            
            {status === "idle" && (
              <div className="text-center">

                <Camera
                  size={45}
                  className="mx-auto text-lime-400"
                />

                <p className="mt-4 text-white">
                  Opening Camera...
                </p>
              </div>
            )}

            

{status === "success" && (
  <div className="text-center">

    <CheckCircle2
      size={70}
      className="mx-auto text-green-500"
    />

    <h2 className="mt-5 text-2xl font-bold text-green-400">
      Access Granted
    </h2>

    {member && (
      <>
        <p className="mt-4 text-white text-lg font-semibold">
          {member.name}
        </p>

        <p className="text-neutral-400">
          {member.phone}
        </p>
      </>
    )}

    <p className="mt-5 text-green-300">
      {message}
    </p>

  </div>
)}

{status === "failed" && (
  <div className="text-center">

    <XCircle
      size={70}
      className="mx-auto text-red-500"
    />

    <h2 className="mt-5 text-2xl font-bold text-red-400">
      Verification Failed
    </h2>

    <p className="mt-4 text-red-300">
      {message}
    </p>

  </div>
)}
          </div>
        </div>

      </div>
    </main>
  );
}