import ProductModel from "../models/ProductModel.js"
import { defaultProducts } from "../data/defaultProducts.js"

export const seedProducts = async () => {
    const productCount = await ProductModel.countDocuments()

    if (productCount > 0) {
        return
    }

    await ProductModel.insertMany(defaultProducts)
    console.log(`Seeded ${defaultProducts.length} products`)
}
