import { Route, Routes } from "react-router";
import AdminRoute from "./components/common/AdminRoute.jsx";
import PrivateRoute from "./components/common/PrivateRoute.jsx";
import { CartContextProvider } from "./context/CartContext.jsx";
import { UserContextProvider } from "./context/UserContext.jsx";
import Layout from "./layout/Layout.jsx";
import Cart from "./pages/Cart.jsx";
import CheckoutFailure from "./pages/CheckoutFailure.jsx";
import CheckoutPending from "./pages/CheckoutPending.jsx";
import CheckoutSuccess from "./pages/CheckoutSuccess.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import MyPurchases from "./pages/MyPurchases.jsx";
import NotFound from "./pages/NotFound.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";

function App() {
  return (
    <UserContextProvider>
      <CartContextProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route element={<Home />} path="/" />
            <Route element={<Home />} path="/products" />
            <Route element={<ProductDetail />} path="/product/:id" />
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
              <Route element={<Profile />} path="/mi-perfil" />
            </Route>
            <Route element={<NotFound />} path="*" />
          </Route>
        </Routes>
      </CartContextProvider>
    </UserContextProvider>
  );
}

export default App;
