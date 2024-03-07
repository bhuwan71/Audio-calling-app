import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client";
import ringing from "../public/phone-calling.mp3";
const socket = io("http://localhost:5000");

function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [callRinging, setCallRinging] = useState(false);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ringingSoundRef = useRef(new Audio(`${ringing}`));

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStreamRef.current = stream;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 32;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
          setIsSpeaking(average > 50);
          requestAnimationFrame(updateMeter);
        };

        updateMeter();
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });

    socket.on("call_started", () => {
      setIsCalling(true);
      setCallRinging(false); // Reset callRinging state when the call is answered
      createPeerConnection();
    });

    socket.on("call_ended", () => {
      setIsCalling(false);
      setCallRinging(false); // Reset callRinging state when the call ends
      closePeerConnection();
    });

    socket.on("offer", (offer) => {
      peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      peerConnectionRef.current.createAnswer().then((answer) => {
        peerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      });
    });

    socket.on("answer", (answer) => {
      peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("ice_candidate", (candidate) => {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Handle callRinging state when receiving a call
    socket.on("start_call", (roomId) => {
      setRoomId(roomId);
      setCallRinging(true);
      ringingSoundRef.current.play();
    });
  }, []);

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection();

    localStreamRef.current.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", { roomId, candidate: event.candidate });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteStreamRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current.onnegotiationneeded = () => {
      peerConnectionRef.current.createOffer().then((offer) => {
        peerConnectionRef.current.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
      });
    };
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const startCall = () => {
    const roomId = Math.random().toString(36).substr(2, 8);
    setRoomId(roomId);
    setCallRinging(true);
    ringingSoundRef.current.play();
    socket.emit("start_call", roomId);
  };

  const endCall = () => {
    socket.emit("end_call", roomId);
    closePeerConnection();
    setIsCalling(false);
    setRoomId("");
    setCallRinging(false);
  };

  return (
    <div>
      {isCalling ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            background: "#f8f8f8",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>
            {isSpeaking ? (
              <span role="img" aria-label="Speaking">
                🔊
              </span>
            ) : (
              <span role="img" aria-label="Not speaking">
                🔇
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Call in progress...
          </p>
          <button
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={endCall}
          >
            End Call
          </button>
          <audio ref={remoteStreamRef} autoPlay />
        </div>
      ) : callRinging ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            background: "#f8f8f8",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Incoming Call.....
          </p>
          <img
            src="https://i.pinimg.com/originals/3b/86/c3/3b86c3ef30b79c72c92cc1079904bec3.png"
            alt="Beautiful Icon"
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              marginBottom: "20px",
            }}
          />
          <button
            style={{
              background: "red",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            End Call
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={startCall}
            style={{
              padding: "15px 30px",
              fontSize: "18px",
              fontWeight: "bold",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#0056b3")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#007bff")}
          >
            Start Call
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
