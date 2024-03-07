const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("start_call", (data) => {
    const { roomId, callerId, receiverId } = data;
    socket.join(roomId);
    io.to(receiverId).emit("call_started", { callerId, roomId });
  });

  socket.on("end_call", (roomId) => {
    socket.to(roomId).emit("call_ended");
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data.offer);
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", data.answer);
  });

  socket.on("ice_candidate", (data) => {
    socket.to(data.roomId).emit("ice_candidate", data.candidate);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
