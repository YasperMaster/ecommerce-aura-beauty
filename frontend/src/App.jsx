import { Route, Routes } from "react-router";
import AdminRoute from "./components/common/AdminRoute";
import PrivateRoute from "./components/common/PrivateRoute";
import { CartContextProvider } from "./context/CartContext";
import { UserContextProvider } from "./context/UserContext";
import Layout from "./layout/Layout";
import Cart from "./pages/Cart";
import CheckoutFailure from "./pages/CheckoutFailure";
import CheckoutPending from "./pages/CheckoutPending";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyPurchases from "./pages/MyPurchases";
import Register from "./pages/Register";
import Dashboard from "./pages/admin/Dashboard";

function App() {
  return (
    <UserContextProvider>
      <CartContextProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route element={<Home />} path="/" />
            <Route element={<Home />} path="/products" />
            <Route element={<Register />} path="/register" />
            <Route element={<Login />} path="/login" />
            <Route element={<ForgotPassword />} path="/forgot-password" />
            <Route element={<Cart />} path="/cart" />
            <Route element={<CheckoutSuccess />} path="/checkout/success" />
            <Route element={<CheckoutPending />} path="/checkout/pending" />
            <Route element={<CheckoutFailure />} path="/checkout/failure" />
            <Route element={<AdminRoute />}>
              <Route element={<Dashboard />} path="/admin" />
            </Route>
            <Route element={<PrivateRoute />}>
              <Route element={<MyPurchases />} path="/mis-compras" />
            </Route>
          </Route>
        </Routes>
      </CartContextProvider>
    </UserContextProvider>
  );
}

export default App;
