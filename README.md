Electronic Store REST API

This API provides CRUD operations for **Users**, **Products**, and **Carts** in an electronic store.  
It was built to help developers discover and interact with store resources through standard HTTP requests.

---

##  Base URL
Base Url : [http://localhost:2474/](http://localhost:2474/
)


## Endpoints

| Resource    | Description                |
| ----------- | -------------------------- |
| `/users`    | Manage user data           |
| `/products` | Manage electronic products |
| `/cart`     | Manage user shopping carts |

##  Setup and Run Locally
 ```bash
git clone https://github.com/yourusername/electronic-store-api.git
cd electronic-store-api
```
Install Dependecies
```bash
npm install
```

Set Up Environment Variables
Create a .env file in the root directory and configure the following:

```bash
PORT=2474
PUBLIC_KEY=your-access-key-id
SECRET_KEY=your-secret-access-key
````
The Api key will be sent out when requested.

Build and Run The Server

```bash
npm run restart

````


## Getting Started

You can use tools like Insomnia, Postman, or any HTTP client library (e.g. axios, fetch) to interact with the API




## How do access the User Endpoint

| Method   | Endpoint     | Description       |
| -------- | ------------ | ----------------- |
| `GET`    | `/users`     | List all users    |
| `GET`    | `/users/:id` | Get a user        |
| `DELETE` | `/users/:id` | Delete a user     |
| `POST`   | `/users`     | Create a new user |
| `PUT`    | `/users/:id` | Update a user     |

Example – Get a User

Request

GET http://localhost:2474/users/USER#u3

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"items": [
		{
			"pk": "USER#u3",
			"name": "Mikaela",
			"sk": "META"
		}
	]
}
```

Example – Delete a User

Request 

DELETE http://localhost:2474/users/USER#u3

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"message": "User deleted successfully",
	"item": {
		"pk": "USER#u3",
    	"name": "Mikaela",
		"sk": "META"
	}
}
```


Example – POST a User

Request 

POST http://localhost:2474/users/USER#u3

Calling this resource with a correct body example example of body:

```json
{
	"pk" : "USER#u5",
	"sk" : "META",
	"name": "test User666"
}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "User created successfully",
	"item": {
		"pk": "USER#u5",
		"sk": "META",
		"name": "test User666"
	}
}
```

Example – PUT a User

Request 

PUT http://localhost:2474/users/USER#u3

Calling this resource with a correct body example example of body:

```json
{
	"name" : "David"
}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "User name updated successfully",
	"item": {
		"name": "David"
	}
}
```

## How do access the Products Endpoint

| Method   | Endpoint               | Description       |
| -------- | ---------------------- | ----------------- |
| `GET`    | `/products`            | List all products |
| `GET`    | `/products/:productID` | Get a product     |
| `DELETE` | `/products/:productID` | Delete a product  |
| `POST`   | `/products`            | Create a product  |
| `PUT`    | `/products/:productID` | Update a product  |

Example – Get a Product

Request

GET http://localhost:2474/products/PRODUCT#p11

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"Item": {
		"pk": "PRODUCTS",
		"price": 499,
		"name": "Elder Scrolls IV: Oblivion Remastered - PS5",
		"amountStock": 80,
		"sk": "PRODUCT#p11"
	}
}
```

Example – Delete a Product

Request 

DELETE http://localhost:2474/products/PRODUCT#p11

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"message": " The product has been removed"
	"Item": {
		"pk": "PRODUCTS",
		"price": 499,
		"name": "Elder Scrolls IV: Oblivion Remastered - PS5",
		"amountStock": 80,
		"sk": "PRODUCT#p11"
	}
}
```


Example – POST a Product

Request 

POST http://localhost:2474/products/PRODUCT#p11

Calling this resource with a correct body example example of body:

```json
{
			"pk": "PRODUCTS",
			"price": 699,
			"name": "Laptopväska",
			"amountStock": 33,
			"sk": "PRODUCT#p11"
	}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "The product has been added",
	"item": {
		"pk": "PRODUCTS",
		"price": 699,
		"name": "Laptopväska",
		"amountStock": 33,
		"sk": "PRODUCT#p11"
	}
}
```

Example – PUT a Product

Request 

PUT http://localhost:2474/products/PRODUCT#p11

Calling this resource with a correct body example example of body:

```json
{
	"name": "Laptopväska",
}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "Product updated",
	"item": {
		"name": "Laptopväska"
	}
}
```

## How do access the Cart Endpoint

| Method   | Endpoint               | Description           |
| -------- | ---------------------- | --------------------- |
| `GET`    | `/cart/:userId`		| Get a Users Cart      |
| `POST`   | `/cart/:userId`   		| Create a Cart         |
| `PUT`    | `/cart/userId/:cartId`	| Update a Cart         |
| `DELETE` | `cart/userId/:cartId`	| Delete a item in Cart |
| `DELETE` | `cart/:userId/`		| Delete a Users Cart   |

Example – Get a Cart

Request

GET http://localhost:2474/cart/USER#u1

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"count": 4,
	"items": [
		{
			"amount": 88,
			"pk": "USER#u1",
			"sk": "CART#p18"
		},
		{
			"amount": 2,
			"pk": "USER#u1",
			"sk": "CART#p2"
		},
		{
			"amount": 1,
			"pk": "USER#u1",
			"sk": "CART#p20"
		},
		{
			"amount": 1,
			"pk": "USER#u1",
			"sk": "CART#p5"
		}
	]
}
```

Example – Delete a Item in Cart

Request 

DELETE http://localhost:2474/cart/USER#u1/CART#p18

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"message": "Product removed"
	"Item": {
			"amount": 88,
			"pk": "USER#u1",
			"sk": "CART#p18"
		}
```

Example – Delete a Users Cart

Request 

DELETE http://localhost:2474/cart/USER#u1/

Calling this resource will respond with the following object:

```json
{
	"success": true,
	"message": "Total cart removed"
	"Item":
			"pk": "USER#u1",
			"sk": "CART#p18"
			"amount": 88,
		},
		{
			"amount": 2,
			"pk": "USER#u1",
			"sk": "CART#p2"
		},
		{
			"amount": 1,
			"pk": "USER#u1",
			"sk": "CART#p20"
		},
		{
			"amount": 1,
			"pk": "USER#u1",
			"sk": "CART#p5"
		}
```


Example – POST a Cart

Request 

POST http://localhost:2474/products/USER#u1

Calling this resource with a correct body example example of body:

```json
{
			"amount": 1,
			"productId": pp5
			"pk": "USER#u1",
			"sk": "CART#p5"
		}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "Product amount updated in cart.",
	"item": {
			"amount": 2,
			"pk": "USER#u1",
			"sk": "CART#p2"
		}
}
```

Example – PUT a Item in Cart

Request 

PUT http://localhost:2474/cart/USER#u1/CART#p2

Calling this resource with a correct body example example of body:

```json
{
	"amount": 1
}
````

will respond with the following object:

```json
{
	"success": true,
	"message": "Cart item updated",
	"item": {
			"amount": 1,
			"pk": "USER#u1",
			"sk": "CART#p2"
		}
}
```




## Resources

Express.js – REST API framework

AWS SDK – AWS service integration

DynamoDB – NoSQL data storage

Zod – Schema validation


## Authors

Developed by 
 GitHub: [NinjaNean ](https://github.com/NinjaNean), [AkeVonWolfe](https://github.com/AkeVonWolfe), [Sally](https://github.com/slindgr7), [Mikaela](https://github.com/Mickan10)
