"use strict";
const { spawn } = require("child_process");
const log       = require("./logger/log.js");

function startProject() {
  const child = spawn("node", ["ST.js"], {
    cwd:   __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (code) => {
    if (code === 2) {
      log.info("SYSTEM", "Restarting project (code 2)…");
      return startProject();
    }
    if (code === null || code === 0) {
      log.warn("SYSTEM", "Child exited cleanly — restarting in 3s…");
    } else {
      log.warn("SYSTEM", `Child exited with code ${code} — restarting in 3s…`);
    }
    setTimeout(() => startProject(), 3000);
  });

  // Keep the parent process alive even between child restarts
  child._keepAliveRef = setInterval(() => {}, 60000);
}

startProject();