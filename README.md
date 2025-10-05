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
| `POST`   | `/users`     | Create a new user |
| `PUT`    | `/users/:id` | Update a user     |
| `DELETE` | `/users/:id` | Delete a user     |

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

http://localhost:2474/users/USER#u3

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

http://localhost:2474/users/USER#u3

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

http://localhost:2474/users/USER#u3

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



## Resources

Express.js – REST API framework

AWS SDK – AWS service integration

DynamoDB – NoSQL data storage

Zod – Schema validation


## Authors

Developed by 
 GitHub: [NinjaNean ](https://github.com/NinjaNean), [AkeVonWolfe](https://github.com/AkeVonWolfe), [Sally](https://github.com/slindgr7), [Mikaela](https://github.com/Mickan10)
