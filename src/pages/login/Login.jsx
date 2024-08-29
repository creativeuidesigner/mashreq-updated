import { useState } from "react";
import logo from "./logo.png";
import style from "./login.module.css";
import { useNavigate } from "react-router-dom";
import { loginDetails } from '../../connection/config/login';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Predefined credentials
  // const credentials = [
  //   { username: "genai@lals.com", password: "5cN2V$05g@" },
  //   { username: "kb@lals.com", password: "150@S4NMxv" },
  //   { username: "kamal@lals.com", password: "mrYi2x474Q" },
  // ];

  const handleSubmit = (event) => {
    event.preventDefault();
    const user = loginDetails.find(
      (cred) => cred.username === username && cred.password === password
    );
    if (user) {
      localStorage.setItem("username", username);
      navigate("/chat");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className={style.container}>
      <div className={style.innerContainer}>
        <img src={logo} className={style.logo} alt="logo" />
        <form method="post" className={style.form} onSubmit={handleSubmit}>
          <div className={style.details}>
            <h1>Sign in</h1>
            <p>Please enter your details to sign in</p>
          </div>
          <div className={style.inputDiv}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className={style.userInput}
              autoComplete="off"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className={style.inputDiv}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={style.passwordInput}
              autoComplete="off"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p
              style={{ color: "#fd5555", marginTop: "10px", marginBottom: "0" }}
            >
              {error}
            </p>
          )}{" "}
          {/* Display error */}
          <button type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
