import { Routes, Route } from "react-router"
import Navbar from "./components/Navbar/Navbar"
import Layout from "./layout/Layout"
import Home from "./pages/Home"
import Register from "./pages/Register"

function App() {
  return (
    <Routes>
      <Route element={<Layout/>}>
        <Route path="/" element={<Home/>}></Route>
        <Route path="/register" element={<Register/>}></Route>
      </Route>
    </Routes>
   
  )
}

export default App
