import ProductCard from "./ProductCard";
import FadeInOnScroll from "../common/FadeInOnScroll";

const ProductGrid = ({ products }) => {
  const staggerDelay = 75;

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => (
        <FadeInOnScroll
          delay={index * staggerDelay}
          key={product._id}
          threshold={0.1}
        >
          <ProductCard product={product} />
        </FadeInOnScroll>
      ))}
    </div>
  );
};

export default ProductGrid;
