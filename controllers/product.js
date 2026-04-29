import Product from "../models/product.js";
import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";
import Order from "../models/order.js";
import sgMail from "@sendgrid/mail";

dotenv.config();
if (process.env.SENDGRID_KEY?.startsWith("SG.")) {
  sgMail.setApiKey(process.env.SENDGRID_KEY);
}

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const create = async (req, res) => {
  try {
    // console.log(req.fields);
    // console.log(req.files);
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedDescription =
      typeof description === "string" ? description.trim() : "";
    const normalizedPrice = typeof price === "string" ? price.trim() : "";
    const normalizedCategory = typeof category === "string" ? category.trim() : "";
    const normalizedQuantity = typeof quantity === "string" ? quantity.trim() : "";
    const normalizedShipping = typeof shipping === "string" ? shipping.trim() : "";

    // validation
    switch (true) {
      case !normalizedName:
        return res.status(400).json({ error: "Name is required" });
      case !normalizedDescription:
        return res.status(400).json({ error: "Description is required" });
      case !normalizedPrice:
        return res.status(400).json({ error: "Price is required" });
      case !normalizedCategory:
        return res.status(400).json({ error: "Category is required" });
      case !normalizedQuantity:
        return res.status(400).json({ error: "Quantity is required" });
      case !normalizedShipping:
        return res.status(400).json({ error: "Shipping is required" });
      case photo && photo.size > 1000000:
        return res
          .status(400)
          .json({ error: "Image should be less than 1mb in size" });
    }

    // create product
    const product = new Product({
      ...req.fields,
      name: normalizedName,
      description: normalizedDescription,
      slug: slugify(normalizedName, { lower: true, strict: true }),
    });

    if (photo) {
      product.photo.data = fs.readFileSync(photo.path);
      product.photo.contentType = photo.type;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Could not create product" });
  }
};

export const list = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

export const read = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load product" });
  }
};

export const photo = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select(
      "photo"
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.photo?.data) {
      res.set("Content-Type", product.photo.contentType);
      return res.send(product.photo.data);
    }
    return res.status(404).json({ error: "Photo not found" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load product photo" });
  }
};

export const remove = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.productId
    ).select("-photo");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not delete product" });
  }
};

