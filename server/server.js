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
    console.log(
      `${callerId} started call with ${receiverId} in room ${roomId}`
    );
    socket.to(roomId).emit("call_started", { callerId, receiverId });
  });

  socket.on("end_call", (roomId) => {
    socket.to(roomId).emit("call_ended");
  });

  socket.on("offer", (data) => {
    const { roomId, offer, callerId, receiverId } = data;
    socket.to(roomId).emit("offer", { offer, callerId, receiverId });
  });

  socket.on("answer", (data) => {
    const { roomId, answer, callerId, receiverId } = data;
    socket.to(roomId).emit("answer", { answer, callerId, receiverId });
  });

  socket.on("ice_candidate", (data) => {
    const { roomId, candidate, callerId, receiverId } = data;
    socket
      .to(roomId)
      .emit("ice_candidate", { candidate, callerId, receiverId });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
