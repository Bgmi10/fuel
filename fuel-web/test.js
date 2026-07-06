const axios = require("axios");

const URL = "https://myshopfloor.in:3000/authorisationmanagement/login";

const payload = {
  userId: "ashvincnc@gmail.com",
  password: "testpassword",
};

const TOTAL_REQUESTS = 200000;
const CONCURRENCY = 500;

async function makeRequest(i) {
  try {
    const res = await axios.post(URL, payload);
    console.log(`#${i}: ${res.status}`);
  } catch (err) {
    console.log(`#${i}: ${err.response?.status || err.message}`);
  }
}

async function run() {
  let completed = 0;

  while (completed < TOTAL_REQUESTS) {
    const batch = [];

    for (
      let i = completed;
      i < Math.min(completed + CONCURRENCY, TOTAL_REQUESTS);
      i++
    ) {
      batch.push(makeRequest(i + 1));
    }

    await Promise.all(batch);
    completed += batch.length;
  }

  console.log("Finished");
}

run();