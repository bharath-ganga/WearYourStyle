import { Product } from "../models/product.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

const getStylistRecommendations = asyncHandler(async (req, res) => {
  const { message, preferences = {} } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json(new ApiResponse(400, null, "Message query is required"));
  }

  const query = `${message} ${preferences.favoriteColors || ""} ${preferences.occasion || ""} ${(preferences.styles || []).join(" ")}`.toLowerCase();
  console.log(`AI Stylist Query received: "${message}"`);

  // Fetch all products from Postgres
  const allProducts = await Product.getAll();

  // Define keyword filters
  const isMens = query.includes("men") || query.includes("boy") || query.includes("male");
  const isWomens = query.includes("women") || query.includes("girl") || query.includes("lady") || query.includes("female") || query.includes("dress") || query.includes("gown");
  
  const wantsTops = query.includes("shirt") || query.includes("top") || query.includes("wear") || query.includes("t-shirt") || query.includes("dress") || query.includes("gown");
  const wantsBottoms = query.includes("pant") || query.includes("trouser") || query.includes("chinos") || query.includes("cargo") || query.includes("jeans") || query.includes("skirt");
  const wantsShoes = query.includes("shoe") || query.includes("sneaker") || query.includes("footwear") || query.includes("nike");

  const colors = ["blue", "pink", "black", "white", "red", "green", "brown", "grey", "olive", "peach", "maroon"];
  const matchedColor = colors.find(c => query.includes(c));

  // Filter logic
  let filtered = allProducts;

  if (isMens) {
    filtered = filtered.filter(p => p.gender === "mens");
  } else if (isWomens) {
    filtered = filtered.filter(p => p.gender === "womens");
  }

  if (wantsTops) {
    filtered = filtered.filter(p => p.category === "Shirts");
  } else if (wantsBottoms) {
    filtered = filtered.filter(p => p.category === "Pants");
  } else if (wantsShoes) {
    filtered = filtered.filter(p => p.category === "Shoes");
  }

  if (matchedColor) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(matchedColor) || (p.imgSource && p.imgSource.toLowerCase().includes(matchedColor)));
  }

  // Fallback to general category matching if too narrow
  if (filtered.length === 0) {
    filtered = allProducts.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    );
  }

  // Fallback to random if still nothing
  if (filtered.length === 0) {
    filtered = allProducts.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  // Limit recommendations to 3 items max
  const recommendations = filtered.slice(0, 3);

  // Generate personalized conversational stylist response
  let replyText = "Hello! I am your AI Fashion Stylist. ";
  if (recommendations.length > 0) {
    const titles = recommendations.map(p => p.title).join(" and ");
    replyText += `Based on your request${preferences.occasion ? ` and your ${preferences.occasion.toLowerCase()} profile` : ""}, I recommend ${titles}.`;
  } else {
    replyText += "I looked through our latest catalog, but couldn't find exact fits. However, check out these trending items!";
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reply: replyText,
        products: recommendations
      },
      "Stylist recommendations generated successfully"
    )
  );
});

export { getStylistRecommendations };
