import express from "express"

const router = express.Router();

router.post("/accounts",)
router,get("/accounts",listaccounts)
router.get("accounts/:id",getaccount)
router.post("/accounts/transfer",transferfunds)


//INTERNAL ENDPOINTS FOR transfer service
//not proxied to outside worls by gateway

router.post("accounts/:id/adjust",adjustBalance)

export default router;