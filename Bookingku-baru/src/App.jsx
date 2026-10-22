import { ToastContainer } from "react-toastify";
import Router from "./Routes/Router";

export default function App() {
  return (
    <>
      <Router />
      <ToastContainer position="top-right" autoClose={2500} />
    </>
  );
}
