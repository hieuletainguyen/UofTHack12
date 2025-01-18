import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const salt_rounds = parseInt(process.env.SALT_ROUNDS);
const collection = process.env.MONGODB_COLLECTION;
const db_name = process.env.MONGODB_DB;
const jwt_secret = process.env.JWT_SECRET;

const addAccount = async (req, res) => {
    const { email, password, username, role } = req.body;

    await client.connect();
    const dbo = client.db(db_name);

    const query = { email: email };
    const result = await dbo.collection(collection).findOne(query);
    if (result) {
        res.status(400).json({message: "Email already exists"});
        return;
    }

    const new_salt = await bcrypt.genSalt(salt_rounds);
    const hashed_password = await bcrypt.hash(password, new_salt);

    const user = {
        email: email,
        password: hashed_password,
        username: username,
        role: role
    }
    const response = await dbo.collection(collection).insertOne(user);
    await client.close();
    if (!response) {
        return res.status(500).json({message: "Error creating account"});
    }
    return res.status(200).send({message: "success", response: response});
}

const authentication = async (req, res) => {
    const { email, password } = req.body;

    await client.connect();
    const dbo = client.db(db_name);

    const query = { email: email };
    const result = await dbo.collection(collection).findOne(query);
    if (!result) {
        return res.status(400).json({message: "Invalid email or password."});
    }

    const password_match = await bcrypt.compare(password, result.password);
    
    if (!password_match) {
        await client.close();
        return res.status(400).json({message: "Invalid password"});
    } else {
        const token = jwt.sign({id: result._id, username: result.username }, jwt_secret, { expiresIn: "1h" });
        await dbo.collection(collection).updateOne( { email: email }, { $set: { token: token } } ) 
        await client.close();
        return res.status(200).json({message: "success", token: token, username: result.username});
    }
    
}

const logout = (req, res) => {
    res.clearCookie("TOKENS");
    return res.status(200).json({message: "success"});
}

const decode_token = async (req, res) => {
    const token = req.cookies?.TOKENS;
    
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    
    const decoded = await _decode_token(token);

    if (decoded.message === "Token expired") {
        res.clearCookie("TOKENS");
        return res.status(401).json({ message: "Token expired" });
    }

    if (decoded.message === "Invalid token") {
        return res.status(401).json({ message: "Invalid token" });
    }

    return res.status(200).json({ message: "success", userId: decoded.userId });
}
    
    
const getAccount = async (req, res) => {
    const token = req.cookies?.TOKENS;

    if (!token) {
        return res.status(401).json({ message: "No authentication token found" });
    }

    try {
        const tokenData = await _decode_token(token);
        
        const params = {
            TableName: "Account",
            Key: {
                id: { S: tokenData.userId }
            }
        };
        console.log(params);
        dynamoDB.getItem(params, (err, data) => {
            if (err) {
                return res.json({ message: err });
            }
            if (data.Item && data.Item.password) {
                delete data.Item.password;
            }
            if (data.Item) {
                data.Item = cleanUpResponseData(data.Item);
            }
            return res.status(200).json({ message: "success", data: data.Item });
        });
    } catch (error) {
        return res.status(401).json({ message: error.message || "Error processing request" });
    }
}


export {
    addAccount, 
    authentication, 
    logout, 
    decode_token, 
    getAccount
}
