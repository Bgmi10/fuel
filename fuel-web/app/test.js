const axios = require('axios');

axios.get('https://apitxt.com/api/sendOTP', {
    params: {
      "authkey": "X73ZY2ZtI39_zD867MLEJMjOG7duw9KAFvePO4u5t28",
      "mobile": "917845442450",
      "otp": "781290",
    },
})
    .then((res) => console.log(res.data))
    .catch((err) => console.error(err.response?.data || err.message));