import { Link } from "react-router";

const NotFound = () => {
  return (
    <section className="mx-auto mt-16 max-w-2xl rounded-box border border-base-300 bg-base-100 p-10 text-center shadow-sm">
      <p className="text-6xl font-black text-primary">404</p>
      <h1 className="mt-4 text-3xl font-bold">Página no encontrada</h1>
      <p className="mt-3 text-base-content/70">
        La página que buscás no existe o fue movida.
      </p>
      <Link className="btn btn-primary mt-6" to="/">
        Volver al inicio
      </Link>
    </section>
  );
};

export default NotFound;