import express from "express";
import { Router } from "express";
import * as account from "../controllers/accounts.js";  // Note: ensure this file has .js extension
import { body } from "express-validator";

const router = Router();

router.post("/accounts/add-account", 
    body("username").not().isEmpty().escape(),
    body("password").not().isEmpty().escape(),
    account.addAccount
);
router.post("/accounts/auth", 
    body("username").not().isEmpty().escape(),
    body("password").not().isEmpty().escape(),
    account.authentication
);
router.post("/accounts/logout", account.logout);
router.post("/accounts/decode-token", account.decode_token);
router.get("/accounts/get-account", account.getAccount);

export default router;