export const update = async (req, res) => {
  try {
    // console.log(req.fields);
    // console.log(req.files);
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedDescription =
      typeof description === "string" ? description.trim() : "";
    const normalizedPrice = typeof price === "string" ? price.trim() : "";
    const normalizedCategory = typeof category === "string" ? category.trim() : "";
    const normalizedQuantity = typeof quantity === "string" ? quantity.trim() : "";
    const normalizedShipping = typeof shipping === "string" ? shipping.trim() : "";

    // validation
    switch (true) {
      case !normalizedName:
        return res.status(400).json({ error: "Name is required" });
      case !normalizedDescription:
        return res.status(400).json({ error: "Description is required" });
      case !normalizedPrice:
        return res.status(400).json({ error: "Price is required" });
      case !normalizedCategory:
        return res.status(400).json({ error: "Category is required" });
      case !normalizedQuantity:
        return res.status(400).json({ error: "Quantity is required" });
      case !normalizedShipping:
        return res.status(400).json({ error: "Shipping is required" });
      case photo && photo.size > 1000000:
        return res
          .status(400)
          .json({ error: "Image should be less than 1mb in size" });
    }

    // update product
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      {
        ...req.fields,
        name: normalizedName,
        description: normalizedDescription,
        slug: slugify(normalizedName, { lower: true, strict: true }),
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (photo) {
      product.photo.data = fs.readFileSync(photo.path);
      product.photo.contentType = photo.type;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Could not update product" });
  }
};

export const filteredProducts = async (req, res) => {
  try {
    const { checked = [], radio = [] } = req.body;

    let args = {};
    if (checked.length > 0) args.category = checked;
    if (Array.isArray(radio) && radio.length === 2) {
      args.price = { $gte: radio[0], $lte: radio[1] };
    }

    const products = await Product.find(args);
    res.json(products);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not filter products" });
  }
};

export const productsCount = async (req, res) => {
  try {
    const total = await Product.find({}).estimatedDocumentCount();
    res.json(total);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load product count" });
  }
};

export const listProducts = async (req, res) => {
  try {
    const perPage = 6;
    const page = Math.max(parseInt(req.params.page || "1", 10), 1);

    const products = await Product.find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load products" });
  }
};

export const productsSearch = async (req, res) => {
  try {
    const { keyword } = req.params;
    const safeKeyword = typeof keyword === "string" ? keyword.trim() : "";
    if (!safeKeyword) {
      return res.status(400).json({ error: "Keyword is required" });
    }
    const results = await Product.find({
      $or: [
        { name: { $regex: safeKeyword, $options: "i" } },
        { description: { $regex: safeKeyword, $options: "i" } },
      ],
    }).select("-photo");

    res.json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not search products" });
  }
};

export const relatedProducts = async (req, res) => {
  try {
    const { productId, categoryId } = req.params;
    const related = await Product.find({
      category: categoryId,
      _id: { $ne: productId },
    })
      .select("-photo")
      .populate("category")
      .limit(3);

    res.json(related);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not load related products" });
  }
};

export const getToken = async (req, res) => {
  try {
    if (!process.env.BRAINTREE_MERCHANT_ID) {
      return res.status(500).json({ error: "Payment gateway is not configured" });
    }

    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        return res.status(500).json({ error: "Could not generate client token" });
      } else {
        res.send(response);
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not generate client token" });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    if (!nonce) {
      return res.status(400).json({ error: "Payment nonce is required" });
    }
    if (!Array.isArray(cart) || !cart.length) {
      return res.status(400).json({ error: "Cart is required" });
    }

    const productIds = cart.map((item) => item._id);
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "price"
    );
    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ error: "One or more cart items are unavailable" });
    }
    const priceMap = new Map(
      products.map((product) => [String(product._id), product.price])
    );

    let total = 0;
    cart.forEach((item) => {
      total += priceMap.get(String(item._id)) || 0;
    });

    if (!total) {
      return res.status(400).json({ error: "Unable to calculate cart total" });
    }

    const result = await new Promise((resolve, reject) => {
      gateway.transaction.sale(
        {
          amount: total.toFixed(2),
          paymentMethodNonce: nonce,
          options: {
            submitForSettlement: true,
          },
        },
        (error, transactionResult) => {
          if (error) {
            return reject(error);
          }
          if (!transactionResult?.success) {
            return reject(
              new Error(transactionResult?.message || "Payment failed")
            );
          }
          resolve(transactionResult);
        }
      );
    });

    await new Order({
      products: productIds,
      payment: result,
      buyer: req.user._id,
    }).save();

    await decrementQuantity(productIds);

    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: err.message || "Could not process payment",
    });
  }
};

const decrementQuantity = async (cart) => {
  try {
    // build mongodb query
    const bulkOps = cart.map((item) => {
      return {
        updateOne: {
          filter: { _id: item },
          update: { $inc: { quantity: -1, sold: +1 } },
        },
      };
    });

    const updated = await Product.bulkWrite(bulkOps, {});
    console.log("bulk updated", updated.modifiedCount || updated.nModified || 0);
  } catch (err) {
    console.log(err);
  }
};

export const orderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("buyer", "email name");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    // send email

    // prepare email
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: order.buyer.email,
      subject: "Order status",
      html: `
        <h1>Hi ${order.buyer.name}, Your order's status is: <span style="color:red;">${order.status}</span></h1>
        <p>Visit <a href="${process.env.CLIENT_URL}/dashboard/user/orders">your dashboard</a> for more details</p>
      `,
    };

    try {
      if (process.env.SENDGRID_KEY) {
        await sgMail.send(emailData);
      }
    } catch (err) {
      console.log(err);
    }

    res.json(order);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Could not update order status" });
  }
};
