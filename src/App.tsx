import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";

export default function App() {
  return (
    <Router basename="/md2post">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
