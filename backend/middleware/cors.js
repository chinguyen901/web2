const Cors = require("cors");

const frontendOrigin = process.env.FRONTEND_URL;
// Browsers reject credentials with origin "*"; only enable credentials when FRONTEND_URL is set.
const cors = Cors({
  origin: frontendOrigin || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: Boolean(frontendOrigin)
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

async function applyCors(req, res) {
  await runMiddleware(req, res, cors);
}

module.exports = applyCors;
