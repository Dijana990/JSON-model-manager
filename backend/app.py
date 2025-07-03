from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)


app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "tajna") 

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

#-----------USER MODEL --------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

class UserRole(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    role = db.Column(db.String(50), nullable=False)

#------------REGISTRATION ------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data["email"]
    username = data["username"]
    password = data["password"]

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User already exsists"}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(username=username, email=email, password_hash=password_hash)
    db.session.add(new_user)
    db.session.commit()

    user_role = UserRole(user_id=new_user.id, role="viewer")
    db.session.add(user_role)
    db.session.commit()

    return jsonify({"message": "Successful registration"}), 201

#-------------LOGIN ----------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data["email"]
    password = data["password"]

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password_hash, password):
        role = UserRole.query.filter_by(user_id=user.id).first()
        access_token = create_access_token(identity={"email": user.email, "role": role.role})
        return jsonify({"access_token": access_token, "user": {"email": user.email, "role": role.role}})
    return jsonify({"message": "Invalid data"}), 401

@app.route("/me", methods=["GET"])
@jwt_required()
def me():
    current_user = get_jwt_identity()
    return jsonify(current_user), 200

if __name__ == "__main__":
    app.run(debug=True)

