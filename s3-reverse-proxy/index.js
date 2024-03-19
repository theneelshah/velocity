const app = require("express")();
const httpProxy = require("http-proxy");

const PORT = 8000;
const BASE_PATH =
  "https://velocity-theneelshah.s3.us-west-1.amazonaws.com/__outputs";
const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const { hostname } = req;
  const subdomain = hostname.split(".")[0];

  const resolvesTo = `${BASE_PATH}/${subdomain}`;

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const { url } = req;

  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse proxy running on: ${PORT}`));
