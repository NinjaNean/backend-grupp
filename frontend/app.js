const productsDiv = document.getElementById("products");
const showProductsBtn = document.getElementById("show-products");
const hideProductsBtn = document.getElementById("hide-products");

async function loadProducts() {
  try {
    const res = await fetch("/products");
    const data = await res.json();

    if (data.success) {
      if (!data.items || data.items.length === 0) {
        productsDiv.textContent = "No products found.";
        return;
      }

      productsDiv.innerHTML = data.items
      .map(
        (p) => `
          <div class="product">
            <strong>${p.name}</strong>
            <span class="price">${p.price} SEK</span>
            <span class="stock">Stock: ${p.amountStock}</span>
          </div>
        `
      )
      .join("");
    } else {
      let msg = data.message || "Could not fetch products.";
      if (data.error) {
        msg += " | " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      }
      productsDiv.textContent = msg;
    }
  } catch (err) {
    productsDiv.textContent = "Error fetching products: " + err.message;
  }
}

function hideProducts() {
  productsDiv.innerHTML = ""; 
}

showProductsBtn.addEventListener("click", loadProducts);
hideProductsBtn.addEventListener("click", hideProducts);
