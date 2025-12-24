// Run this with: mongosh < create-mongodb-user.js

use admin

db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["root"]
})

print("✅ Admin user created successfully!")
print("Connection string: mongodb://admin:password@localhost:27017/meshes?authSource=admin")
