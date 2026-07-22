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
        cookie: `p=9A8GUAjGjSc8BmS0eggusye5; known_user=308043830; anon-device-id=9e1daf15-0f07-4b1d-bf7a-e20b4a802ef1; __Host-next-auth.csrf-token=7efd721ce080cd000022db090e5cfca813d3454db07aaeffaa066a9c6fae0e1b%7Cee508fec6a37247dac3cb160c68e8749067957fdc20c0550c4f61bb708acd2fb; AMP_MKTG_2746a27a28=JTdCJTdE; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.myfitnesspal.com%2Ffood%2Fdiary; app-version=21.9.6; 4cb59064936f3386b0f99c691380e257=false; last_login_date=2026-07-22; remember_me=132241686294205%3Ab4371d0a085a568d6fe8fc3be0118410; session_event_session_start_website_132241686294205=true; cf_clearance=QWvqmUZy5mAOC1nYgKTIQy0aieykF3GFVYz1sUnw_9o-1784681147-1.2.1.1-GUmwC6KXGHcW2xp1EzjP3VuOGFOCMSapRbRgqOHJ.ZwGTrG9U0avoMOpK9CJjjPF7.WOzihL_.K2PVhD1Ii1ltFdggsS3nkJJtXCvPk3y_F1KtwwQKArq4xYhEidCBfxbDPLmD8UzDLeomD8VTCXnnkxqsK5rPEt_.RmKO.aj9JFlkdJkJ6ogYQg4MjtUtEgC1wSMg_x0xMzRMZhdDXc688xDW3IsfR.8s32hdf3ygoYUKFVpaw1Ci6w8ABIrMNzrRjjq_yAYUqLhf38OK1U1Uj9RzQwTksWpjZp1KxeQVR1r7HutGqsBHY3oasCS41KOBqxH6noxJ9s_cErm4_.uoDQbwPJQLOm__0EJaP10gcrchcnjbXm7e0uYQW5B55o38sKPPIkil3P_Dv_OGtz11qCLgSjatqvLt9cfpcOlYHyu5eTxH1Hd83NG7qvUj1N; __cf_bm=XM29wp7cUgOWQNi1thD1oZ7OMjK8ftlf9ZDrjgSupmE-1784681147.7483933-1.0.1.1-pjJ2qomY9Q14a4uMCyL55cZAAejk04C9ViRMm_68tJENdVCWKfTtQ8.UH73s_qAjq5b1elYEUeyn6fM7XejbN4cmFR_3cvVhiKlAmcJqsT1ptlw4B0c8Llgj.bzlBiIH; has_seen_premium_interstitial-132241686294205=1; _mfp_session=oC1gelSvV0kY13ZLjX39BUgpTLGPdntgv1d8A2Y99Z25UVR2MMhYl8fJanLakL0n1mSMqAbd2OS8My4p%2FTa3ual8QgB2a09yYllirVjnKSsmU%2Bv0kQUSu%2BErVEYqd0i2ipy8zipoRJUZZfpPlBTGd6570uqZEx5VvTcQvoFMysMlMvuwGvG3FIqSH%2BA2aky%2BPfeds3xhY2CT4sDRGwEk%2FXVQbW4t6MYeD%2BLEN78kuKORy7w9oJZyKI%2BEy0xPC5voproJZIKut3h1KQJdm1dykJ0FY5Al9EaILq5hQCt%2FIWyr5Nt6dBvh4aXPg9Dqdn41Pg4COlFo65X7YZ0MuG1eRQL4TA8ZyWORzVxmR%2BzJ%2FlU%2FPSS13q9iZvGsOpAy4puIQqG1qh%2BOo43VMuyXgZgPZtiXVARpT5GICzA3iijNNeDVfSDIx6O0McQywEwPpMyTkVmTXNAqni2skJEbbCJnPfkaMO%2Fb3AwTu%2BrwtSaU5fd2dWLkZAA6ZcCVhEX7LCwLVWA2HkUTyrUSO5aO7UDVmP3tptEWK2BwecwxyL8%2Few2UAQTj3z%2FbY1l2bS6EG7cHpf0nym132W8aK75qbtuh1V2fNWGBS47H--jc2PM%2By6FGJTWT7l--Bl5KQrRsCQLIoXeoRM5%2B7A%3D%3D; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..HXv1aSAA0ZwDDw8U.vtoMqSHg7HHe_i_QKkBvPjrkMA9VUZiHRt-IkWKEsbLQ-jKmn_FSjqB3Phxs_59U3rwulpNuT1UEbDGPQRT3tKcgTmzx1Mf9QCQhw9cAp3VFRNc24dF2NWW8yeiORdSC-oksbf39EhEmQ74uZUPdu-RSoREJW7cEqjV7m2LJMOoahze9xlbaP2idTcxpbW3cICLOBdqOyrimpUsiXFMhtJbnYcH1Ik5B5tJF1nGIJ2yZaK5vbLOAlVyawvfPMmzbKJsoCLXqlJSlW4Aawi2PFFx4L1QPYOENU4t8QfaGjh7dWUXyalikd3g-FFIkHPG4hzOGJ6pd743SKFIhBQ7HPaAi65li3K2bxYDg-3XgI2Ix5zcAiPIzDu65lcalq5QcsSipjGZdT08UrUjJM8FQBEZZnhTZgEcH4JaoOo7KqvteYFG9sICIQLWEUY-qZhr7RagHPIasIvyr9zTYcq-BvefaFuEFmtSESisLR8Rk1CIOrQkGzOGy-ljbxEi_cqA_KxxE_mGvduFb_zQieaXiIzmyGwvBumWC6L86rh7djjE6c65qjtJ8mzB6BWPes_rfRqM0z7Q5PatKe8TwHH8eitkqOCWfJ1hMg24MIm1UywIgcnSSUyE2x0UWlI1bukaM84YhZ6NpFkBnpKpeJ8CcL8CFxS6tnmR4pB6SJ9OXCQaGmTcoB87-uPHN5CrWB0DBSxOqjM-xuhAdMeVgZzw6CKKu217psv5zkBXy0lpm9s9r-UI8JBJ345lufhG_uoQZagiEAQUNY6A2TpQj3ajueyx79cnohgXOtNhg73mrfcJG9FMOOnFOhl-gu3baIfeQ081ayHL2ixTXFkEwwIhly0o0IffFwE03VZ9TCqU1fac4bG2m2wIxsw5NylJCyJABXfMkGUG_XjxI5wIT_s6rQ_VuTTnrNfJxi3I-rz19OHxrcHl_tzMUuhJMXZs5p5DKw1uVx2bIuRR-mFBR7cfyP7Xlst67p0DnQ_PpA8aSJvtDcmpZkLLrara99UyQrCTep_2j5pOJl5iRepvIYz86DV6N9SGWcYxRiz-RNog_9H7XjlRljgVVBBrK7T9YwZ6LKlXtg0kataU0qnue1LcWYrTBnQ4mDohZX3ycxdTSI0ZLbrCaFS3Ydd2FLEpyE8uUI3wH_saRfd8DJC3HMXGgNMYua3yeWG4zFIfJgj387rgGLqKUcmdQQxsIspyGcTvT4wCTh4rDlOPFdy_scfynmCAv7uo3cY6FAMy7XbndOIW3TB3CUtQTmB4_7k6L5BqXR6o_llvBIXF4r25PLGf08P1iEOAEt_OCQfLHFOAHIH8HSD3Xko5CHUoyViPKLtNo.9MwFVQ1mP-njgppEp5t2TQ; _dd_s=aid=acbcffee-7805-4a14-9155-97b572604b78&logs=1&id=86bca9fd-52b9-45ed-9399-2c952924ff49&created=1784681071173&expire=1784682128609&rum=2; AMP_2746a27a28=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI5ZTFkYWYxNS0wZjA3LTRiMWQtYmY3YS1lMjBiNGE4MDJlZjElMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjIxMzIyNDE2ODYyOTQyMDUlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzg0NjgxMDcxNjk2JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTc4NDY4MTIyOTAzOSUyQyUyMmxhc3RFdmVudElkJTIyJTNBMTAyJTdE
`,
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