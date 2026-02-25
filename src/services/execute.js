import axios from "axios";

const API = "http://localhost:5000";

export async function executeCode({ language, code, stdin, args }) {
  const token = localStorage.getItem("token");
  const res = await axios.post(
    `${API}/execute`,
    { language, code, stdin, args },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }
  );
  return res.data;
}
