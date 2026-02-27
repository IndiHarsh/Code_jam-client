import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import RoomJoin from "./pages/RoomJoin";
import EditorRoom from "./pages/EditorRoom";
import Chatbot from "./components/Chatbot";
import ServerStatus from "./components/ServerStatus";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/join" element={<RoomJoin />} />
        <Route path="/room/:roomId" element={<EditorRoom />} />
      </Routes>
      {/* Global floating chatbot, visible on all pages */}
      <Chatbot />
      {/* Server offline banner — auto-shows when Render server is sleeping */}
      <ServerStatus />
    </BrowserRouter>
  );
}
