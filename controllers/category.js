import Category from "../models/category.js";
import Product from "../models/product.js";
import slugify from "slugify";

export const create = async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName) {
      return res.status(400).json({ error: "Name is required" });
    }
    const existingCategory = await Category.findOne({ name: normalizedName });
    if (existingCategory) {
      return res.status(400).json({ error: "Already exists" });
    }

    const category = await new Category({
      name: normalizedName,
      slug: slugify(normalizedName, { lower: true, strict: true }),
    }).save();
    res.json(category);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Could not create category" });
  }
};

export const update = async (req, res) => {
  try {
    const { name } = req.body;
    const { categoryId } = req.params;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName) {
      return res.status(400).json({ error: "Name is required" });
    }
    const category = await Category.findByIdAndUpdate(
      categoryId,
      {
        name: normalizedName,
        slug: slugify(normalizedName, { lower: true, strict: true }),
      },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Could not update category" });
  }
};

export const remove = async (req, res) => {
  try {
    const removed = await Category.findByIdAndDelete(req.params.categoryId);
    if (!removed) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(removed);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Could not delete category" });
  }
};

export const list = async (req, res) => {
  try {
    const all = await Category.find({});
    res.json(all);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load categories" });
  }
};

export const read = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load category" });
  }
};

export const productsByCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const products = await Product.find({ category: category._id }).populate(
      "category"
    );

    res.json({
      category,
      products,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load category products" });
  }
};
