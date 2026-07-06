export const whatsapp = async (phone: string, templateName: string, parameters: Array<{ type: string, text: string }>) => {
    const response = await fetch(
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: `91${phone}`, // clean number
            type: "template",
            template: {
              name: templateName, // 👈 your template name
              language: {
                code: "en",
              },
              components: [
                {
                  type: "body",
                  parameters
                },
              ],
            },
          }),
        }
      );

    const data = await response.json();
    return {
        data, 
        response
    };
}