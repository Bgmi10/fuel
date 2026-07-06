import { NextRequest, NextResponse } from "next/server";

function normalize(text: string = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function scoreFood(food: any, query: string) {
  const name = normalize(food.name || "");
  const q = normalize(query);

  const queryWords = q.split(" ").filter(Boolean);
  const foodWords = name.split(" ").filter(Boolean);

  let score = 0;

  // Exact match
  if (name === q) {
    score += 10000;
  }

  // Starts with query
  if (name.startsWith(q)) {
    score += 5000;
  }

  // Contains full query phrase
  if (name.includes(q)) {
    score += 3000;
  }

  let matchedWords = 0;

  for (const word of queryWords) {
    const matched = foodWords.some(
      (foodWord) =>
        foodWord === word ||
        foodWord.includes(word) ||
        word.includes(foodWord)
    );

    if (matched) {
      matchedWords++;
      score += 1000;
    }
  }

  // Bonus when ALL query words exist
  if (
    queryWords.length > 1 &&
    matchedWords === queryWords.length
  ) {
    score += 4000;
  }

  // Penalize missing words
  const missingWords =
    queryWords.length - matchedWords;

  score -= missingWords * 1500;

  // Match ratio bonus
  score +=
    (matchedWords / queryWords.length) * 2000;

  // Prefer shorter names if equally relevant
  score -= name.length * 0.2;

  return score;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query is required" },
        { status: 400 }
      );
    }

    const url = new URL("https://www.myfitnesspal.com/api/nutrition");

    url.searchParams.set("query", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("offset", "15");
    url.searchParams.set("max_items", "25");
    url.searchParams.set("country_code", "IN");
    url.searchParams.set("resource_type", "foods");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        referer:
          "https://www.myfitnesspal.com/food/calorie-chart-nutrition-facts/banana",
        cookie: `anon-device-id=757cc199-f662-4564-a3bf-ed86116dc7f8; last_login_date=2026-06-19; __Host-next-auth.csrf-token=4291b6e5fbd4af6c5293cc9501f06842179e2319fdb839120572a47e26c13855%7C10f20ff1823e1d8aba3ff72be9f580b4b4592bfb0d3121dc96ff070e33c4d718; session_event_session_start_website_97065728060733=true; 4cb59064936f3386b0f99c691380e257=false; p=9A8GUAjGjSc8BmS0eggusye5; app-version=21.8.28; has_seen_premium_interstitial-132241686294205=1; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.myfitnesspal.com%2Fen; remember_me=132241686294205%3Ab4371d0a085a568d6fe8fc3be0118410; known_user=308043830; session_event_session_start_website_132241686294205=true; AMP_MKTG_2746a27a28=JTdCJTIycmVmZXJyZXIlMjIlM0ElMjJodHRwcyUzQSUyRiUyRnNlYXJjaC5icmF2ZS5jb20lMkYlMjIlMkMlMjJyZWZlcnJpbmdfZG9tYWluJTIyJTNBJTIyc2VhcmNoLmJyYXZlLmNvbSUyMiU3RA==; cf_clearance=C1D7yjIK1NqhD870c.eNv6lxdhmH3j2.Nd3Aq7y9OE4-1781848113-1.2.1.1-Jpy_7XzKXOMENVXd.UZaYa90GvzNiigM9yktH4KgCciX4GxGegbjmHcBx3628BX4vOGpZGW6SDQxtX7j_OP2eMXBSDHG50s1GRFMNbYaMlmSoACF53MQQX7L7M.G2.D0LpA2EQ0xmr91svOWqxaFwtDkE2jOBkxEKLltRrLLHJg_zcwiLQkJO3K71qI2v2IGwhWrHlziEs.gbuQ.QUjS5IqVYxFWYuheZzk2MgR_zew.goV8z.e9.R_ySg_X.3NV9HToMNudoWvHqO6G8hRJRcHqaztLMA9hZh4mizmQXUnhDiDpq7PPf2e.jDJof1BQUobadareVcK4WX.ux1POEHMpTNeHubBnrIF92P2GCDrab2vAXt1zVziFrL7TqcdsG5_guabnk8tv2GOvaPUYhIb._1RusUNSAbaaO40g8NiEvtjKlBhoURCRNzmq_sVf; __cf_bm=91V05kzeIviV5dmcZYaoZNBK73RsGxIqPX75mtmWgas-1781848113.7794285-1.0.1.1-D6pzLa6Xdb4F69JsY417k2.hU.VAUq5XTw28vewy3sCD.aLfoaRQR3TlnYqTpGg4Ervkcu5ldJolPgoTFseIlsAzbqxUPaijvLNQ7wVSxxei3cXqZzYnl1x_LqUs3dP_; _mfp_session=Hcvv%2BrQypbWDAnWxaJ6BqzJN4Q0PGzveZIJ9UP2RkEBUeEQeCTCKSBJDFKZb2k22eLBosQvRmLPEvQ35F36R0wrkzeFxwNgSbl07cAkW0NrwYLmqXPYAWjtJy4t6Bx06YKPas9bpP7QE8b%2F3ZkgUrSsPH1fleK0zvZYEv%2BqkaZ8WAdn%2FWW5mxzxvC1BDvN0j%2BKt1%2FTF75oSi0Zz0KO7KHsWeMpeHEkmE%2BtAlZLThEbfFyaAffOd%2FwDWbdKrx4e4%2FFB6ndiLjzCc5XFAONPK9paCV6Fdk1hBXimJFQavIq0MChOAczmZALI1H7Dn%2FgkRXa9hlMYpZHkDNLtE1nkQr1ky3nc5437bmb1soKJCEyTOed8coDklzaQB6%2BapHPskJuHZtjS76l2jcNxEhsWZL9CIoZLATDX0hi6Ds2Pqw8QpWEDgcUH1C%2BglzsSfw%2B8X5fYe5W3EoWSv0giptTZPE6l3ZbEigSi1XdjoJv0ivAOvEE6HiQN03vou8avu9cTk62mSRhEt6aEu2dvQK7qBz5%2FxKQZnZa%2BqTYduKsbciEqeiw0Bj0E0zEaK5qioXUQsXkltrcpeDGx0QZyN%2Fffva0GBV4APqwDYP--P9FjJrHK5QgkCxpI--JKgNfuR5Nvy0LzjsQ8sroA%3D%3D; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..fvuZQgEo6oxhme-O.edsZfnIIM8WoR8OZJmgNHyLogLoUZp9pnZBMlmelCI9sXRKZq2seX0PfGwlNINBwGYE4Pq4gLAfrwPOI5JaaCYxsZGNgeK-Fzk0EQ8-IAOIZ-paqrC-9WB5MuiYgrcwO9rYj7C_CNGkcowweDIoePr4cDyQ1HsRiWYO7ZK61hq4gf7YgUg5NDcXWTesbzbdHPaAEcAa9VtCw1tRfDBFKXEFve3djN-QTvFVkXvWS05hE18QqiVAwsqBbP4ldOmpyJH5kbhba1UIyPVjGm-dozNSI03PGjIAa-pDq6AZOQLZweXwhjT0BI8oE1RxSkdaqgWL35mTgUIu4rOiAy0r4dyzbUIU5r5gSM0CcYfXl_CVqbNt9MmHs7pRHbeb5yP1fL0bVmMMwd-73bFs1QkbVkwfCfWOht9RQP2Lh4KfUfrEUOoQe-oYtQ4opKBPzG0by8pC89pHQzYYuVG5JQpvUVfq1k1Tj_YFgvg3AcBEfNcguRXM6blj9ANsGomX5hGSqalrDGXUAVjCLdo_Hwo8YbrAK4liBNsW5YxXIzi_SwFlmX544ZH1f08UfgyO0RVDdu_KPsFmW5QzARfh24b2BzNo3286OKuyXydFtb65mY4gsfkz4foYQLlxf-Rc3IMw5jL-kd6_BZhE-i-X-KVGApkINju_7baLap9NKo1iBObxQf4TfEu3JRwg-Km6QxCQ_ziVQdhbuMJQ-oa1qF2emJgy6J7Fu79rECG2iFV3Dz2gdNdvwHfb1gyjKW7GEUlSuAQIK5krgTG5Cw2m3HVAIJqcX65vKLvm8kn4Cmj0a6YsS9-1UylJMcH5r6ereW7QuJxzh02Gf-8k4oHcZkBXOCMz_FrXyclUsmzU3tUIabItmcRKHTiLAsg0Ge5X49UX0sg5MOjoKnDNxjThH32LHImonGVfBySNAD0S6k-UWnAfm2mcT2eFouVic768VsSO_oZPnQRCsnirFjVQJURqR2n2wjTV1RHHPDBAJCGnAbaWcFMsgBqmhW6pISrKBGZoWFAupqbI5GLWDpCheickddBKUDOU1aWccnr1n9cCF-d-0EaFs2aTa27Dqo3f_sKQM9m8V4JhdqvnE0yv3WEbpKhIN-PSCtYZOT75sJTdDIwIQIaIsSAEUo1iTCcy4w2xprA5MaLRf7zcRNfzR5wmh14MPQXgECtEItg.XOTufwm2tylZQqiyuhhRpA; _dd_s=aid=693f3bcb-007c-4f11-b523-686f833e3e14&logs=0&expire=1781849045101&rum=0; AMP_2746a27a28=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI3NTdjYzE5OS1mNjYyLTQ1NjQtYTNiZi1lZDg2MTE2ZGM3ZjglMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjIxMzIyNDE2ODYyOTQyMDUlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzgxODQ4MDgzMTY0JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTc4MTg0ODE0NTYyNyUyQyUyMmxhc3RFdmVudElkJTIyJTNBOTMlN0Q=`,
      },
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to search foods",
      },
      { status: 500 }
    );
  }
}