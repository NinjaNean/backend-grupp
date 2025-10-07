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
          <div class="product" data-id="${p.sk.replace('PRODUCT#p', '')}">
            <strong>${p.name}</strong>
            <span class="price">${p.price} SEK</span>
            <div class="stock">
              <button class="decrease">−</button>
              <span class="amount">${p.amountStock}</span>
              <button class="increase">+</button>
            </div>
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

productsDiv.addEventListener("click", async (e) => {
  const btn = e.target;

  if (btn.classList.contains("increase") || btn.classList.contains("decrease")) {
    const productDiv = btn.closest(".product");
    const id = productDiv.dataset.id;
    const amountEl = productDiv.querySelector(".amount");
    let newAmount = parseInt(amountEl.textContent);

    if (btn.classList.contains("increase")) {
      newAmount++;
    } else if (btn.classList.contains("decrease") && newAmount > 0) {
      newAmount--;
    }

    amountEl.textContent = newAmount;

    try {
      const res = await fetch(`/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productDiv.querySelector("strong").textContent,
          price: parseInt(productDiv.querySelector(".price").textContent),
          amountStock: newAmount,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error("Update failed:", data.message);
      }
    } catch (err) {
      console.error("Error updating product:", err);
    }
  }
});

