const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  auth: {
    verifyToken: "bebbot"
  },
  reconnection: true,
  transports: ["websocket"]
});

const channel = "uptime";

socket.on(channel, (data) => {
  console.log("Data:", data);
});

socket.on("connect", () => {
  console.log("✅ Connected successfully");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.log("⚠️ Connection error:", err.message);
});