import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./api/price.js";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.status = (n) => ((res.statusCode = n), res);
    res.json = (v) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(v));
    };
    if (url.pathname === "/api/price") return handler(req, res);
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (
      !["index.html", "app.js", "core.js", "style.css", "theme.js"].includes(
        file,
      )
    ) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    try {
      res.setHeader("Content-Type", types[file.slice(file.lastIndexOf("."))]);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(await readFile(new URL(`./public/${file}`, import.meta.url)));
    } catch {
      res.statusCode = 500;
      res.end("Unable to read app");
    }
  })
  .listen(process.env.PORT || 4176, "127.0.0.1", () =>
    console.log("Khonstash: http://localhost:" + (process.env.PORT || 4176)),
  );
