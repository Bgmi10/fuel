export const sendEmail = async ({
    to,
    name,
    templateId,
    params = {},
  }: {
    to: string;
    name?: string;
    templateId: number;
    params?: Record<string, any>;
  }) => {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
  "api-key": process.env.BREVO_API_KEY!,

        },
        body: JSON.stringify({
            sender: {
                email: process.env.BREVO_SENDER_EMAIL, // ✅ from env
              },
          to: [
            {
              email: to,
              name: name || "",
            },
          ],
          templateId,
          params, // 👈 dynamic template params
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        console.error("❌ Brevo error:", data);
        throw new Error("Email failed");
      }
  
      return data;
    } catch (err) {
      console.error("🔥 Email service error:", err);
      throw err;
    }
  };
