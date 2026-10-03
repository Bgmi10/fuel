import { NextRequest, NextResponse } from "next/server";



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
        cookie: `AMP_MKTG_2746a27a28=JTdCJTdE; anon-device-id=a53e319a-45d6-4403-a993-74bb373316eb; __Host-next-auth.csrf-token=b62ca631e95fef42f4274e6e9e91b90a04f0cf825b68f4d85634961b64eef555%7C54f50b57eb41189c919aaf6cfc6eb39f0f8e924659c1cc157331ed98c45e1a92; mfp_wm_route=primary; cf_clearance=Xxya7t0wMyvGAyf7lF6jtNxnrSW22lkh1kehOqidrng-1790968269-1.2.1.1-7taIRaWVHf3tkiEdmf6IlD9uFduqc8D2Zg.CKR.7x8ZYRHTzeIJFDOfS1FryXgVdEXxS9n_OJxLw94v9cW3FaAL1FGIdR8GozkNUJzr0jnX_qxLzZJlQ2DEXQJxyG6.fiSi91DkHugR3qmfDl8UAS3fEFBfV44BdniJQ_T4.TH30aCWMwIKz2lqCNuYPzTYZeAlYGZCrEnJtAhfiH8crgPLrGHVq9tFd.e2AVf2dkSlERnmYCM.tWmR6JZYwJJMQVH7fugEHlJ2vduyccz760LXkNWrOl0y1CTae1A_VTiloP2RrBB.J2pDLFvaMDaZF08.LvKAmljOpi1nFz.f.DoTwRi4O8A.N_ojRxe5XqvyMqUkJZVGIW8UIkH3BRLethHOoMOi9ItKaLJmjgLNrIDhNu2j5IpNkBqgFvDuMRPd5VcxPv8D8Isi6TWkR_ZGkM8kWIZrMjScLsNmNoGpDcA; __cf_bm=kpCbRRNA1ttH1VNrtcVUKwZgWYenHkiSBMtIMDrpKs0-1790968269.7201653-1.0.1.1-P96k0KttTrhoPVWKDmk35sGb6XPZy7Lr7vw29J.I9QQOZ8nhN3WiSDX9d1U.FwLDund8IUiqfmFBR4Txr2LsXUP7ltJqQhbhmgOvz53c5EpgwwG7x4zUvNWEGWgzqY9i; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.myfitnesspal.com%2Ffood%2Fdiary; app-version=21.14.2; 4cb59064936f3386b0f99c691380e257=false; last_login_date=2026-10-03; p=tYtUxFo3GyMBCFxuh8Wx28me; remember_me=97065728060733%3A40b8e85012d4adc1d0e25a7babefcfe8; known_user=307624440; session_event_session_start_website_97065728060733=true; has_seen_premium_interstitial-97065728060733=1; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..mFSQZYaHdJAfTBrS.GrazHetRHr-IAyGzK-KHT3FiKGsr8PoynbNZSphkpFFvr-Sw2Pr9FQprmpwDnPE-HFxYE636CU-yGbibNmHlU3AvCTMbUeu6-e4WWxSJcCLeT32GptMpr_HMw5Yp9PA6vLDEzUl03eAmocpTJ0MblswHVtogzF5Gp4PAv6aGEUixU6HlYMDQ_HzA9OC5xR18Rj1MAl0mFlYdttUSlrpLP_jQBQCloApWnn-fVpVu9nBPFyIlCqYZRzGJCcX6yL3Pv_VJ5GW62ZFtHLp_fZp4McX2d3ozdFL-10L9fyNIwp1BoyZy6-Y0IcjC5ITjiGVoqY_T5-owgPMZIh89fo9BIbspwpXhDpIQIgoDPYcCRkuosyB_YXrQvNp6OTxZV6J_BH3hXc573xq7RE2fpGWZ4yWpNhoOL1t4wAjpjejzbN8n5dT1GtdqDWqsOpcEGb-JwmV2lkwF7jf21TS44_BtX61LhJDW7T7y8F6Oq_78ppqAE1JaM1GjU98xpIaq6XNo05GyyFWvF8g52chYhGvnGAcQmBlyPzgDa2VcOvJAWpbX0Vav3iVXvw9VWLGDhpc_eFfSBeJ6RorOOvdliS2bzMk-PXltJLSfJ01UBlWJzwyA_XFWrgvAlCwqFYRMHet5NdZL4mGbP6zUtHjpj2IcDl5g1nYnvrm8KnamEU35euDMICegyo8_IqDrTKLZztB1S3Rk06_gQzJIwlPXu_qYWPudA8y1o2au17FwL4XPCXpCKvzJ0zMjO9S4NBi7cL9YgaIgpOXmCoqYeouJXsPoxVR6UrOq1C2O-1Qk5bcTXOzJe0XWjFrik2Cc3RZxQau1mc8NfPUNqTUK4ZVISCZs4tIVHFO9op3wTkT3ZHVILdZv7NYCjMgDW2_vyxV9tmLww9kcswjWKHttoTMeD8PbROcFz2LqwcN1pVSkDOewGkYCt8X4pTGxIY1Cc3GODaPtu7lBL1VWNggFBf-LDoEnvyjOwLNUlPGx-K67AIeFqHgB7TcP879KJ9V8fogzsQCDCEp2LsXaYXWrBJ58QOzKpO-t4-F0AvQnXgUxXC4mJq3Sp1YgDMmJo9UHX2f_aU_EyZcL7wN7lnQY-lnTbb2J5K9nUAfjh3Xqz3YhAFRDl1fuW52R8AEsMiZtTXEXbswVIYAGKcaAjEQAq3MCbv-QKHz_tPowysWfCfnHzfBnyvYta_8e3kMa6zc9WmxMNE78C0-PRy52NYCQiDINOKdOKQXszC_O1cDUlyLr0mCy7F8dDvLkrFsHGIzijLSBGnYLJ-mTD4jrMVkwyOx6k4wpVIRI3rg_YCuOua52fpvM5pzc-yX7cyl99sbYTwJakjviDtqJ4OK-UllONINAMtMXoA0UDObCgKu1rBbwXD8TZ54-LDCGmpwSUtW7UVSXv3j10bwL8xCj-5Bl3dsRVPWbHEua0WACDnrcU3Hug_dGAJHt5X4Y1hj8AW0MHJ_bnemMJX5eDBYeltCLdIkBXLbjoQE41Z37hBw_Y9rdNxbOhUnZT8-q0C9l-_M9kTmdotrU9fURGedkTJfZnXzszC0iNKZC_q9_gC2haEo.cVH4OZ806ifj3xWS-Lty4Q; AMP_2746a27a28=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJhNTNlMzE5YS00NWQ2LTQ0MDMtYTk5My03NGJiMzczMzE2ZWIlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjI5NzA2NTcyODA2MDczMyUyMiUyQyUyMnNlc3Npb25JZCUyMiUzQTE3OTA5NjgyNjUwODUlMkMlMjJvcHRPdXQlMjIlM0FmYWxzZSUyQyUyMmxhc3RFdmVudFRpbWUlMjIlM0ExNzkwOTY4MzkwMzQxJTJDJTIybGFzdEV2ZW50SWQlMjIlM0ExMDglN0Q=; _dd_s=aid=1f4e5038-bb00-42d1-86c4-2f5b0a8fd181&logs=0&expire=1790969296172&rum=0; _mfp_session=fz5ideLUpxYXSiG5StPHnDy58%2FKn6OgR5P2gJ6qVHPfTkOf%2B%2B3LQK9VKdCQGSqFxEBpOXiU6lcApJ2RELtL0WIoUhKSGWAmLRR11qK2VenPC13j1qfkSto%2B4HYULBP2HmWmUWoWfph2Ogy9WogaFM44%2Bvd%2BSuh48zL2eC7xiZ2VN83KdjMoY6AbX2YvY3r0MUhA2u7cUZyPORSwPMfHwc4OvP9XTeWQLqZVmEvaZ2PS2OYD18kYkBtJ1jfseT9nilyeqvGcSQl3KvI4PPFO%2BjUnDDKtoBeuQzpnCkMmnGin9cTWqcZxSNN8AUEoEwWRCIZgCXi1lsVSmM4x5u81Kj7IHyaCM29VMP3e8Zhgy6O61GuwF7%2FDY8%2F0XBEc7%2FeUWPaxsFV4PHrEYGE%2FO32KOw2fqMJTXWQ36phHnYx1IcNp4xZrS8v382KLeTUARpH6QK8TGxGoxI4xecMwJmsicLIfS10PBSZFujSPnnbvduh8S26DXnPxci4Bj4ZpVxA0rYNWGF7LsT4RLJ%2B0wo1ATRViDBEhAkxooEKWVb0E2o%2FiplNparwDaeHLI74mOi0aHZjZvj2v%2BFXocGSWwGSIzsFYW0BbBYXqxJQluPA%3D%3D--CFrUnrYzvCU5Ot1T--itsmmu6o1Ub3o8m6TSQAOw%3D%3D`,
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