from pymongo import MongoClient

# Kết nối tới MongoDB local hoặc MongoDB Atlas
client = MongoClient("mongodb://localhost:27017") 
# Truy cập database và collection
db = client["Shopgaubong"]
products_collection = db["products"]
categories_collection = db["categories"]
subcategories_collection = db["subcategories"]
variants_collection = db["variants"]
