import axios from "axios";

const API = "http://localhost:5000";

export async function googleLogin(credential) {
  const res = await axios.post(`${API}/auth/google`, {
    token: credential
  });

  localStorage.setItem("token", res.data.token);
  return res.data.user;
}
